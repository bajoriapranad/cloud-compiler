import React, { useState, useEffect, useCallback } from 'react';
import type { Language, ExecutionStatus, OptimizationLevel, SubmissionDetail } from './types';
import { SUPPORTED_LANGUAGES } from './constants/languages';
import { executeCode, checkBackendHealth } from './services/api';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { ProgramizOutputPanel } from './components/ProgramizOutputPanel';
import { BatchTestingPanel } from './components/BatchTestingPanel';
import { MetricsBar } from './components/MetricsBar';
import { OutputPanel } from './components/OutputPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { OptimizationModal } from './components/OptimizationModal';
import { startInteractiveSession, type InteractiveSessionHandle } from './services/interactive';
import { Terminal, ListFilter } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('cloud_compiler_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cloud_compiler_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [language, setLanguage] = useState<Language>('c');
  const [code, setCode] = useState<string>(SUPPORTED_LANGUAGES.c.defaultCode);
  const [stdin, setStdin] = useState<string>(SUPPORTED_LANGUAGES.c.defaultStdin);

  const [timeLimit, setTimeLimit] = useState<number>(2);
  const [memoryLimit, setMemoryLimit] = useState<number>(128);
  const [optimization, setOptimization] = useState<OptimizationLevel>('O2');
  const [inputMode, setInputMode] = useState<'stdin' | 'batch'>('stdin');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState<boolean>(false);
  
  const [status, setStatus] = useState<ExecutionStatus>('IDLE');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [compileTime, setCompileTime] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);

  const probeBackend = useCallback(async () => {
    const health = await checkBackendHealth();
    setBackendOnline(health.online);
    if (health.online && health.data) {
      setDockerAvailable(health.data.docker?.available ?? false);
    } else {
      setDockerAvailable(false);
    }
  }, []);

  useEffect(() => {
    probeBackend();
    const interval = setInterval(probeBackend, 10000);
    return () => clearInterval(interval);
  }, [probeBackend]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(SUPPORTED_LANGUAGES[newLang].defaultCode);
    setStdin(SUPPORTED_LANGUAGES[newLang].defaultStdin);
    setStatus('IDLE');
    setStdout('');
    setStderr('');
    setCompileTime(null);
    setExecutionTime(null);
    setExitCode(null);
  };

  const handleResetTemplate = () => {
    setCode(SUPPORTED_LANGUAGES[language].defaultCode);
    setStdin(SUPPORTED_LANGUAGES[language].defaultStdin);
  };

  const handleClearCode = () => {
    setCode('');
  };

  const handleClearOutput = () => {
    setStdout('');
    setStderr('');
    setStatus('IDLE');
    setCompileTime(null);
    setExecutionTime(null);
    setExitCode(null);
  };

  const handleResetAll = () => {
    handleResetTemplate();
    handleClearOutput();
  };

  const handleFileUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let detectedLang: Language | null = null;

    if (ext === 'c') detectedLang = 'c';
    else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') detectedLang = 'cpp';
    else if (ext === 'py') detectedLang = 'python';
    else if (ext === 'java') detectedLang = 'java';
    else if (ext === 'js') detectedLang = 'javascript';

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content !== undefined) {
        if (detectedLang) {
          setLanguage(detectedLang);
          setStdin(SUPPORTED_LANGUAGES[detectedLang].defaultStdin);
        }
        setCode(content);
        handleClearOutput();
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCode = () => {
    const filename =
      language === 'c'
        ? 'main.c'
        : language === 'cpp'
        ? 'main.cpp'
        : language === 'python'
        ? 'main.py'
        : language === 'java'
        ? 'Main.java'
        : 'main.js';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSubmission = (sub: SubmissionDetail) => {
    setLanguage(sub.language);
    setCode(sub.code);
    setStdin(sub.stdin || '');
    setStdout(sub.stdout || '');
    setStderr(sub.stderr || '');
    setStatus(sub.status);
    setCompileTime(sub.compileTime ?? null);
    setExecutionTime(sub.executionTime ?? null);
    setExitCode(sub.exitCode ?? null);
  };

  const activeSessionRef = React.useRef<InteractiveSessionHandle | null>(null);

  const handleSendStdin = useCallback((text: string) => {
    if (activeSessionRef.current) {
      activeSessionRef.current.sendStdin(text);
      setStdout((prev) => prev + text);
    }
  }, []);

  const handleStop = useCallback(() => {
    if (activeSessionRef.current) {
      activeSessionRef.current.kill();
      activeSessionRef.current = null;
    }
    setIsLoading(false);
    setStatus('IDLE');
  }, []);

  const handleRun = useCallback(async () => {
    if (isLoading) return;

    if (activeSessionRef.current) {
      activeSessionRef.current.kill();
      activeSessionRef.current = null;
    }

    setIsLoading(true);
    setStatus('RUNNING');
    setStdout('');
    setStderr('');
    setCompileTime(null);
    setExecutionTime(null);
    setExitCode(null);

    try {
      const session = startInteractiveSession(
        {
          language,
          code,
          stdin,
          timeLimit,
          memoryLimit,
          optimization,
        },
        {
          onStatus: () => {
            setStatus('RUNNING');
          },
          onCompileSuccess: (cTime) => {
            setCompileTime(cTime);
          },
          onStdout: (chunk) => {
            setStdout((prev) => prev + chunk);
          },
          onStderr: (chunk) => {
            setStderr((prev) => prev + chunk);
          },
          onExit: (res) => {
            setStatus(res.status);
            if (res.compileTime !== undefined) setCompileTime(res.compileTime);
            setExecutionTime(res.executionTime);
            setExitCode(res.exitCode);
            setIsLoading(false);
            activeSessionRef.current = null;
          },
            onError: async (errMsg) => {
            try {
              const result = await executeCode({
                language,
                code,
                stdin,
                timeLimit,
                memoryLimit,
                optimization,
              });
              setStatus(result.status);
              setStdout(result.stdout || '');
              setStderr(result.stderr || '');
              setCompileTime(result.compileTime ?? null);
              setExecutionTime(result.executionTime ?? null);
              setExitCode(result.exitCode ?? null);
            } catch (fallbackErr: unknown) {
              const message = fallbackErr instanceof Error ? fallbackErr.message : errMsg;
              setStatus('DOCKER_ERROR');
              setStderr(`[Execution Error]: ${message}`);
            } finally {
              setIsLoading(false);
              activeSessionRef.current = null;
            }
          },
        }
      );
      activeSessionRef.current = session;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize execution';
      setStatus('DOCKER_ERROR');
      setStderr(`[Execution Error]: ${message}`);
      setIsLoading(false);
    }
  }, [isLoading, language, code, stdin, timeLimit, memoryLimit, optimization]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  return (
    <div className="app-layout" id="cloud-compiler-root">
      <Header
        backendOnline={backendOnline}
        dockerAvailable={dockerAvailable}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="main-content">
        <section className="workspace-grid" id="workspace-grid">
          <div className="workspace-left">
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onChange={setCode}
              onResetTemplate={handleResetAll}
              onClearCode={handleClearCode}
              onFileUpload={handleFileUpload}
              onDownloadCode={handleDownloadCode}
              onRun={() => handleRun()}
              isLoading={isLoading}
              timeLimit={timeLimit}
              onTimeLimitChange={setTimeLimit}
              memoryLimit={memoryLimit}
              onMemoryLimitChange={setMemoryLimit}
              optimization={optimization}
              onOptimizationChange={setOptimization}
              onOpenOptimizationModal={() => setIsOptimizationModalOpen(true)}
              readOnly={isLoading}
              theme={theme}
            />
          </div>

          <div className="workspace-right">
            <div className="right-panel-tabs">
              <button
                className={`right-tab-btn ${inputMode === 'stdin' ? 'right-tab-active' : ''}`}
                onClick={() => setInputMode('stdin')}
                id="tab-programiz-output"
              >
                <Terminal size={13} />
                <span>Output</span>
              </button>
              <button
                className={`right-tab-btn ${inputMode === 'batch' ? 'right-tab-active' : ''}`}
                onClick={() => setInputMode('batch')}
                id="tab-batch-testing"
              >
                <ListFilter size={13} />
                <span>Batch Test Cases</span>
              </button>
            </div>

            {inputMode === 'stdin' ? (
              <ProgramizOutputPanel
                status={status}
                compileTime={compileTime}
                executionTime={executionTime}
                exitCode={exitCode}
                stdout={stdout}
                stderr={stderr}
                isLoading={isLoading}
                onClear={handleClearOutput}
                stdin={stdin}
                onStdinChange={setStdin}
                onSendStdin={handleSendStdin}
                onStop={handleStop}
              />
            ) : (
              <>
                <BatchTestingPanel
                  language={language}
                  code={code}
                />

                <MetricsBar
                  status={status}
                  compileTime={compileTime}
                  executionTime={executionTime}
                  exitCode={exitCode}
                />

                <OutputPanel
                  stdout={stdout}
                  stderr={stderr}
                  onClear={handleClearOutput}
                  isLoading={isLoading}
                />
              </>
            )}
          </div>
        </section>
      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadSubmission={handleLoadSubmission}
      />

      <OptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
        language={language}
        code={code}
        stdin={stdin}
      />

      {/* Footer Info */}
      <footer className="app-footer" id="app-footer">
        <span>Cloud Compiler &copy; 2026 &bull; Ephemeral Linux Sandboxes with Docker &bull; SQLite History</span>
      </footer>
    </div>
  );
};

export default App;
