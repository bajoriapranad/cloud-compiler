import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import {
  ExecutePayload,
  ExecutionResult,
  BatchExecutePayload,
  BatchExecutionResult,
  BatchTestCaseResult,
  OptimizationResult,
  OptimizationBenchmark,
} from '../types/execution.types.js';
import { workspaceService } from '../services/workspace.service.js';
import { dockerService } from '../services/docker.service.js';
import { executorRegistry } from '../executors/executor.registry.js';
import { dbService } from '../services/db.service.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class ExecuteController {
  public handleExecute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { language, code, stdin } = req.body as ExecutePayload;
    let workspacePath = '';

    try {
      const dockerStatus = await dockerService.checkDockerAvailability();
      if (!dockerStatus.available) {
        logger.warn('Execution aborted: Docker daemon is unavailable', { error: dockerStatus.error });
        const result: ExecutionResult = {
          status: 'DOCKER_ERROR',
          stdout: '',
          stderr: `[Docker Engine Error]: Docker daemon is not running or unreachable.\n\nDetails: ${dockerStatus.error || 'Docker socket connection failed'}\n\nPlease ensure Docker Desktop or the Docker daemon is started to execute code in the live sandbox.`,
          executionTime: 0,
          error: 'Docker daemon unreachable',
        };
        res.status(503).json(result);
        return;
      }

      const executor = executorRegistry.getExecutor(language);
      if (!executor) {
        res.status(400).json({
          status: 'VALIDATION_ERROR',
          stdout: '',
          stderr: `Unsupported language: ${language}`,
          executionTime: 0,
          error: 'Unknown language',
        });
        return;
      }

      const workspace = await workspaceService.createWorkspace(language, code, stdin);
      workspacePath = workspace.workspacePath;

      logger.info(`Starting execution ${workspace.executionId}`, {
        language,
        codeLength: code.length,
        hasStdin: Boolean(stdin && stdin.length > 0),
      });

      const result = await executor.execute(workspace);

      const saved = dbService.saveSubmission({
        language,
        code,
        stdin,
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        compileTime: result.compileTime,
        executionTime: result.executionTime,
        exitCode: result.exitCode,
      });

      if (saved) {
        result.submissionId = saved.id;
      }

      logger.info(`Completed execution ${workspace.executionId}`, {
        status: result.status,
        executionTime: result.executionTime,
        exitCode: result.exitCode,
      });

      res.status(200).json(result);
    } catch (err) {
      logger.error('Unexpected error in handleExecute', err);
      next(err);
    } finally {
      if (workspacePath) {
        await workspaceService.cleanupWorkspace(workspacePath);
      }
    }
  };

  public handleBatchExecute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { language, code, testCases } = req.body as BatchExecutePayload;
    let workspacePath = '';

    try {
      const dockerStatus = await dockerService.checkDockerAvailability();
      if (!dockerStatus.available) {
        res.status(503).json({
          allPassed: false,
          totalPassed: 0,
          totalCases: testCases?.length || 0,
          results: [],
          error: 'Docker daemon is not running',
        });
        return;
      }

      const workspace = await workspaceService.createWorkspace(language, code, '');
      workspacePath = workspace.workspacePath;
      let compileTime = 0;
      if (language === 'c') {
        const compileOut = await dockerService.runInContainer(
          workspacePath,
          ['gcc', '-O2', workspace.sourceFileName, '-o', 'main', '-lm'],
          { timeoutMs: config.COMPILE_TIMEOUT_MS }
        );
        compileTime = compileOut.executionTimeMs;
        if (compileOut.exitCode !== 0 || compileOut.timedOut) {
          const results: BatchTestCaseResult[] = testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            passed: false,
            status: compileOut.timedOut ? 'COMPILE_TIMEOUT' : 'COMPILATION_ERROR',
            executionTime: 0,
            exitCode: compileOut.exitCode,
          }));
          res.status(200).json({
            allPassed: false,
            totalPassed: 0,
            totalCases: testCases.length,
            compileTime,
            results,
            error: compileOut.stderr || 'Compilation Failed',
          });
          return;
        }
      } else if (language === 'cpp') {
        const compileOut = await dockerService.runInContainer(
          workspacePath,
          ['g++', '-O2', '-std=c++17', workspace.sourceFileName, '-o', 'main'],
          { timeoutMs: config.COMPILE_TIMEOUT_MS }
        );
        compileTime = compileOut.executionTimeMs;
        if (compileOut.exitCode !== 0 || compileOut.timedOut) {
          const results: BatchTestCaseResult[] = testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            passed: false,
            status: compileOut.timedOut ? 'COMPILE_TIMEOUT' : 'COMPILATION_ERROR',
            executionTime: 0,
            exitCode: compileOut.exitCode,
          }));
          res.status(200).json({
            allPassed: false,
            totalPassed: 0,
            totalCases: testCases.length,
            compileTime,
            results,
            error: compileOut.stderr || 'Compilation Failed',
          });
          return;
        }
      } else if (language === 'java') {
        const compileOut = await dockerService.runInContainer(
          workspacePath,
          ['javac', workspace.sourceFileName],
          { timeoutMs: config.COMPILE_TIMEOUT_MS }
        );
        compileTime = compileOut.executionTimeMs;
        if (compileOut.exitCode !== 0 || compileOut.timedOut) {
          const results: BatchTestCaseResult[] = testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            passed: false,
            status: 'COMPILATION_ERROR',
            executionTime: 0,
            exitCode: compileOut.exitCode,
          }));
          res.status(200).json({
            allPassed: false,
            totalPassed: 0,
            totalCases: testCases.length,
            compileTime,
            results,
            error: compileOut.stderr,
          });
          return;
        }
      }

      const results: BatchTestCaseResult[] = [];
      let totalPassed = 0;

      for (const tc of testCases) {
        await fs.promises.writeFile(workspace.stdinFilePath, tc.input || '', 'utf8');

        let runCmd: string[] = [];
        if (language === 'c' || language === 'cpp') {
          runCmd = ['sh', '-c', './main < input.txt'];
        } else if (language === 'java') {
          runCmd = ['sh', '-c', 'java -Xmx64m Main < input.txt'];
        } else if (language === 'python') {
          runCmd = ['sh', '-c', 'python3 -u main.py < input.txt'];
        } else if (language === 'javascript') {
          runCmd = ['sh', '-c', 'node main.js < input.txt'];
        }

        const runOut = await dockerService.runInContainer(
          workspacePath,
          runCmd,
          { timeoutMs: config.EXECUTION_TIMEOUT_MS, stdinFile: workspace.stdinFilePath }
        );

        const actualTrimmed = runOut.stdout.trim();
        const expectedTrimmed = tc.expectedOutput.trim();
        const passed = runOut.exitCode === 0 && actualTrimmed === expectedTrimmed;

        if (passed) {
          totalPassed++;
        }

        results.push({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: runOut.stdout,
          passed,
          status: runOut.exitCode === 0 ? 'SUCCESS' : runOut.timedOut ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR',
          executionTime: runOut.executionTimeMs,
          exitCode: runOut.exitCode,
        });
      }

      const responsePayload: BatchExecutionResult = {
        allPassed: totalPassed === testCases.length,
        totalPassed,
        totalCases: testCases.length,
        compileTime,
        results,
      };

      dbService.saveSubmission({
        language,
        code,
        stdin: `[Batch: ${testCases.length} cases]`,
        stdout: `Passed ${totalPassed}/${testCases.length} cases`,
        stderr: '',
        status: responsePayload.allPassed ? 'SUCCESS' : 'RUNTIME_ERROR',
        compileTime,
        executionTime: results.reduce((acc, r) => acc + r.executionTime, 0),
        exitCode: responsePayload.allPassed ? 0 : 1,
      });

      res.status(200).json(responsePayload);
    } catch (err) {
      logger.error('Unexpected error in handleBatchExecute', err);
      next(err);
    } finally {
      if (workspacePath) {
        await workspaceService.cleanupWorkspace(workspacePath);
      }
    }
  };

  public handleOptimizeBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { language, code, stdin } = req.body as ExecutePayload;

    if (language !== 'c' && language !== 'cpp') {
      res.status(400).json({ error: 'Optimization comparison is only supported for C and C++' });
      return;
    }

    let workspacePath = '';

    try {
      const dockerStatus = await dockerService.checkDockerAvailability();
      if (!dockerStatus.available) {
        res.status(503).json({ error: 'Docker daemon is not running' });
        return;
      }

      const workspace = await workspaceService.createWorkspace(language, code, stdin || '');
      workspacePath = workspace.workspacePath;

      const levels = ['-O0', '-O1', '-O2', '-O3', '-Os'];
      const benchmarks: OptimizationBenchmark[] = [];

      for (const level of levels) {
        const binName = `prog_${level.replace('-', '')}`;
        const compileArgs =
          language === 'c'
            ? ['gcc', level, workspace.sourceFileName, '-o', binName, '-lm']
            : ['g++', level, '-std=c++17', workspace.sourceFileName, '-o', binName];

        const compileOut = await dockerService.runInContainer(
          workspacePath,
          compileArgs,
          { timeoutMs: config.COMPILE_TIMEOUT_MS }
        );

        if (compileOut.exitCode !== 0) {
          benchmarks.push({
            level,
            compileTime: compileOut.executionTimeMs,
            executionTime: 0,
            binarySize: 0,
            status: 'Compile Error',
          });
          continue;
        }

        let binarySize = 0;
        const binPath = path.join(workspacePath, binName);
        if (fs.existsSync(binPath)) {
          binarySize = fs.statSync(binPath).size;
        }

        const runOut = await dockerService.runInContainer(
          workspacePath,
          ['sh', '-c', `./${binName} < input.txt`],
          { timeoutMs: config.EXECUTION_TIMEOUT_MS, stdinFile: workspace.stdinFilePath }
        );

        benchmarks.push({
          level,
          compileTime: compileOut.executionTimeMs,
          executionTime: runOut.executionTimeMs,
          binarySize,
          status: runOut.exitCode === 0 ? 'Success' : 'Runtime Error',
        });
      }

      const result: OptimizationResult = {
        language,
        benchmarks,
      };

      res.status(200).json(result);
    } catch (err) {
      logger.error('Unexpected error in handleOptimizeBenchmark', err);
      next(err);
    } finally {
      if (workspacePath) {
        await workspaceService.cleanupWorkspace(workspacePath);
      }
    }
  };

  public handleGetHistory = async (_req: Request, res: Response): Promise<void> => {
    const submissions = dbService.getRecentSubmissions(50);
    res.status(200).json({ submissions });
  };

  public handleGetHistoryById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const submission = dbService.getSubmissionById(id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    res.status(200).json({ submission });
  };

  public handleClearHistory = async (_req: Request, res: Response): Promise<void> => {
    const success = dbService.clearHistory();
    res.status(200).json({ success });
  };

  public handleHealth = async (_req: Request, res: Response): Promise<void> => {
    const dockerStatus = await dockerService.checkDockerAvailability();
    const memUsage = process.memoryUsage();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      docker: {
        available: dockerStatus.available,
        info: dockerStatus.info || null,
        error: dockerStatus.error || null,
        image: config.DOCKER_IMAGE,
      },
      supportedLanguages: executorRegistry.getSupportedLanguages(),
      limits: {
        maxSourceSizeKb: config.MAX_SOURCE_SIZE / 1024,
        maxStdinSizeKb: config.MAX_STDIN_SIZE / 1024,
        compileTimeoutMs: config.COMPILE_TIMEOUT_MS,
        executionTimeoutMs: config.EXECUTION_TIMEOUT_MS,
      },
      system: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
    });
  };
}

export const executeController = new ExecuteController();
