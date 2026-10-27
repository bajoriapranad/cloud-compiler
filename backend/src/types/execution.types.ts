export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java' | 'javascript';

export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3' | 'Os';

export type ExecutionStatus =
  | 'SUCCESS'
  | 'COMPILATION_ERROR'
  | 'COMPILE_TIMEOUT'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'DOCKER_ERROR';

export interface ExecutePayload {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  timeLimit?: number;
  memoryLimit?: number;
  optimization?: OptimizationLevel;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compileTime?: number;
  executionTime: number;
  exitCode?: number;
  memoryUsed?: number;
  error?: string;
  submissionId?: string;
}

export interface WorkspaceMetadata {
  executionId: string;
  workspacePath: string;
  sourceFileName: string;
  sourceFilePath: string;
  stdinFilePath: string;
}

export interface CommandExecutionOptions {
  timeoutMs: number;
  maxOutputSize?: number;
  stdinFile?: string;
  memoryLimit?: string;
}

export interface RawExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  outputLimitExceeded: boolean;
  executionTimeMs: number;
  oomKilled?: boolean;
}

export interface TestCasePayload {
  id: number | string;
  input: string;
  expectedOutput: string;
}

export interface BatchExecutePayload {
  language: SupportedLanguage;
  code: string;
  testCases: TestCasePayload[];
  timeLimit?: number;
  memoryLimit?: number;
}

export interface BatchTestCaseResult {
  id: number | string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  status: ExecutionStatus;
  executionTime: number;
  exitCode?: number;
}

export interface BatchExecutionResult {
  allPassed: boolean;
  totalPassed: number;
  totalCases: number;
  compileTime?: number;
  results: BatchTestCaseResult[];
  error?: string;
}

export interface OptimizationBenchmark {
  level: string;
  compileTime: number;
  executionTime: number;
  binarySize: number;
  status: string;
}

export interface OptimizationResult {
  language: SupportedLanguage;
  benchmarks: OptimizationBenchmark[];
}
