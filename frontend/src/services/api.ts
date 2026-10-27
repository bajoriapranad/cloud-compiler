import type {
  ExecutePayload,
  ExecutionResult,
  Language,
  TestCase,
  BatchExecutionResult,
  OptimizationResult,
  SubmissionSummary,
  SubmissionDetail,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface BackendHealthResponse {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  docker: {
    available: boolean;
    info: string | null;
    error: string | null;
    image: string;
  };
  supportedLanguages: string[];
}

/**
 * Probes the backend API health status
 */
export async function checkBackendHealth(): Promise<{ online: boolean; data?: BackendHealthResponse; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, data };
    }
    return { online: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { online: false, error: message };
  }
}

/**
 * Executes user code against the live backend API
 */
export async function executeCode(payload: ExecutePayload): Promise<ExecutionResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ExecutionResult;
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error or backend unreachable';
    return {
      status: 'DOCKER_ERROR',
      stdout: '',
      stderr: `[Backend Connection Error]: Failed to reach backend API at ${API_BASE_URL}/execute.\n\nDetails: ${message}\n\nTip: Make sure the backend is running with "npm run dev" in the backend directory.`,
      executionTime: 0,
      error: message,
    };
  }
}

/**
 * Batch execution against multiple test cases
 */
export async function executeBatch(
  language: Language,
  code: string,
  testCases: TestCase[]
): Promise<BatchExecutionResult> {
  const response = await fetch(`${API_BASE_URL}/execute/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, testCases }),
  });

  return response.json();
}

/**
 * Compiler Optimization Benchmark (-O0 to -Os)
 */
export async function getOptimizationBenchmarks(
  language: Language,
  code: string,
  stdin: string
): Promise<OptimizationResult> {
  const response = await fetch(`${API_BASE_URL}/execute/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, stdin }),
  });

  return response.json();
}

/**
 * Fetches submission history from SQLite
 */
export async function getSubmissions(): Promise<SubmissionSummary[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.submissions || [];
  } catch {
    return [];
  }
}

/**
 * Fetches full submission by ID
 */
export async function getSubmissionById(id: string): Promise<SubmissionDetail | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/history/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.submission || null;
  } catch {
    return null;
  }
}

/**
 * Permanently deletes all submissions from the database
 */
export async function clearSubmissions(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.success ?? true;
  } catch {
    return false;
  }
}
