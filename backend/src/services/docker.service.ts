import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { RawExecutionOutput, CommandExecutionOptions } from '../types/execution.types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export class DockerService {
  private dockerAvailable: boolean | null = null;
  private dockerVersionInfo: string = '';

  public async checkDockerAvailability(): Promise<{ available: boolean; info?: string; error?: string }> {
    try {
      const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
        timeout: 3000,
      });
      this.dockerAvailable = true;
      this.dockerVersionInfo = stdout.trim();
      return { available: true, info: `Docker Engine v${this.dockerVersionInfo}` };
    } catch (err: unknown) {
      this.dockerAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      return { available: false, error: msg };
    }
  }

  public isAvailable(): boolean {
    return this.dockerAvailable === true;
  }

  public formatDockerMountPath(hostPath: string): string {
    const resolved = path.resolve(hostPath);
    return resolved.replace(/\\/g, '/');
  }

  public async runInContainer(
    workspacePath: string,
    command: string[],
    options: CommandExecutionOptions
  ): Promise<RawExecutionOutput> {
    const { timeoutMs, maxOutputSize = config.MAX_OUTPUT_SIZE, stdinFile, memoryLimit } = options;
    const containerName = `cc-sandbox-${path.basename(workspacePath)}-${Date.now()}`;
    const formattedWorkspacePath = this.formatDockerMountPath(workspacePath);
    const effectiveMemory = memoryLimit || config.MEMORY_LIMIT;

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
      '-v', `${formattedWorkspacePath}:/workspace:rw`,
      '-w', '/workspace',
      config.DOCKER_IMAGE,
      ...command,
    ];

    const startTime = Date.now();

    return new Promise<RawExecutionOutput>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputLimitExceeded = false;
      let isSettled = false;

      const child = spawn('docker', dockerArgs, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (stdinFile && fs.existsSync(stdinFile)) {
        try {
          const stdinStream = fs.createReadStream(stdinFile);
          stdinStream.pipe(child.stdin);
        } catch (err) {
          logger.warn('Failed to pipe stdin to docker process', { error: String(err) });
        }
      } else {
        child.stdin.end();
      }

      const timer = setTimeout(async () => {
        timedOut = true;
        logger.warn(`Execution timed out after ${timeoutMs}ms. Terminating container ${containerName}`);
        try {
        execFile('docker', ['kill', containerName], () => {});
      } catch {
      }
        try {
          child.kill('SIGKILL');
        } catch {
        }
      }, timeoutMs);

      child.stdout.on('data', (data: Buffer) => {
        if (stdout.length + data.length > maxOutputSize) {
          outputLimitExceeded = true;
          stdout += data.subarray(0, Math.max(0, maxOutputSize - stdout.length)).toString('utf8');
          
          try {
            execFile('docker', ['kill', containerName], () => {});
            child.kill('SIGKILL');
          } catch {
            // Ignore
          }
        } else {
          stdout += data.toString('utf8');
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        if (stderr.length + data.length > maxOutputSize) {
          outputLimitExceeded = true;
          stderr += data.subarray(0, Math.max(0, maxOutputSize - stderr.length)).toString('utf8');
        } else {
          stderr += data.toString('utf8');
        }
      });

      const finish = (exitCode: number) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);

        const executionTimeMs = Date.now() - startTime;
        const oomKilled = exitCode === 137 && !timedOut;

        resolve({
          stdout,
          stderr,
          exitCode,
          timedOut,
          outputLimitExceeded,
          executionTimeMs,
          oomKilled,
        });
      };

      child.on('error', (err) => {
        logger.error('Failed to spawn docker process', err);
        if (!isSettled) {
          finish(1);
        }
      });

      child.on('close', (code) => {
        finish(code ?? 0);
      });
    });
  }
}

export const dockerService = new DockerService();
