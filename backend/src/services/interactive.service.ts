import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { dockerService } from './docker.service.js';
import { dbService } from './db.service.js';
import { SupportedLanguage, OptimizationLevel } from '../types/execution.types.js';

interface StartPayload {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  timeLimit?: number;
  memoryLimit?: number;
  optimization?: OptimizationLevel;
}

export function setupInteractiveWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/execute' });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('Interactive WebSocket client connected');

    let childProcess: ReturnType<typeof spawn> | null = null;
    let containerName: string | null = null;
    let workspacePath: string | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let isTerminated = false;

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }

      if (containerName) {
        try {
          execFile('docker', ['kill', containerName], () => {});
        } catch {
        }
        containerName = null;
      }

      if (childProcess) {
        try {
          childProcess.kill('SIGKILL');
        } catch {
        }
        childProcess = null;
      }

      if (workspacePath && fs.existsSync(workspacePath)) {
        try {
          fs.rmSync(workspacePath, { recursive: true, force: true });
        } catch (err) {
          logger.warn('Failed to clean up interactive workspace', { error: String(err) });
        }
        workspacePath = null;
      }
    };

    ws.on('message', async (message: Buffer | string) => {
      try {
        const msg = JSON.parse(message.toString());

        if (msg.type === 'stdin') {
          if (childProcess && childProcess.stdin && childProcess.stdin.writable) {
            const dataToWrite = String(msg.data);
            childProcess.stdin.write(dataToWrite);
          }
          return;
        }

        if (msg.type === 'kill') {
          isTerminated = true;
          cleanup();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', status: 'TIME_LIMIT_EXCEEDED', exitCode: 137 }));
          }
          return;
        }

        if (msg.type === 'start') {
          const payload: StartPayload = msg.payload;
          const { language, code, timeLimit, memoryLimit, optimization = 'O2' } = payload;

          if (!code || !language) {
            ws.send(JSON.stringify({ type: 'error', message: 'Language and code are required' }));
            return;
          }

          const executionId = `exec-${uuidv4()}`;
          workspacePath = path.resolve(config.WORKSPACE_BASE_DIR, executionId);
          fs.mkdirSync(workspacePath, { recursive: true });

          let sourceFileName = 'source.txt';
          switch (language) {
            case 'c': sourceFileName = 'main.c'; break;
            case 'cpp': sourceFileName = 'main.cpp'; break;
            case 'python': sourceFileName = 'main.py'; break;
            case 'java': sourceFileName = 'Main.java'; break;
            case 'javascript': sourceFileName = 'main.js'; break;
          }

          fs.writeFileSync(path.join(workspacePath, sourceFileName), code, 'utf8');

          let compileTime = 0;

          if (language === 'c' || language === 'cpp' || language === 'java') {
            ws.send(JSON.stringify({ type: 'status', status: 'COMPILING' }));
            const compileStart = Date.now();

            let compileCmd: string[] = [];
            if (language === 'c') {
              compileCmd = ['gcc', `-${optimization}`, sourceFileName, '-o', 'main', '-lm'];
            } else if (language === 'cpp') {
              compileCmd = ['g++', `-${optimization}`, sourceFileName, '-o', 'main', '-lm'];
            } else if (language === 'java') {
              compileCmd = ['javac', sourceFileName];
            }

            const compileResult = await dockerService.runInContainer(workspacePath, compileCmd, {
              timeoutMs: config.COMPILE_TIMEOUT_MS,
            });

            compileTime = Date.now() - compileStart;

            if (compileResult.exitCode !== 0 || compileResult.timedOut) {
              const errOutput = compileResult.timedOut
                ? 'Compilation timed out'
                : compileResult.stderr || compileResult.stdout || 'Compilation failed';

              ws.send(JSON.stringify({ type: 'stderr', data: errOutput }));
              ws.send(JSON.stringify({
                type: 'exit',
                status: compileResult.timedOut ? 'COMPILE_TIMEOUT' : 'COMPILATION_ERROR',
                exitCode: compileResult.exitCode || 1,
                compileTime,
                executionTime: 0,
              }));

              cleanup();
              return;
            }

            ws.send(JSON.stringify({ type: 'compile_success', compileTime }));
          }

          let runCmd: string[] = [];
          switch (language) {
            case 'c':
            case 'cpp':
              runCmd = ['stdbuf', '-o0', '-e0', './main'];
              break;
            case 'python':
              runCmd = ['python3', '-u', sourceFileName];
              break;
            case 'java':
              runCmd = ['java', 'Main'];
              break;
            case 'javascript':
              runCmd = ['node', sourceFileName];
              break;
          }

          containerName = `cc-interactive-${path.basename(workspacePath)}-${Date.now()}`;
          const formattedWorkspace = dockerService.formatDockerMountPath(workspacePath);
          const effectiveMemory = memoryLimit ? `${memoryLimit}m` : config.MEMORY_LIMIT;

          const dockerArgs: string[] = [
            'run',
            '-i',
            '--name', containerName,
            '--rm',
            '--network=none',
            `--memory=${effectiveMemory}`,
            `--memory-swap=${effectiveMemory}`,
            `--cpus=${config.CPU_LIMIT}`,
            `--pids-limit=${config.PIDS_LIMIT}`,
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            '--read-only',
            '-u', '1000:1000',
            '--tmpfs', '/tmp:rw,size=16m,noexec',
            '-v', `${formattedWorkspace}:/workspace:rw`,
            '-w', '/workspace',
            config.DOCKER_IMAGE,
            ...runCmd,
          ];

          ws.send(JSON.stringify({ type: 'status', status: 'RUNNING' }));
          const startTime = Date.now();
          let fullStdout = '';
          let fullStderr = '';

          childProcess = spawn('docker', dockerArgs, {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          if (payload.stdin && payload.stdin.trim().length > 0 && childProcess.stdin) {
            const formattedStdin = payload.stdin.endsWith('\n') ? payload.stdin : `${payload.stdin}\n`;
            childProcess.stdin.write(formattedStdin);
          }

          const timeoutSeconds = timeLimit ? Math.max(timeLimit, 30) : 60;
          timeoutTimer = setTimeout(() => {
            if (!isTerminated && ws.readyState === WebSocket.OPEN) {
              isTerminated = true;
              ws.send(JSON.stringify({
                type: 'stderr',
                data: `\n[Execution Timeout: No input received or program ran longer than ${timeoutSeconds}s]\n`,
              }));
              ws.send(JSON.stringify({
                type: 'exit',
                status: 'TIME_LIMIT_EXCEEDED',
                exitCode: 137,
                compileTime,
                executionTime: Date.now() - startTime,
              }));
              cleanup();
            }
          }, timeoutSeconds * 1000);

          if (childProcess.stdout) {
            childProcess.stdout.on('data', (data: Buffer) => {
              const chunk = data.toString('utf8');
              fullStdout += chunk;
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'stdout', data: chunk }));
              }
            });
          }

          if (childProcess.stderr) {
            childProcess.stderr.on('data', (data: Buffer) => {
              const chunk = data.toString('utf8');
              fullStderr += chunk;
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'stderr', data: chunk }));
              }
            });
          }

          childProcess.on('close', (code: number | null) => {
            if (isTerminated) return;
            const executionTime = Date.now() - startTime;
            const exitCode = code !== null ? code : 0;
            const status = exitCode === 0 ? 'SUCCESS' : 'RUNTIME_ERROR';

            let submissionId: string | undefined;
            try {
              const record = dbService.saveSubmission({
                language,
                code: payload.code,
                stdin: payload.stdin || '',
                stdout: fullStdout,
                stderr: fullStderr,
                status,
                compileTime: compileTime || undefined,
                executionTime,
                exitCode: exitCode !== null ? exitCode : undefined,
              });
              if (record) {
                submissionId = record.id;
              }
            } catch (dbErr) {
              logger.warn('Failed to save interactive submission to SQLite', { error: String(dbErr) });
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'exit',
                status,
                exitCode,
                compileTime,
                executionTime,
                submissionId,
              }));
            }

            cleanup();
          });

          childProcess.on('error', (err: Error) => {
            if (isTerminated) return;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'stderr',
                data: `\n[Process error: ${err.message}]\n`,
              }));
              ws.send(JSON.stringify({
                type: 'exit',
                status: 'DOCKER_ERROR',
                exitCode: 1,
                compileTime,
                executionTime: Date.now() - startTime,
              }));
            }
            cleanup();
          });
        }
      } catch (err: unknown) {
        logger.error('Error in interactive WebSocket handler', { error: String(err) });
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: 'Internal execution error' }));
        }
        cleanup();
      }
    });

    ws.on('close', () => {
      logger.info('Interactive WebSocket client disconnected');
      cleanup();
    });

    ws.on('error', (err) => {
      logger.warn('Interactive WebSocket error', { error: String(err) });
      cleanup();
    });
  });

  logger.info('🔌 Interactive WebSocket Server registered on /ws/execute');
}
