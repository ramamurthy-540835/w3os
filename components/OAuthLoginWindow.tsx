'use client';

import { useState, useEffect } from 'react';

interface OAuthLoginWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
  onClose?: () => void;
}

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
  provider?: string;
}

export default function OAuthLoginWindow({
  windowId,
  onStateChange,
  onClose,
}: OAuthLoginWindowProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<Record<string, UserInfo | null>>({
    google: null,
    github: null,
    x: null,
    linkedin: null,
    facebook: null,
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        // Set primary user
        if (data.user) {
          setUser(data.user);
          onStateChange({ user: data.user, isLoggedIn: true });
        }

        // Set connected providers
        if (data.providers) {
          const providers: Record<string, UserInfo | null> = {};
          for (const [key, value] of Object.entries(data.providers)) {
            const provider = value as any;
            if (provider.connected) {
              providers[key] = {
                name: provider.name,
                email: provider.email,
                picture: provider.picture,
                provider: key,
              };
            } else {
              providers[key] = null;
            }
          }
          setConnectedProviders(providers);
        }
      } catch (error) {
        console.log('Not logged in');
      }
    };
    checkAuth();

    // Listen for oauth-success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success' && event.data?.user) {
        const provider = event.data.provider || 'google';

        // Update connected providers
        setConnectedProviders((prev) => ({
          ...prev,
          [provider]: event.data.user,
        }));

        // Set as primary user
        setUser(event.data.user);
        onStateChange({ user: event.data.user, isLoggedIn: true });

        // Store in localStorage for persistence
        localStorage.setItem('w3-connected-providers', JSON.stringify(connectedProviders));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange, connectedProviders]);

  const handleLogin = (provider: string) => {
    // Open OAuth in a popup window
    window.open(
      `/api/auth/${provider}`,
      `${provider}-login`,
      'width=500,height=600,menubar=no,toolbar=no,location=yes'
    );
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' });
      setUser(null);
      onStateChange({ user: null, isLoggedIn: false });
    } catch (error) {
      alert('Sign out failed');
    }
  };

  const providers = [
    { id: 'google', name: 'Google', emoji: '🔵', color: 'bg-blue-600' },
    { id: 'github', name: 'GitHub', emoji: '⬛', color: 'bg-gray-800' },
    { id: 'x', name: 'X', emoji: '✕', color: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', emoji: '🔗', color: 'bg-blue-700' },
    { id: 'facebook', name: 'Facebook', emoji: '📘', color: 'bg-blue-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🖥️</span>
          <h1 className="text-xl font-bold">W3 Cloud OS</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {user ? (
          // Logged In View
          <div className="text-center max-w-sm mx-auto">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-20 h-20 rounded-full mx-auto mb-4 border-3 border-blue-500 shadow-md"
              />
            )}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name || 'Welcome'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-4">
              <p className="text-green-700 dark:text-green-300 font-bold text-sm">
                ✓ You are logged in
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all text-sm"
            >
              Sign Out
            </button>
          </div>
        ) : (
          // Sign In View
          <div className="max-w-sm mx-auto">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Sign in to W3
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Access your workspace
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {providers.map(provider => {
                const isConnected = connectedProviders[provider.id] !== null;
                const brandColors = {
                  google: 'bg-blue-500 hover:bg-blue-600',
                  github: 'bg-gray-700 hover:bg-gray-800',
                  x: 'bg-black hover:bg-gray-900',
                  linkedin: 'bg-blue-700 hover:bg-blue-800',
                  facebook: 'bg-blue-600 hover:bg-blue-700',
                };

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleLogin(provider.id)}
                    className={`w-full px-4 py-2 rounded-lg font-medium flex items-center gap-3 text-white text-sm transition-all ${
                      brandColors[provider.id as keyof typeof brandColors]
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{provider.emoji}</span>
                    <span className="flex-1 text-left">Sign in with {provider.name}</span>
                    {isConnected && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        ✓ Connected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>💡 Tip:</strong> You can connect multiple providers to your account. Only the first connected provider will be used for sign-in. Some providers may require API keys configured in Secret Manager.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
