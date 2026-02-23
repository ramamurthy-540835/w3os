'use client';

import { useState, useEffect } from 'react';

interface Provider {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
}

interface WelcomeDialogProps {
  onClose: () => void;
}

const PROVIDERS: Provider[] = [
  { id: 'google', name: 'Google', connected: false, icon: '🔵' },
  { id: 'github', name: 'GitHub', connected: false, icon: '🐙' },
  { id: 'x', name: 'X (Twitter)', connected: false, icon: '𝕏' },
  { id: 'linkedin', name: 'LinkedIn', connected: false, icon: '💼' },
];

export default function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  const [providers, setProviders] = useState<Provider[]>(PROVIDERS);
  const [anyConnected, setAnyConnected] = useState(false);

  useEffect(() => {
    loadProviders();

    // Listen for oauth-success messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        setTimeout(() => loadProviders(), 500);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      if (data.providers) {
        const updated = PROVIDERS.map((p) => ({
          ...p,
          connected: data.providers[p.id]?.connected || false,
        }));
        setProviders(updated);
        setAnyConnected(updated.some((p) => p.connected));
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const handleConnect = (providerId: string) => {
    const popup = window.open(
      `/api/auth/${providerId}`,
      `${providerId}-auth`,
      'width=500,height=600,left=200,top=100'
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-white">
          <h1 className="text-2xl font-bold mb-2">👋 Welcome to W3 Cloud OS</h1>
          <p className="text-sm text-blue-100">
            Connect your accounts to unlock powerful integrations
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect at least one account to get started. You can add more later in Settings.
          </p>

          {/* Providers Grid */}
          <div className="grid grid-cols-2 gap-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  provider.connected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-400'
                }`}
              >
                <div className="text-3xl mb-2">{provider.icon}</div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                  {provider.name}
                </div>
                {provider.connected && (
                  <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    ✅ Connected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 What you can do:
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>📧 Google: Access Gmail, Drive, Sheets</li>
              <li>🐙 GitHub: Manage repositories</li>
              <li>𝕏 X: Read tweets, post updates</li>
              <li>💼 LinkedIn: Share posts, view profiles</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={!anyConnected}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              anyConnected
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
            }`}
          >
            Continue to Desktop
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Accessibility: Connect at least one to proceed info */}
        {!anyConnected && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 px-6 py-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              ✨ Connect an account to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
