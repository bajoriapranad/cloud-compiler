import React from 'react';
import { Terminal, Wifi, WifiOff, Sun, Moon, History } from 'lucide-react';

interface HeaderProps {
  backendOnline: boolean | null;
  dockerAvailable: boolean | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  dockerAvailable,
  theme,
  onToggleTheme,
  onOpenHistory,
}) => {
  return (
    <header className="app-header" id="app-header">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <Terminal className="brand-icon" size={20} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Cloud Compiler</h1>
        </div>
      </div>

      <div className="header-badges">

        {/* Backend Connectivity Status */}
        <div
          className={`security-badge ${
            backendOnline === true ? 'badge-status-online' : backendOnline === false ? 'badge-status-offline' : ''
          }`}
          title={
            backendOnline === true
              ? `Backend Connected (Docker: ${dockerAvailable ? 'Ready' : 'Daemon Offline'})`
              : 'Backend API Offline (using mock or start backend server)'
          }
        >
          {backendOnline === true ? (
            <Wifi size={14} className="badge-icon text-green" />
          ) : (
            <WifiOff size={14} className="badge-icon text-red" />
          )}
          <span>
            {backendOnline === true
              ? dockerAvailable
                ? 'API + Docker Ready'
                : 'API Connected'
              : 'API Offline'}
          </span>
        </div>

        {/* SQLite History Button */}
        <button
          className="btn-secondary history-nav-btn"
          onClick={onOpenHistory}
          id="open-history-btn"
          title="Open SQLite Submission History"
        >
          <History size={14} className="text-accent" />
          <span>History</span>
        </button>


        {/* GitHub Dark/Light Theme Switcher */}
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          id="theme-toggle-btn"
          title={`Switch to GitHub ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};
