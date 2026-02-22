'use client';

import { useState, useEffect } from 'react';
import { DesktopWindow } from '@/lib/types';

interface TaskbarProps {
  isStartMenuOpen: boolean;
  onStartMenuToggle: () => void;
  windows: DesktopWindow[];
  onWindowClick: (windowId: string) => void;
  onWindowMinimize: (windowId: string) => void;
}

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
  provider?: string;
}

interface AuthStatus {
  user?: UserInfo;
  providers?: Record<string, { connected: boolean }>;
}

export default function Taskbar({
  isStartMenuOpen,
  onStartMenuToggle,
  windows,
  onWindowClick,
  onWindowMinimize,
}: TaskbarProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Fetch auth status
    const fetchAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        setAuthStatus(data);
      } catch (error) {
        console.log('Failed to fetch auth status');
      }
    };

    fetchAuthStatus();

    // Listen for oauth-success message to refresh
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        fetchAuthStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getAppIcon = (appType: DesktopWindow['appType']) => {
    switch (appType) {
      case 'browser':
        return '🌐';
      case 'file-explorer':
        return '📁';
      case 'notepad':
        return '📝';
      case 'terminal':
        return '⌨️';
      case 'settings':
        return '⚙️';
      case 'ai-assistant':
        return '🤖';
      default:
        return '□';
    }
  };

  const visibleWindows = windows.filter((w) => !w.isMinimized);
  const minimizedWindows = windows.filter((w) => w.isMinimized);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 border-t border-blue-400 dark:border-blue-700 shadow-2xl flex items-center px-2 gap-2 z-50">
      {/* Start Button */}
      <button
        onClick={onStartMenuToggle}
        className={`px-4 py-2 rounded font-bold transition-all ${
          isStartMenuOpen
            ? 'bg-blue-700 dark:bg-blue-950 text-white'
            : 'bg-blue-400 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 text-white'
        }`}
      >
        ⊞ Start
      </button>

      {/* Separator */}
      <div className="w-px h-8 bg-blue-400 dark:bg-blue-700" />

      {/* Open Windows */}
      <div className="flex-1 flex gap-2 items-center">
        {visibleWindows.length > 0 ? (
          visibleWindows.map((win) => (
            <button
              key={win.id}
              onClick={() => onWindowClick(win.id)}
              className="px-3 py-2 bg-blue-400 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors truncate max-w-40"
              title={win.title}
            >
              <span className="mr-2">{getAppIcon(win.appType)}</span>
              {win.title}
            </button>
          ))
        ) : (
          <span className="text-white text-sm opacity-75">No windows open</span>
        )}

        {/* Minimized Windows Indicator */}
        {minimizedWindows.length > 0 && (
          <>
            <div className="flex-1" />
            <div className="flex gap-2 items-center">
              <span className="text-white text-xs opacity-75">Minimized:</span>
              {minimizedWindows.map((win) => (
                <button
                  key={win.id}
                  onClick={() => {
                    onWindowMinimize(win.id);
                    onWindowClick(win.id);
                  }}
                  className="px-2 py-1 bg-blue-300 dark:bg-blue-600 hover:bg-blue-200 dark:hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                  title={`Restore ${win.title}`}
                >
                  {getAppIcon(win.appType)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* System Tray */}
      <div className="flex gap-2 items-center text-white text-sm">
        {/* User Info */}
        {authStatus?.user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded bg-blue-400 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors"
              title={`Signed in as ${authStatus.user.name} (${authStatus.user.provider})`}
            >
              {authStatus.user.picture && (
                <img
                  src={authStatus.user.picture}
                  alt={authStatus.user.name}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-xs font-medium hidden sm:inline">
                {authStatus.user.name?.split(' ')[0]}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-50">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    {authStatus.user.picture && (
                      <img
                        src={authStatus.user.picture}
                        alt={authStatus.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {authStatus.user.name}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        {authStatus.user.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connected Providers */}
                {authStatus.providers && (
                  <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                      Connected:
                    </div>
                    <div className="space-y-1">
                      {Object.entries(authStatus.providers).map(([provider, status]) => (
                        <div
                          key={provider}
                          className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                        >
                          <span className="text-sm">
                            {provider === 'google' && '🔵'}
                            {provider === 'github' && '⬛'}
                            {provider === 'x' && '✕'}
                            {provider === 'linkedin' && '🔗'}
                            {provider === 'facebook' && '📘'}
                          </span>
                          <span className="capitalize flex-1">{provider}</span>
                          {status.connected && (
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={async () => {
                      await fetch('/api/auth/disconnect', { method: 'POST' });
                      setShowUserMenu(false);
                      setAuthStatus(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clock */}
        <div className="px-3 py-2 rounded bg-blue-400 dark:bg-blue-700 text-xs font-semibold">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
