import { SupportedLanguage } from '../types/execution.types.js';
import { BaseExecutor } from './base.executor.js';
import { CExecutor } from './c.executor.js';
import { CppExecutor } from './cpp.executor.js';
import { PythonExecutor } from './python.executor.js';
import { JavaExecutor } from './java.executor.js';
import { JavaScriptExecutor } from './javascript.executor.js';

export class ExecutorRegistry {
  private executors: Map<SupportedLanguage, BaseExecutor>;

  constructor() {
    this.executors = new Map<SupportedLanguage, BaseExecutor>([
      ['c', new CExecutor()],
      ['cpp', new CppExecutor()],
      ['python', new PythonExecutor()],
      ['java', new JavaExecutor()],
      ['javascript', new JavaScriptExecutor()],
    ]);
  }

  public getExecutor(language: SupportedLanguage): BaseExecutor | undefined {
    return this.executors.get(language);
  }

  public getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.executors.keys());
  }
}

export const executorRegistry = new ExecutorRegistry();
