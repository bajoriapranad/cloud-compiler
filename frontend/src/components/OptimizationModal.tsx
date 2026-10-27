import React, { useState, useEffect } from 'react';
import { X, Play, Zap, Loader2, BarChart2 } from 'lucide-react';
import type { Language, OptimizationResult } from '../types';
import { getOptimizationBenchmarks } from '../services/api';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  code: string;
  stdin: string;
}

export const OptimizationModal: React.FC<OptimizationModalProps> = ({
  isOpen,
  onClose,
  language,
  code,
  stdin,
}) => {
  const [benchmarks, setBenchmarks] = useState<OptimizationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runBenchmark = async () => {
    setIsRunning(true);
    try {
      const data = await getOptimizationBenchmarks(language, code, stdin);
      setBenchmarks(data);
    } catch {
      setBenchmarks(null);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runBenchmark();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxBinarySize = benchmarks
    ? Math.max(...benchmarks.benchmarks.map((b) => b.binarySize || 1))
    : 1;
  const maxExecTime = benchmarks
    ? Math.max(...benchmarks.benchmarks.map((b) => b.executionTime || 1))
    : 1;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Zap size={18} className="text-accent" />
            <span>Compiler Optimization Benchmark (GCC/G++)</span>
          </div>

          <button className="theme-toggle-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Compares program metrics across GCC optimization flags (<strong>-O0</strong> through <strong>-Os</strong>).
            Observe the trade-offs between compilation time, binary footprint, and execution velocity.
          </p>

          <div className="benchmark-toolbar">
            <button
              className="btn-run"
              onClick={runBenchmark}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  <span>Compiling &amp; Measuring...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="play-icon" />
                  <span>Run Benchmark</span>
                </>
              )}
            </button>
          </div>

          {isRunning ? (
            <div className="terminal-loading-state" style={{ height: '220px' }}>
              <Loader2 size={32} className="spin-icon text-accent" />
              <p className="loading-text">Benchmarking -O0, -O1, -O2, -O3, -Os...</p>
              <span className="loading-subtext">Compiling binaries and analyzing size in container</span>
            </div>
          ) : !benchmarks ? (
            <div className="terminal-empty-state" style={{ height: '220px' }}>
              <BarChart2 size={32} className="empty-icon" />
              <p className="empty-title">Ready to Benchmark</p>
              <span className="empty-subtext">Click &quot;Run Benchmark&quot; to test optimization flags</span>
            </div>
          ) : (
            <div className="benchmark-results">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>Optimization</th>
                    <th>Compile Time</th>
                    <th>Runtime</th>
                    <th>Binary Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.benchmarks.map((item) => (
                    <tr key={item.level}>
                      <td className="opt-level-cell">
                        <code>{item.level}</code>
                      </td>
                      <td>{item.compileTime} ms</td>
                      <td>{item.executionTime} ms</td>
                      <td>{item.binarySize ? `${(item.binarySize / 1024).toFixed(1)} KB (${item.binarySize} B)` : '--'}</td>
                      <td>
                        <span className={`status-badge ${item.status === 'Success' ? 'badge-success' : 'badge-error'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Visual Comparisons */}
              <div className="benchmark-charts-grid">
                <div className="chart-card">
                  <h4 className="chart-title">Binary Size Comparison</h4>
                  <div className="bars-list">
                    {benchmarks.benchmarks.map((b) => (
                      <div key={b.level} className="bar-row">
                        <span className="bar-label">{b.level}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-fill-accent"
                            style={{
                              width: `${Math.max(12, Math.round((b.binarySize / maxBinarySize) * 100))}%`,
                            }}
                          ></div>
                        </div>
                        <span className="bar-val">{(b.binarySize / 1024).toFixed(1)}K</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <h4 className="chart-title">Execution Time Comparison</h4>
                  <div className="bars-list">
                    {benchmarks.benchmarks.map((b) => (
                      <div key={b.level} className="bar-row">
                        <span className="bar-label">{b.level}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-fill-green"
                            style={{
                              width: `${Math.max(12, Math.round((b.executionTime / maxExecTime) * 100))}%`,
                            }}
                          ></div>
                        </div>
                        <span className="bar-val">{b.executionTime}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
