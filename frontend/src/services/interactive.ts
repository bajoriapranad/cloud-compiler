import type { Language, ExecutionStatus, OptimizationLevel } from '../types';

export interface InteractiveSessionOptions {
  language: Language;
  code: string;
  stdin?: string;
  timeLimit?: number;
  memoryLimit?: number;
  optimization?: OptimizationLevel;
}

export interface InteractiveCallbacks {
  onStatus?: (status: string) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onCompileSuccess?: (compileTime: number) => void;
  onExit?: (result: {
    status: ExecutionStatus;
    exitCode: number;
    compileTime?: number;
    executionTime: number;
    submissionId?: string;
  }) => void;
  onError?: (err: string) => void;
}

export interface InteractiveSessionHandle {
  sendStdin: (text: string) => void;
  kill: () => void;
}

export function startInteractiveSession(
  options: InteractiveSessionOptions,
  callbacks: InteractiveCallbacks
): InteractiveSessionHandle {
  const isHttps = window.location.protocol === 'https:';
  const wsProtocol = isHttps ? 'wss:' : 'ws:';
  const host = window.location.port === '5173' ? `${window.location.hostname}:5000` : window.location.host;
  const wsUrl = `${wsProtocol}//${host}/ws/execute`;

  let ws: WebSocket | null = null;
  let isClosed = false;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'start',
            payload: options,
          })
        );
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'status':
            callbacks.onStatus?.(msg.status);
            break;
          case 'compile_success':
            callbacks.onCompileSuccess?.(msg.compileTime);
            break;
          case 'stdout':
            callbacks.onStdout?.(msg.data);
            break;
          case 'stderr':
            callbacks.onStderr?.(msg.data);
            break;
          case 'exit':
            callbacks.onExit?.({
              status: msg.status,
              exitCode: msg.exitCode,
              compileTime: msg.compileTime,
              executionTime: msg.executionTime,
              submissionId: msg.submissionId,
            });
            break;
          case 'error':
            callbacks.onError?.(msg.message);
            break;
        }
      } catch (parseErr) {
        console.error('Failed to parse WebSocket message', parseErr);
      }
    };

    ws.onerror = (_err) => {
      if (!isClosed) {
        callbacks.onError?.('Failed to connect to interactive execution server');
      }
    };

    ws.onclose = () => {
      isClosed = true;
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError?.(msg);
  }

  return {
    sendStdin: (text: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stdin', data: text }));
      }
    },
    kill: () => {
      isClosed = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'kill' }));
        ws.close();
      }
    },
  };
}
