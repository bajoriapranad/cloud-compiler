import React, { useRef, useEffect, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Language, OptimizationLevel } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import {
  FileCode,
  Check,
  RotateCcw,
  Upload,
  Download,
  Eraser,
  Copy,
  Play,
  Loader2,
  ChevronDown,
  Zap,
  Clock,
  Activity,
} from 'lucide-react';

interface CodeEditorProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  code: string;
  onChange: (value: string) => void;
  onResetTemplate: () => void;
  onClearCode: () => void;
  onFileUpload: (file: File) => void;
  onDownloadCode: () => void;
  onRun: () => void;
  isLoading: boolean;
  timeLimit: number;
  onTimeLimitChange: (limit: number) => void;
  memoryLimit: number;
  onMemoryLimitChange: (limit: number) => void;
  optimization: OptimizationLevel;
  onOptimizationChange: (opt: OptimizationLevel) => void;
  onOpenOptimizationModal: () => void;
  readOnly?: boolean;
  theme: 'dark' | 'light';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  onLanguageChange,
  code,
  onChange,
  onResetTemplate,
  onClearCode,
  onFileUpload,
  onDownloadCode,
  onRun,
  isLoading,
  timeLimit,
  onTimeLimitChange,
  memoryLimit,
  onMemoryLimitChange,
  optimization,
  onOptimizationChange,
  onOpenOptimizationModal,
  readOnly = false,
  theme,
}) => {
  const [copied, setCopied] = useState(false);
  const langConfig = SUPPORTED_LANGUAGES[language];
  const monacoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCStyle = language === 'c' || language === 'cpp';

  const handleEditorMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E6EDF3',
        'editor.lineHighlightBackground': '#161B22',
        'editorLineNumber.foreground': '#484F58',
        'editorLineNumber.activeForeground': '#E6EDF3',
        'editorCursor.foreground': '#2F81F7',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#1F3858',
        'editorIndentGuide.background': '#21262D',
        'editorIndentGuide.activeBackground': '#30363D',
      },
    });

    monaco.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#1F2328',
        'editor.lineHighlightBackground': '#F6F8FA',
        'editorLineNumber.foreground': '#8C959F',
        'editorLineNumber.activeForeground': '#1F2328',
        'editorCursor.foreground': '#0969DA',
        'editor.selectionBackground': '#B6E3FF',
        'editor.inactiveSelectionBackground': '#D8EEFD',
        'editorIndentGuide.background': '#D8DEE4',
        'editorIndentGuide.activeBackground': '#AFB8C1',
      },
    });

    monaco.editor.setTheme(theme === 'dark' ? 'github-dark' : 'github-light');
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'github-dark' : 'github-light');
    }
  }, [theme]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    e.target.value = '';
  };

  const getSourceFileName = () => {
    switch (language) {
      case 'c': return 'main.c';
      case 'cpp': return 'main.cpp';
      case 'python': return 'main.py';
      case 'java': return 'Main.java';
      case 'javascript': return 'main.js';
      default: return 'source.txt';
    }
  };

  return (
    <div className="editor-container" id="code-editor-panel">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden-file-input"
        accept=".c,.cpp,.cc,.cxx,.py,.java,.js,.txt"
      />

      <div className="panel-header editor-header-top">
        <div className="editor-tab-active">
          <FileCode size={14} className="text-accent" />
          <span className="tab-filename">{getSourceFileName()}</span>
        </div>

        <div className="editor-actions">
          <button
            className="action-link-btn"
            onClick={handleUploadClick}
            disabled={isLoading}
            id="upload-file-btn"
            title="Upload source file (.c, .cpp, .java, .py, .js)"
          >
            <Upload size={13} />
            <span>Upload</span>
          </button>

          <button
            className="action-link-btn"
            onClick={onDownloadCode}
            disabled={isLoading}
            id="download-code-btn"
            title="Download source code"
          >
            <Download size={13} />
            <span>Download</span>
          </button>

          <button
            className="action-link-btn"
            onClick={handleCopyCode}
            id="copy-code-btn"
            title="Copy code to clipboard"
          >
            {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            className="action-link-btn"
            onClick={onClearCode}
            disabled={isLoading}
            id="clear-code-btn"
            title="Clear editor code"
          >
            <Eraser size={13} />
            <span>Clear</span>
          </button>

          <button
            className="action-link-btn"
            onClick={onResetTemplate}
            id="reset-template-btn"
            title="Reset code to starter template"
            disabled={readOnly || isLoading}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="editor-execution-bar">
        <div className="execution-bar-left">
          <div className="custom-select-wrapper">
            <select
              id="language-select"
              className="language-select select-compact"
              value={language}
              disabled={isLoading}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
            >
              {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          {isCStyle && (
            <>
              <div className="custom-select-wrapper">
                <select
                  id="optimization-select"
                  className="language-select select-compact"
                  value={optimization}
                  disabled={isLoading}
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
                className="action-link-btn benchmark-btn-compact"
                onClick={onOpenOptimizationModal}
                disabled={isLoading}
                title="Benchmark all optimization levels (-O0 to -Os)"
              >
                <Zap size={13} className="text-accent" />
                <span>Benchmark</span>
              </button>
            </>
          )}

          <div className="custom-select-wrapper" title="Execution Timeout Limit">
            <Clock size={12} className="inline-icon-prefix" />
            <select
              className="language-select select-compact"
              value={timeLimit}
              disabled={isLoading}
              onChange={(e) => onTimeLimitChange(Number(e.target.value))}
            >
              <option value={1}>1s limit</option>
              <option value={2}>2s limit</option>
              <option value={3}>3s limit</option>
              <option value={5}>5s limit</option>
            </select>
            <ChevronDown size={12} className="select-arrow" />
          </div>

          <div className="custom-select-wrapper" title="Execution Memory Limit">
            <Activity size={12} className="inline-icon-prefix" />
            <select
              className="language-select select-compact"
              value={memoryLimit}
              disabled={isLoading}
              onChange={(e) => onMemoryLimitChange(Number(e.target.value))}
            >
              <option value={64}>64 MB</option>
              <option value={128}>128 MB</option>
              <option value={256}>256 MB</option>
            </select>
            <ChevronDown size={12} className="select-arrow" />
          </div>

          <span className="runtime-badge-compact">{langConfig.version}</span>
        </div>

        <div className="execution-bar-right">
          <button
            className="btn-run"
            onClick={onRun}
            disabled={isLoading}
            id="run-code-btn"
            title="Execute code in container (Ctrl + Enter)"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="spin-icon" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={14} className="play-icon" />
                <span>Run</span>
                <kbd className="btn-kbd">Ctrl+↵</kbd>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={langConfig.monacoLang}
          value={code}
          theme={theme === 'dark' ? 'github-dark' : 'github-light'}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            renderWhitespace: 'selection',
            tabSize: language === 'python' ? 4 : 2,
          }}
        />
      </div>
    </div>
  );
};
