import { BaseExecutor } from './base.executor.js';
import { ExecutionResult, WorkspaceMetadata } from '../types/execution.types.js';
import { config } from '../utils/config.js';

export class JavaExecutor extends BaseExecutor {
  public async execute(workspace: WorkspaceMetadata): Promise<ExecutionResult> {
    const { workspacePath, sourceFileName, stdinFilePath } = workspace;

    const compileOutput = await this.runCommand(
      workspacePath,
      ['javac', sourceFileName],
      config.COMPILE_TIMEOUT_MS
    );

    if (compileOutput.exitCode !== 0 || compileOutput.timedOut) {
      const result = this.parseExecutionResult(compileOutput, true);
      result.compileTime = compileOutput.executionTimeMs;
      return result;
    }

    const runOutput = await this.runCommand(
      workspacePath,
      ['sh', '-c', 'java -Xmx64m -XX:+UseSerialGC Main < input.txt'],
      config.EXECUTION_TIMEOUT_MS,
      stdinFilePath
    );

    const result = this.parseExecutionResult(runOutput, false);
    result.compileTime = compileOutput.executionTimeMs;
    result.executionTime = runOutput.executionTimeMs;
    return result;
  }
}
