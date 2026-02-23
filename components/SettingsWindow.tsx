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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
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
          <div className="p-6 space-y-6">
            {/* API Keys */}
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                🔑 API Keys Configuration
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                API keys are managed via Google Secret Manager. Contact admin to update.
              </p>
              {loadingAdmin ? (
                <div className="text-center py-4 text-zinc-500">Loading...</div>
              ) : adminConfig?.apis ? (
                <div className="space-y-3">
                  {Object.entries(adminConfig.apis).map(([key, config]: [string, any]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {key === 'gemini' && '🤖 Gemini API Key'}
                          {key === 'serpapi' && '🔍 SerpAPI Key'}
                          {key === 'youtube' && '📺 YouTube API Key'}
                        </div>
                        {config.preview && (
                          <div className="text-xs text-zinc-500 font-mono mt-1">
                            {config.preview}
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded text-xs font-semibold ${
                        config.configured
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {config.configured ? '✅ Configured' : '❌ Missing'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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

            {/* OAuth Configuration Status */}
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                🔐 OAuth Providers Status
              </h3>
              {adminConfig?.oauth ? (
                <div className="space-y-2">
                  {Object.entries(adminConfig.oauth).map(([key, config]: [string, any]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-sm"
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-50 capitalize">{key}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        config.configured
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                      }`}>
                        {config.configured ? '✅ Configured' : '⚪ Not Configured'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <span className="font-semibold">Note:</span> Sensitive configuration like API keys cannot be edited from this interface for security reasons. Update through Google Cloud Console or environment variables.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
