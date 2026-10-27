import { ExecutionResult, WorkspaceMetadata, RawExecutionOutput } from '../types/execution.types.js';
import { dockerService } from '../services/docker.service.js';
import { config } from '../utils/config.js';

export abstract class BaseExecutor {
  abstract execute(workspace: WorkspaceMetadata): Promise<ExecutionResult>;

  protected async runCommand(
    workspacePath: string,
    command: string[],
    timeoutMs: number,
    stdinFile?: string
  ): Promise<RawExecutionOutput> {
    return dockerService.runInContainer(workspacePath, command, {
      timeoutMs,
      maxOutputSize: config.MAX_OUTPUT_SIZE,
      stdinFile,
    });
  }

  protected parseExecutionResult(output: RawExecutionOutput, isCompileStep = false): ExecutionResult {
    const { stdout, stderr, exitCode, timedOut, outputLimitExceeded, executionTimeMs, oomKilled } = output;

    if (timedOut) {
      return {
        status: isCompileStep ? 'COMPILE_TIMEOUT' : 'TIME_LIMIT_EXCEEDED',
        stdout,
        stderr: isCompileStep
          ? `[Compile Error]: Compilation timed out after ${config.COMPILE_TIMEOUT_MS}ms`
          : `[Execution Error]: Time limit exceeded (${config.EXECUTION_TIMEOUT_MS}ms)`,
        executionTime: executionTimeMs,
        exitCode,
      };
    }

    if (outputLimitExceeded) {
      return {
        status: 'OUTPUT_LIMIT_EXCEEDED',
        stdout,
        stderr: `[Execution Error]: Maximum output size limit exceeded (${config.MAX_OUTPUT_SIZE / 1024} KB). Execution terminated.`,
        executionTime: executionTimeMs,
        exitCode,
      };
    }

    if (oomKilled) {
      return {
        status: 'MEMORY_LIMIT_EXCEEDED',
        stdout,
        stderr: `[Execution Error]: Process exceeded memory limit (${config.MEMORY_LIMIT}) and was killed by OOM killer.`,
        executionTime: executionTimeMs,
        exitCode,
      };
    }

    if (exitCode !== 0) {
      let signalDesc = '';
      if (!isCompileStep) {
        if (exitCode === 136) signalDesc = 'Floating point exception (SIGFPE) — e.g. division by zero';
        else if (exitCode === 139) signalDesc = 'Segmentation fault (SIGSEGV) — invalid memory access or null pointer dereference';
        else if (exitCode === 134) signalDesc = 'Aborted (SIGABRT) — assertion failure or abort() called';
        else if (exitCode === 137) signalDesc = 'Killed (SIGKILL) — process exceeded memory limit or was terminated by OS';
        else if (exitCode === 143) signalDesc = 'Terminated (SIGTERM)';
      }

      let formattedStderr = stderr.trim();
      if (signalDesc) {
        formattedStderr = formattedStderr
          ? `[Runtime Error]: ${signalDesc}\n\n${formattedStderr}`
          : `[Runtime Error]: ${signalDesc} (Exit Code: ${exitCode})`;
      } else if (!formattedStderr) {
        formattedStderr = `Process exited with non-zero exit code: ${exitCode}`;
      }

      return {
        status: isCompileStep ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
        stdout,
        stderr: formattedStderr,
        executionTime: executionTimeMs,
        exitCode,
      };
    }

    return {
      status: 'SUCCESS',
      stdout,
      stderr,
      executionTime: executionTimeMs,
      exitCode: 0,
    };
  }
}
