import React, { useState, useRef, useEffect } from 'react';
import type { ExecutionStatus } from '../types';
import {
  Terminal as TerminalIcon,
  Copy,
  Check,
  Trash2,
  Loader2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Square,
} from 'lucide-react';

interface ProgramizOutputPanelProps {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compileTime: number | null;
  executionTime: number | null;
  exitCode: number | null;
  isLoading: boolean;
  onClear: () => void;
  stdin: string;
  onStdinChange: (val: string) => void;
  onSendStdin?: (input: string) => void;
  onStop?: () => void;
}

export const ProgramizOutputPanel: React.FC<ProgramizOutputPanelProps> = ({
  status,
  stdout,
  stderr,
  compileTime,
  executionTime,
  exitCode,
  isLoading,
  onClear,
  stdin,
  onStdinChange,
  onSendStdin,
  onStop,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(Boolean(stdin && stdin.trim().length > 0));
  const [liveInput, setLiveInput] = useState<string>('');

  const liveInputRef = useRef<HTMLInputElement>(null);
  const outputBodyRef = useRef<HTMLDivElement>(null);

  const hasStdout = Boolean(stdout && stdout.length > 0);
  const hasStderr = Boolean(stderr && stderr.trim().length > 0);
  const hasOutput = hasStdout || hasStderr;

  useEffect(() => {
    if (isLoading) {
      liveInputRef.current?.focus();
    }
  }, [isLoading, stdout]);

  useEffect(() => {
    if (outputBodyRef.current) {
      outputBodyRef.current.scrollTop = outputBodyRef.current.scrollHeight;
    }
  }, [stdout, stderr, isLoading]);

  const handleCopy = () => {
    const textToCopy = [stdout, stderr].filter(Boolean).join('\n');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLiveKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const valueToSend = liveInput + '\n';
      if (onSendStdin) {
        onSendStdin(valueToSend);
      }
      setLiveInput('');
    }
  };

  return (
    <div className="programiz-output-container" id="programiz-output-panel">
      <div className="programiz-output-header">
        <div className="output-header-left">
          <TerminalIcon size={14} className="text-accent" />
          <span className="output-header-title">Output</span>

          {isLoading ? (
            <span className="programiz-status-badge badge-loading">
              <Loader2 size={11} className="spin-icon" />
              <span>Running...</span>
            </span>
          ) : status === 'SUCCESS' ? (
            <span className="programiz-status-badge badge-success" title={`Exit code: ${exitCode ?? 0}`}>
              <CheckCircle2 size={11} />
              <span>{executionTime ? `${executionTime}ms` : 'Finished'}</span>
            </span>
          ) : status !== 'IDLE' ? (
            <span className="programiz-status-badge badge-error">
              <AlertTriangle size={11} />
              <span>{status.replace(/_/g, ' ')}</span>
            </span>
          ) : null}
        </div>

        <div className="output-header-actions">
          {isLoading && onStop && (
            <button
              type="button"
              className="action-link-btn text-red"
              onClick={onStop}
              id="stop-execution-btn"
              title="Stop running program"
            >
              <Square size={12} fill="currentColor" />
              <span>Stop</span>
            </button>
          )}

          <button
            type="button"
            className={`programiz-input-toggle ${showCustomInput ? 'toggle-active' : ''}`}
            onClick={() => setShowCustomInput(!showCustomInput)}
            id="toggle-custom-input-btn"
            title="Provide pre-set standard input (stdin)"
          >
            <Sliders size={12} />
            <span>Pre-set Input</span>
          </button>

          {hasOutput && (
            <button
              type="button"
              className="action-link-btn"
              onClick={handleCopy}
              id="copy-programiz-output-btn"
              title="Copy output to clipboard"
            >
              {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {hasOutput && (
            <button
              type="button"
              className="action-link-btn"
              onClick={onClear}
              id="clear-programiz-output-btn"
              title="Clear output console"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {showCustomInput && (
        <div className="programiz-custom-input-box" id="programiz-custom-input">
          <div className="custom-input-label-row">
            <span className="custom-input-label">Pre-set Standard Input (stdin):</span>
            {stdin && (
              <button
                type="button"
                className="clear-stdin-link"
                onClick={() => onStdinChange('')}
              >
                Clear input
              </button>
            )}
          </div>
          <textarea
            className="programiz-input-textarea"
            value={stdin}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder="Pre-enter input values if you don't want to type them interactively..."
            rows={2}
            disabled={isLoading}
            spellCheck={false}
          />
        </div>
      )}

      <div
        className="programiz-output-body"
        id="programiz-output-screen"
        ref={outputBodyRef}
        onClick={() => liveInputRef.current?.focus()}
      >
        {isLoading && !hasStdout && !hasStderr ? (
          <div className="programiz-loading-view">
            <Loader2 size={24} className="spin-icon text-accent" />
            <p className="loading-msg">Compiling and running...</p>
          </div>
        ) : !hasOutput && !isLoading ? (
          <div className="programiz-empty-view">
            <p className="empty-hint">Click &quot;Run&quot; to execute your code.</p>
          </div>
        ) : (
          <div className="programiz-output-content">
            <div className="programiz-stream-row">
              {hasStdout && (
                <span className="programiz-stdout-text" id="stdout-content">
                  {stdout}
                </span>
              )}

              {isLoading && (
                <span className="programiz-live-input-container">
                  <input
                    ref={liveInputRef}
                    type="text"
                    className="programiz-live-input"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    onKeyDown={handleLiveKeyDown}
                    placeholder="Type input here & press Enter ↵"
                    spellCheck={false}
                    autoFocus
                  />
                </span>
              )}
            </div>

            {hasStderr && (
              <pre className="programiz-stderr-text" id="stderr-content">
                {stderr}
              </pre>
            )}

            {!isLoading && hasOutput && (
              <div className="programiz-exec-footer">
                <Clock size={11} />
                <span>
                  Executed in {executionTime ?? 0}ms
                  {compileTime ? ` (Compile: ${compileTime}ms)` : ''}
                  {exitCode !== null && exitCode !== undefined && ` • Exit Code: ${exitCode}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
