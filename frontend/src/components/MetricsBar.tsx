import React from 'react';
import type { ExecutionStatus } from '../types';
import { Clock, Activity, CheckCircle2, AlertTriangle, XCircle, Timer, ServerCrash, Cpu } from 'lucide-react';

interface MetricsBarProps {
  status: ExecutionStatus;
  compileTime?: number | null;
  executionTime?: number | null;
  memoryUsed?: number | null;
  exitCode?: number | null;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  status,
  compileTime,
  executionTime,
  exitCode,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <div className="status-badge badge-running">
            <span className="pulsing-spinner"></span>
            <span>Running Sandbox...</span>
          </div>
        );
      case 'SUCCESS':
        return (
          <div className="status-badge badge-success">
            <CheckCircle2 size={14} />
            <span>Execution Successful</span>
          </div>
        );
      case 'COMPILATION_ERROR':
        return (
          <div className="status-badge badge-error">
            <XCircle size={14} />
            <span>Compilation Error</span>
          </div>
        );
      case 'COMPILE_TIMEOUT':
        return (
          <div className="status-badge badge-warning">
            <Timer size={14} />
            <span>Compilation Timeout</span>
          </div>
        );
      case 'RUNTIME_ERROR':
        return (
          <div className="status-badge badge-error">
            <AlertTriangle size={14} />
            <span>Runtime Error</span>
          </div>
        );
      case 'TIME_LIMIT_EXCEEDED':
        return (
          <div className="status-badge badge-warning">
            <Timer size={14} />
            <span>Time Limit Exceeded</span>
          </div>
        );
      case 'MEMORY_LIMIT_EXCEEDED':
        return (
          <div className="status-badge badge-purple">
            <Activity size={14} />
            <span>Memory Limit Exceeded</span>
          </div>
        );
      case 'OUTPUT_LIMIT_EXCEEDED':
        return (
          <div className="status-badge badge-warning">
            <AlertTriangle size={14} />
            <span>Output Limit Exceeded</span>
          </div>
        );
      case 'VALIDATION_ERROR':
        return (
          <div className="status-badge badge-error">
            <XCircle size={14} />
            <span>Validation Error</span>
          </div>
        );
      case 'DOCKER_ERROR':
        return (
          <div className="status-badge badge-error">
            <ServerCrash size={14} />
            <span>Internal / Docker Error</span>
          </div>
        );
      case 'IDLE':
      default:
        return (
          <div className="status-badge badge-idle">
            <span>Ready</span>
          </div>
        );
    }
  };

  const formatSeconds = (ms: number) => {
    return `${(ms / 1000).toFixed(3)}s`;
  };

  return (
    <div className="metrics-bar" id="metrics-bar">
      <div className="metric-group">
        <span className="metric-label">Status:</span>
        {getStatusBadge()}
      </div>

      {compileTime !== null && compileTime !== undefined && compileTime > 0 ? (
        <div className="metric-group">
          <span className="metric-label">Compile Time:</span>
          <div className="metric-value">
            <Cpu size={14} className="metric-icon" />
            <span>{formatSeconds(compileTime)} ({compileTime} ms)</span>
          </div>
        </div>
      ) : null}

      <div className="metric-group">
        <span className="metric-label">Execution Time:</span>
        <div className="metric-value">
          <Clock size={14} className="metric-icon" />
          <span>
            {executionTime !== null && executionTime !== undefined
              ? `${formatSeconds(executionTime)} (${executionTime} ms)`
              : '--'}
          </span>
        </div>
      </div>

      {exitCode !== undefined && exitCode !== null ? (
        <div className="metric-group">
          <span className="metric-label">Exit Code:</span>
          <span className={`exit-code-pill ${exitCode === 0 ? 'exit-ok' : 'exit-fail'}`}>
            {exitCode}
          </span>
        </div>
      ) : null}
    </div>
  );
};
