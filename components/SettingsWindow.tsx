'use client';

import { useState, useEffect } from 'react';

interface SettingsWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  animationsEnabled: boolean;
  compactMode: boolean;
  windowSnapToGrid: boolean;
}

interface Provider {
  id: string;
  name: string;
  connected: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function SettingsWindow({
  windowId,
  onStateChange,
}: SettingsWindowProps) {
  const [settings, setSettings] = useState<Settings>({
    theme: 'auto',
    soundEnabled: true,
    animationsEnabled: true,
    compactMode: false,
    windowSnapToGrid: true,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'system' | 'integrations' | 'admin'>('general');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingSecret, setSavingSecret] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminConfig();
    }
  }, [activeTab]);

  const loadAdminConfig = async () => {
    setLoadingAdmin(true);
    try {
      const response = await fetch('/api/admin/config');
      const data = await response.json();
      setAdminConfig(data);
    } catch (error) {
      console.error('Failed to load admin config:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onStateChange(newSettings);
  };

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      if (data.providers) {
        const providerList = Object.entries(data.providers).map(([id, info]: [string, any]) => ({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          connected: info.connected,
        }));
        setProviders(providerList);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleConnect = async (providerId: string) => {
    try {
      // Open OAuth in popup
      window.open(
        `/api/auth/${providerId}`,
        `${providerId}-login`,
        'width=500,height=600,menubar=no,toolbar=no,location=yes'
      );

      // Listen for oauth-success message
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'oauth-success') {
          // Reload providers list
          setTimeout(() => loadProviders(), 500);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

      // Cleanup after 10 minutes
      setTimeout(() => window.removeEventListener('message', handleMessage), 10 * 60 * 1000);
    } catch (error) {
      console.error(`Failed to connect to ${providerId}:`, error);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      loadProviders();
    } catch (error) {
      console.error(`Failed to disconnect from ${providerId}:`, error);
    }
  };

  const getProviderIcon = (id: string) => {
    const icons: Record<string, string> = {
      google: '🔵',
      x: '𝕏',
      github: '🐙',
      linkedin: '💼',
      facebook: '👍',
    };
    return icons[id] || '🔗';
  };

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const saveSecret = async (key: string, value: string) => {
    if (!value || value.trim().length === 0) {
      addToast('error', 'Value cannot be empty');
      return;
    }

    setSavingSecret(true);
    try {
      const response = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast('error', `Failed to update: ${data.error}`);
        return;
      }

      addToast('success', `✅ ${key} updated. Takes full effect after redeployment.`);
      setEditingSecret(null);
      setEditValue('');
      loadAdminConfig();
    } catch (error: any) {
      addToast('error', `Error: ${error.message}`);
    } finally {
      setSavingSecret(false);
    }
  };

  const testOAuthConnection = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const response = await fetch(`/api/auth/test/${provider}`);
      const data = await response.json();
      setTestResults((prev) => ({ ...prev, [provider]: data }));

      if (data.valid) {
        addToast('success', `✅ ${provider} connection verified`);
      } else {
        addToast('error', `❌ ${provider} test failed: ${data.error}`);
      }
    } catch (error: any) {
      addToast('error', `Error testing ${provider}: ${error.message}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const copyToClipboard = (text: string, provider: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', `📋 Copied ${provider} redirect URI`);
  };

  const REDIRECT_URIS = {
    google: 'https://w3-1035117862188.us-central1.run.app/api/auth/google/callback',
    github: 'https://w3-1035117862188.us-central1.run.app/api/auth/github/callback',
    x: 'https://w3-1035117862188.us-central1.run.app/api/auth/x/callback',
    linkedin: 'https://w3-1035117862188.us-central1.run.app/api/auth/linkedin/callback',
    facebook: 'https://w3-1035117862188.us-central1.run.app/api/auth/facebook/callback',
  };

  const SettingRow = ({ label, description, children }: any) => (
    <div className="border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <div>
        <div className="font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{description}</div>
      </div>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange }: any) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 relative">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 overflow-auto">
        {(['general', 'appearance', 'system', 'integrations', 'admin'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-blue-500'
                : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {tab === 'general' && '⚙️ General'}
            {tab === 'appearance' && '🎨 Appearance'}
            {tab === 'system' && '💻 System'}
            {tab === 'integrations' && '🔗 Integrations'}
            {tab === 'admin' && '🔐 Admin'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'general' && (
          <div>
            <SettingRow
              label="Sound"
              description="Enable/disable system sounds and notifications"
            >
              <Toggle
                checked={settings.soundEnabled}
                onChange={(value: boolean) => updateSetting('soundEnabled', value)}
              />
            </SettingRow>
            <SettingRow
              label="Animations"
              description="Enable/disable window and UI animations"
            >
              <Toggle
                checked={settings.animationsEnabled}
                onChange={(value: boolean) => updateSetting('animationsEnabled', value)}
              />
            </SettingRow>
            <SettingRow
              label="Window Snap to Grid"
              description="Automatically snap windows to grid when dragging"
            >
              <Toggle
                checked={settings.windowSnapToGrid}
                onChange={(value: boolean) => updateSetting('windowSnapToGrid', value)}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div>
            <SettingRow
              label="Theme"
              description="Choose your preferred color scheme"
            >
              <div className="flex gap-3">
                {(['light', 'dark', 'auto'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('theme', theme)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      settings.theme === theme
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {theme === 'light' && '☀️ Light'}
                    {theme === 'dark' && '🌙 Dark'}
                    {theme === 'auto' && '🔄 Auto'}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              label="Compact Mode"
              description="Reduce spacing and font sizes for more content"
            >
              <Toggle
                checked={settings.compactMode}
                onChange={(value: boolean) => updateSetting('compactMode', value)}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'system' && (
          <div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  💻 System Information
                </h3>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300 font-mono">
                  <div>OS: W3 Desktop v1.0</div>
                  <div>Platform: Cloud-Based (Next.js 16)</div>
                  <div>Architecture: x86_64</div>
                  <div>Node: v22.11</div>
                  <div>Uptime: 24h 15m 32s</div>
                  <div>Memory: 2GB RAM</div>
                  <div>Storage: 50GB</div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  ✅ System Status
                </h3>
                <div className="space-y-2 text-sm text-green-800 dark:text-green-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    All systems operational
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Network connected
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Services running normally
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                  🔧 Advanced
                </h3>
                <button className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-200 text-sm font-medium">
                  Reset Settings to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                🔗 Connected Services
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Connect your accounts to access Gmail, Drive, GitHub, and more. These integrations help W3 AI assist you better.
              </p>
            </div>

            {loadingProviders ? (
              <div className="flex justify-center py-8">
                <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
              </div>
            ) : (
              <div className="grid gap-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {provider.name}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {provider.connected
                            ? '✅ Connected'
                            : '⭕ Not connected'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        provider.connected
                          ? handleDisconnect(provider.id)
                          : handleConnect(provider.id)
                      }
                      className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                        provider.connected
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      {provider.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                💡 About Integrations
              </h4>
              <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                <li>• Google: Access Gmail, Drive, Sheets, Docs</li>
                <li>• GitHub: Clone repos, create issues, manage code</li>
                <li>• X (Twitter): Read tweets, post updates</li>
                <li>• LinkedIn: Share posts, view profiles</li>
                <li>• Facebook: Access page feeds</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="p-6 space-y-6 overflow-auto">
            {/* API Keys */}
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                🔑 API Keys Configuration
              </h3>
              {loadingAdmin ? (
                <div className="text-center py-4 text-zinc-500">Loading...</div>
              ) : adminConfig?.apis ? (
                <div className="space-y-3">
                  {Object.entries(adminConfig.apis).map(([key, config]: [string, any]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {key === 'gemini' && '🤖 Gemini API Key'}
                          {key === 'serpapi' && '🔍 SerpAPI Key'}
                          {key === 'youtube' && '📺 YouTube API Key'}
                        </div>
                        {editingSecret === key ? (
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Paste new API key"
                            className="mt-2 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-xs font-mono text-zinc-900 dark:text-zinc-50"
                          />
                        ) : (
                          config.preview && (
                            <div className="text-xs text-zinc-500 font-mono mt-1">
                              {config.preview}
                            </div>
                          )
                        )}
                      </div>
                      {editingSecret === key ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSecret(key.toUpperCase(), editValue)}
                            disabled={savingSecret}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded font-medium hover:bg-green-600 disabled:opacity-50"
                          >
                            {savingSecret ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingSecret(null)}
                            className="px-3 py-1 bg-zinc-400 text-white text-xs rounded font-medium hover:bg-zinc-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                            config.configured
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {config.configured ? '✅ Set' : '❌ Missing'}
                          </div>
                          <button
                            onClick={() => {
                              setEditingSecret(key);
                              setEditValue('');
                            }}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded font-medium hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* OAuth Credentials */}
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                🔐 OAuth Credentials
              </h3>
              <div className="space-y-4">
                {adminConfig?.oauth && Object.entries(adminConfig.oauth).map(([provider, config]: [string, any]) => {
                  const clientIdKey = `${provider.toUpperCase()}_CLIENT_ID`;
                  const clientSecretKey = `${provider.toUpperCase()}_CLIENT_SECRET`;
                  const redirectUri = REDIRECT_URIS[provider as keyof typeof REDIRECT_URIS];

                  return (
                    <div
                      key={provider}
                      className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getProviderIcon(provider)}</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50 capitalize">
                            {provider}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            config.needsSetup
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : config.configured
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                          }`}>
                            {config.needsSetup ? '⚠️ Needs Setup' : config.configured ? '✅ Configured' : '⚪ Missing'}
                          </div>
                          <button
                            onClick={() => testOAuthConnection(provider)}
                            disabled={testingProvider === provider}
                            className="px-3 py-1 bg-purple-500 text-white text-xs rounded font-medium hover:bg-purple-600 disabled:opacity-50"
                          >
                            {testingProvider === provider ? '...' : '🔍 Test'}
                          </button>
                        </div>
                      </div>

                      {/* Client ID Field */}
                      <div className="mb-3 p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold mb-2">Client ID</div>
                        {editingSecret === clientIdKey ? (
                          <div className="flex gap-2">
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Client ID"
                              className="flex-1 px-2 py-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-xs font-mono text-zinc-900 dark:text-zinc-50"
                            />
                            <button
                              onClick={() => saveSecret(clientIdKey, editValue)}
                              disabled={savingSecret}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded font-medium hover:bg-green-600 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSecret(null)}
                              className="px-2 py-1 bg-zinc-400 text-white text-xs rounded font-medium hover:bg-zinc-500"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex-1 truncate">
                              {config.preview || 'Not set'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingSecret(clientIdKey);
                                setEditValue('');
                              }}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-medium hover:bg-blue-600"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Client Secret Field */}
                      <div className="mb-3 p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold mb-2">Client Secret</div>
                        {editingSecret === clientSecretKey ? (
                          <div className="flex gap-2">
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Client Secret"
                              type="password"
                              className="flex-1 px-2 py-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-xs font-mono text-zinc-900 dark:text-zinc-50"
                            />
                            <button
                              onClick={() => saveSecret(clientSecretKey, editValue)}
                              disabled={savingSecret}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded font-medium hover:bg-green-600 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSecret(null)}
                              className="px-2 py-1 bg-zinc-400 text-white text-xs rounded font-medium hover:bg-zinc-500"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex-1 truncate">
                              ••••••••
                            </span>
                            <button
                              onClick={() => {
                                setEditingSecret(clientSecretKey);
                                setEditValue('');
                              }}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-medium hover:bg-blue-600"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Redirect URI */}
                      {redirectUri && (
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold mb-2">Redirect URI</div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-zinc-900 dark:text-zinc-50 font-mono break-all bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                              {redirectUri}
                            </code>
                            <button
                              onClick={() => copyToClipboard(redirectUri, provider)}
                              className="px-2 py-1 bg-zinc-500 text-white text-xs rounded font-medium hover:bg-zinc-600 whitespace-nowrap"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Test Result */}
                      {testResults[provider] && (
                        <div className={`mt-3 p-3 rounded text-xs ${
                          testResults[provider].valid
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                        }`}>
                          {testResults[provider].valid ? '✅ Connection working' : `❌ ${testResults[provider].error}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Info */}
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                📊 System Information
              </h3>
              {adminConfig?.system ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Cloud Run URL</div>
                        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-50 break-all mt-1">
                          {adminConfig.system.url}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">AI Model</div>
                        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-50 mt-1">
                          {adminConfig.system.model}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Storage Bucket</div>
                        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-50 mt-1">
                          {adminConfig.system.bucket}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Project</div>
                        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-50 mt-1">
                          {adminConfig.system.project}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
