import React, { useEffect, useState } from 'react';
import { History, X, Trash2, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import type { SubmissionSummary, SubmissionDetail } from '../types';
import { getSubmissions, getSubmissionById, clearSubmissions } from '../services/api';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSubmission: (submission: SubmissionDetail) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onLoadSubmission,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getSubmissions();
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearAll = async () => {
    if (window.confirm('Clear all submission history from database?')) {
      const success = await clearSubmissions();
      if (success) {
        setSubmissions([]);
      } else {
        alert('Failed to clear history. Please check the backend connection and try again.');
      }
    }
  };

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      const full = await getSubmissionById(id);
      if (full) {
        onLoadSubmission(full);
        onClose();
      }
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <History size={18} className="text-accent" />
            <span>Submission History</span>
            <span className="drawer-count">({submissions.length})</span>
          </div>

          <div className="drawer-actions">
            {submissions.length > 0 && (
              <button
                className="action-link-btn"
                onClick={handleClearAll}
                title="Clear all stored runs"
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
            <button className="theme-toggle-btn" onClick={onClose} title="Close drawer">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {isLoading ? (
            <div className="terminal-loading-state">
              <Loader2 size={24} className="spin-icon text-accent" />
              <p className="loading-text">Loading history from SQLite...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="terminal-empty-state">
              <Clock size={32} className="empty-icon" />
              <p className="empty-title">No Submissions Recorded</p>
              <span className="empty-subtext">Click &quot;Run&quot; on any program to record it in SQLite database</span>
            </div>
          ) : (
            <div className="history-list">
              {submissions.map((item) => (
                <div key={item.id} className="history-card">
                  <div className="history-card-header">
                    <div className="history-lang-badge">{item.language.toUpperCase()}</div>
                    <div className="history-time">{formatDate(item.createdAt)}</div>
                  </div>

                  <div className="history-card-body">
                    <div className="history-status-row">
                      {item.status === 'SUCCESS' ? (
                        <span className="badge-success status-badge">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      ) : item.status === 'COMPILATION_ERROR' ? (
                        <span className="badge-error status-badge">
                          <XCircle size={12} /> Compile Error
                        </span>
                      ) : (
                        <span className="badge-warning status-badge">
                          <AlertTriangle size={12} /> {item.status}
                        </span>
                      )}

                      <span className="history-metric">
                        {item.executionTime ? `${item.executionTime}ms` : '--'}
                      </span>
                    </div>

                    {item.stdout && (
                      <div className="history-preview">
                        <code>{item.stdout.slice(0, 100)}{item.stdout.length > 100 ? '...' : ''}</code>
                      </div>
                    )}
                  </div>

                  <div className="history-card-footer">
                    <button
                      className="btn-secondary history-load-btn"
                      onClick={() => handleSelect(item.id)}
                      disabled={loadingId === item.id}
                    >
                      {loadingId === item.id ? (
                        <Loader2 size={12} className="spin-icon" />
                      ) : (
                        <ArrowRight size={12} />
                      )}
                      <span>Load into Editor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
