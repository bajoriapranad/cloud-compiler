import { BaseExecutor } from './base.executor.js';
import { ExecutionResult, WorkspaceMetadata } from '../types/execution.types.js';
import { config } from '../utils/config.js';

export class PythonExecutor extends BaseExecutor {
  public async execute(workspace: WorkspaceMetadata): Promise<ExecutionResult> {
    const { workspacePath, sourceFileName, stdinFilePath } = workspace;

    const runOutput = await this.runCommand(
      workspacePath,
      ['sh', '-c', `python3 -u ${sourceFileName} < input.txt`],
      config.EXECUTION_TIMEOUT_MS,
      stdinFilePath
    );

    return this.parseExecutionResult(runOutput, false);
  }
}
