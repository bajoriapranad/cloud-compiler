import { BaseExecutor } from './base.executor.js';
import { ExecutionResult, WorkspaceMetadata } from '../types/execution.types.js';
import { config } from '../utils/config.js';

export class CppExecutor extends BaseExecutor {
  public async execute(workspace: WorkspaceMetadata): Promise<ExecutionResult> {
    const { workspacePath, sourceFileName, stdinFilePath } = workspace;

    const compileOutput = await this.runCommand(
      workspacePath,
      ['g++', '-O2', '-std=c++17', sourceFileName, '-o', 'main'],
      config.COMPILE_TIMEOUT_MS
    );

    if (compileOutput.exitCode !== 0 || compileOutput.timedOut) {
      const result = this.parseExecutionResult(compileOutput, true);
      result.compileTime = compileOutput.executionTimeMs;
      return result;
    }

    const runOutput = await this.runCommand(
      workspacePath,
      ['sh', '-c', './main < input.txt'],
      config.EXECUTION_TIMEOUT_MS,
      stdinFilePath
    );

    const result = this.parseExecutionResult(runOutput, false);
    result.compileTime = compileOutput.executionTimeMs;
    result.executionTime = runOutput.executionTimeMs;
    return result;
  }
}
