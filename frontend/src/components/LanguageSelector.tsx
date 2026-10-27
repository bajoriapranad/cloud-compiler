import React from 'react';
import type { Language, OptimizationLevel } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { Code2, ChevronDown, Zap, Clock, Activity } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  timeLimit: number;
  onTimeLimitChange: (limit: number) => void;
  memoryLimit: number;
  onMemoryLimitChange: (limit: number) => void;
  optimization: OptimizationLevel;
  onOptimizationChange: (opt: OptimizationLevel) => void;
  onOpenOptimizationModal: () => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  timeLimit,
  onTimeLimitChange,
  memoryLimit,
  onMemoryLimitChange,
  optimization,
  onOptimizationChange,
  onOpenOptimizationModal,
  disabled = false,
}) => {
  const current = SUPPORTED_LANGUAGES[currentLanguage];
  const isCStyle = currentLanguage === 'c' || currentLanguage === 'cpp';

  return (
    <div className="language-selector-container" id="language-selector-wrapper">
      <div className="selector-label">
        <Code2 size={15} className="text-accent" />
        <span>Language:</span>
      </div>

      <div className="custom-select-wrapper">
        <select
          id="language-select"
          className="language-select"
          value={currentLanguage}
          disabled={disabled}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
        >
          {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="select-arrow" />
      </div>

      {/* Compiler Optimization Level Selector for C & C++ (Teacher's Section 31) */}
      {isCStyle && (
        <div className="selector-sub-group">
          <div className="custom-select-wrapper">
            <select
              id="optimization-select"
              className="language-select"
              value={optimization}
              disabled={disabled}
              onChange={(e) => onOptimizationChange(e.target.value as OptimizationLevel)}
              title="Compiler Optimization Flag"
            >
              <option value="O0">-O0 (None)</option>
              <option value="O1">-O1 (Basic)</option>
              <option value="O2">-O2 (Default)</option>
              <option value="O3">-O3 (Max Speed)</option>
              <option value="Os">-Os (Small Size)</option>
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          <button
            className="action-link-btn"
            onClick={onOpenOptimizationModal}
            disabled={disabled}
            title="Benchmark all optimization levels (-O0 to -Os)"
          >
            <Zap size={13} className="text-accent" />
            <span>Benchmark</span>
          </button>
        </div>
      )}

      {/* Configurable Time Limit (Teacher's Section 7) */}
      <div className="selector-sub-group">
        <div className="custom-select-wrapper" title="Execution Timeout Limit">
          <Clock size={13} className="inline-icon-prefix" />
          <select
            className="language-select select-compact"
            value={timeLimit}
            disabled={disabled}
            onChange={(e) => onTimeLimitChange(Number(e.target.value))}
          >
            <option value={1}>1s limit</option>
            <option value={2}>2s limit</option>
            <option value={3}>3s limit</option>
            <option value={5}>5s limit</option>
          </select>
          <ChevronDown size={13} className="select-arrow" />
        </div>
      </div>

      {/* Configurable Memory Limit (Teacher's Section 7) */}
      <div className="selector-sub-group">
        <div className="custom-select-wrapper" title="Execution Memory Limit">
          <Activity size={13} className="inline-icon-prefix" />
          <select
            className="language-select select-compact"
            value={memoryLimit}
            disabled={disabled}
            onChange={(e) => onMemoryLimitChange(Number(e.target.value))}
          >
            <option value={64}>64 MB</option>
            <option value={128}>128 MB</option>
            <option value={256}>256 MB</option>
          </select>
          <ChevronDown size={13} className="select-arrow" />
        </div>
      </div>

      <div className="active-runtime-badge">
        <span className="runtime-label">Runtime:</span>
        <span className="runtime-version">{current.version}</span>
      </div>
    </div>
  );
};
