import React, { useState } from 'react';
import { Terminal, AlertCircle, Copy, Check, Trash2, Layers, Download } from 'lucide-react';

interface OutputPanelProps {
  stdout: string;
  stderr: string;
  onClear: () => void;
  isLoading: boolean;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  stdout,
  stderr,
  onClear,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [copied, setCopied] = useState(false);

  const hasStderr = Boolean(stderr && stderr.trim().length > 0);
  const hasStdout = Boolean(stdout && stdout.trim().length > 0);
  const hasOutput = hasStdout || hasStderr;

  const getTextToExport = () => {
    if (activeTab === 'all') {
      return [stdout, stderr].filter(Boolean).join('\n--- Stderr / Diagnostics ---\n');
    } else if (activeTab === 'stdout') {
      return stdout;
    } else {
      return stderr;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTextToExport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadOutput = () => {
    const text = getTextToExport();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution_output_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="output-panel-container" id="output-panel">
      <div className="panel-header">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
            id="tab-all-output"
          >
            <Layers size={14} />
            <span>Combined</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'stdout' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('stdout')}
            id="tab-stdout"
          >
            <Terminal size={14} />
            <span>Output (stdout)</span>
            {hasStdout && <span className="tab-indicator indicator-green"></span>}
          </button>
          <button
            className={`tab-btn ${activeTab === 'stderr' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('stderr')}
            id="tab-stderr"
          >
            <AlertCircle size={14} />
            <span>Errors (stderr)</span>
            {hasStderr && <span className="tab-indicator indicator-red"></span>}
          </button>
        </div>

        <div className="panel-actions">
          {hasOutput ? (
            <>
              <button
                className="action-link-btn"
                onClick={handleCopy}
                id="copy-output-btn"
                title="Copy output to clipboard"
              >
                {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                className="action-link-btn"
                onClick={handleDownloadOutput}
                id="download-output-btn"
                title="Download output as text file"
              >
                <Download size={13} />
                <span>Download</span>
              </button>
              <button
                className="action-link-btn"
                onClick={onClear}
                id="clear-output-btn"
                title="Clear output console"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="terminal-body" id="terminal-screen">
        {isLoading ? (
          <div className="terminal-loading-state">
            <div className="terminal-spinner"></div>
            <p className="loading-text">Compiling and running in sandbox...</p>
            <span className="loading-subtext">Executing inside isolated Docker container</span>
          </div>
        ) : !hasOutput ? (
          <div className="terminal-empty-state">
            <Terminal size={32} className="empty-icon" />
            <p className="empty-title">Execution Console Ready</p>
            <span className="empty-subtext">
              Click &quot;Run&quot; or press Ctrl+Enter to execute your program
            </span>
          </div>
        ) : (
          <div className="terminal-content">
            {/* Show stdout if present and not in stderr tab */}
            {activeTab !== 'stderr' && hasStdout && (
              <div className="stream-section">
                <span className="stream-header text-green">Standard Output (stdout)</span>
                <pre className="stream-pre stdout-pre" id="stdout-content">
                  {stdout}
                </pre>
              </div>
            )}

            {/* Show stderr if present and not in stdout tab */}
            {activeTab !== 'stdout' && hasStderr && (
              <div className="stream-section">
                <span className="stream-header text-red">Diagnostics / Errors (stderr)</span>
                <pre className="stream-pre stderr-pre" id="stderr-content">
                  {stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
