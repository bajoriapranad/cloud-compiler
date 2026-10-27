import React, { useState } from 'react';
import { Play, Plus, Trash2, CheckCircle2, XCircle, ListFilter, Loader2 } from 'lucide-react';
import type { TestCase, BatchExecutionResult, Language } from '../types';
import { executeBatch } from '../services/api';

interface BatchTestingPanelProps {
  language: Language;
  code: string;
}

export const BatchTestingPanel: React.FC<BatchTestingPanelProps> = ({
  language,
  code,
}) => {
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 1, input: '2 3', expectedOutput: 'Sum: 2 + 3 = 5' },
    { id: 2, input: '10 20', expectedOutput: 'Sum: 10 + 20 = 30' },
    { id: 3, input: '-5 6', expectedOutput: 'Sum: -5 + 6 = 1' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchExecutionResult | null>(null);

  const handleAddTestCase = () => {
    const nextId = testCases.length > 0 ? Math.max(...testCases.map((t) => t.id)) + 1 : 1;
    setTestCases([
      ...testCases,
      { id: nextId, input: '0 0', expectedOutput: 'Sum: 0 + 0 = 0' },
    ]);
  };

  const handleRemoveTestCase = (id: number) => {
    if (testCases.length <= 1) return;
    setTestCases(testCases.filter((tc) => tc.id !== id));
  };

  const handleUpdateTestCase = (id: number, field: 'input' | 'expectedOutput', value: string) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const handleRunAll = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const res = await executeBatch(language, code, testCases);
      setBatchResult(res);
    } catch {
      setBatchResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="batch-panel-container">
      <div className="batch-header">
        <div className="batch-title">
          <ListFilter size={15} className="text-accent" />
          <span>Batch Test Cases ({testCases.length})</span>
        </div>

        <div className="batch-actions">
          <button
            className="action-link-btn"
            onClick={handleAddTestCase}
            disabled={isRunning || testCases.length >= 6}
            title="Add test case"
          >
            <Plus size={13} />
            <span>Add Case</span>
          </button>

          <button
            className="btn-run batch-run-btn"
            onClick={handleRunAll}
            disabled={isRunning}
            title="Execute code against all test cases"
          >
            {isRunning ? (
              <>
                <Loader2 size={13} className="spin-icon" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Play size={13} className="play-icon" />
                <span>Run All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {batchResult && (
        <div className={`batch-summary-banner ${batchResult.allPassed ? 'banner-pass' : 'banner-fail'}`}>
          {batchResult.allPassed ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          <span>
            Total: {batchResult.totalPassed} / {batchResult.totalCases} Passed
            {batchResult.compileTime ? ` (Compile: ${batchResult.compileTime}ms)` : ''}
          </span>
        </div>
      )}

      <div className="test-cases-list">
        {testCases.map((tc, idx) => {
          const result = batchResult?.results?.find((r) => r.id === tc.id);

          return (
            <div key={tc.id} className="test-case-card">
              <div className="test-case-header">
                <span className="test-case-num">Case #{idx + 1}</span>

                {result && (
                  <span className={`status-badge ${result.passed ? 'badge-success' : 'badge-error'}`}>
                    {result.passed ? (
                      <>
                        <CheckCircle2 size={11} /> Passed ({result.executionTime}ms)
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Failed
                      </>
                    )}
                  </span>
                )}

                <button
                  className="test-case-del-btn"
                  onClick={() => handleRemoveTestCase(tc.id)}
                  disabled={isRunning || testCases.length <= 1}
                  title="Remove test case"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="test-case-inputs">
                <div className="test-input-group">
                  <label className="test-label">Input:</label>
                  <input
                    type="text"
                    className="test-input"
                    value={tc.input}
                    onChange={(e) => handleUpdateTestCase(tc.id, 'input', e.target.value)}
                    placeholder="Standard input"
                    disabled={isRunning}
                  />
                </div>

                <div className="test-input-group">
                  <label className="test-label">Expected:</label>
                  <input
                    type="text"
                    className="test-input"
                    value={tc.expectedOutput}
                    onChange={(e) => handleUpdateTestCase(tc.id, 'expectedOutput', e.target.value)}
                    placeholder="Expected output"
                    disabled={isRunning}
                  />
                </div>
              </div>

              {result && !result.passed && (
                <div className="test-case-mismatch">
                  <span className="mismatch-label">Actual Output:</span>
                  <code className="mismatch-code">{result.actualOutput.trim() || '(empty)'}</code>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
