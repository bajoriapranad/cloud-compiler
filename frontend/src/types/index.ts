export type Language = 'c' | 'cpp' | 'python' | 'java' | 'javascript';

export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3' | 'Os';

export type ExecutionStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'SUCCESS'
  | 'COMPILATION_ERROR'
  | 'COMPILE_TIMEOUT'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'DOCKER_ERROR';

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compileTime?: number | null;
  executionTime?: number | null;
  memoryUsed?: number | null;
  exitCode?: number | null;
  error?: string | null;
  submissionId?: string;
}

export interface LanguageConfig {
  id: Language;
  name: string;
  monacoLang: string;
  version: string;
  iconName: string;
  defaultCode: string;
  defaultStdin: string;
}

export interface ExecutePayload {
  language: Language;
  code: string;
  stdin: string;
  timeLimit?: number;
  memoryLimit?: number;
  optimization?: OptimizationLevel;
}

export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
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
  language: Language;
  benchmarks: OptimizationBenchmark[];
}

export interface SubmissionSummary {
  id: string;
  language: Language;
  stdin?: string;
  stdout: string;
  stderr: string;
  status: ExecutionStatus;
  compileTime?: number | null;
  executionTime: number;
  exitCode?: number | null;
  createdAt: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  code: string;
}
