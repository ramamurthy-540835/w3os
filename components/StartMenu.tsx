'use client';

import { useState } from 'react';
import { AppLauncherItem } from '@/lib/types';

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAppLaunch: (appType: string, options?: any) => void;
}

interface Category {
  id: string;
  icon: string;
  title: string;
  expanded: boolean;
  items: AppLauncherItem[];
}

export default function StartMenu({ isOpen, onClose, onAppLaunch }: StartMenuProps) {
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['system', 'ai-tools'])
  );
  const [toast, setToast] = useState<string | null>(null);

  const categories: Category[] = [
    {
      id: 'system',
      icon: '🖥️',
      title: 'System',
      expanded: expandedCategories.has('system'),
      items: [
        { id: 'terminal', title: 'Terminal', icon: '⌨️', appType: 'terminal' },
        { id: 'files', title: 'File Explorer', icon: '📁', appType: 'file-explorer' },
        { id: 'notepad', title: 'Notepad', icon: '📝', appType: 'notepad' },
        { id: 'settings', title: 'Settings', icon: '⚙️', appType: 'settings' },
      ],
    },
    {
      id: 'ai-tools',
      icon: '🤖',
      title: 'AI Tools',
      expanded: expandedCategories.has('ai-tools'),
      items: [
        { id: 'ai-assistant', title: 'W3 AI Assistant', icon: '🤖', appType: 'ai-assistant' },
        { id: 'agent-store', title: 'AI Agent Store', icon: '🧠', appType: 'agent-store' },
        { id: 'python-coder', title: 'Python Coder', icon: '🐍', appType: 'agent-chat', agentId: 'python-coder' },
        { id: 'doc-writer', title: 'Document Writer', icon: '📝', appType: 'agent-chat', agentId: 'doc-writer' },
        { id: 'web-researcher', title: 'Web Researcher', icon: '🔍', appType: 'agent-chat', agentId: 'web-researcher' },
      ],
    },
    {
      id: 'connected-apps',
      icon: '🌐',
      title: 'Connected Apps',
      expanded: expandedCategories.has('connected-apps'),
      items: [
        { id: 'gmail', title: 'Gmail', icon: '📧', appType: 'browser', url: 'https://mail.google.com' },
        { id: 'sheets', title: 'Google Sheets', icon: '📊', appType: 'browser', url: 'https://sheets.google.com' },
        { id: 'drive', title: 'Google Drive', icon: '📁', appType: 'browser', url: 'https://drive.google.com' },
        { id: 'docs', title: 'Google Docs', icon: '📝', appType: 'browser', url: 'https://docs.google.com' },
        { id: 'x', title: 'X / Twitter', icon: '🐦', appType: 'browser', url: 'https://x.com' },
        { id: 'linkedin', title: 'LinkedIn', icon: '💼', appType: 'browser', url: 'https://linkedin.com' },
        { id: 'facebook', title: 'Facebook', icon: '📘', appType: 'browser', url: 'https://facebook.com' },
        { id: 'github', title: 'GitHub', icon: '🐙', appType: 'browser', url: 'https://github.com' },
      ],
    },
    {
      id: 'account',
      icon: '🔐',
      title: 'Account',
      expanded: expandedCategories.has('account'),
      items: [
        { id: 'oauth-login', title: 'Sign In', icon: '🔑', appType: 'oauth-login' },
        { id: 'profile', title: 'Profile', icon: '👤', appType: 'settings' },
      ],
    },
  ];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAppClick = (app: any) => {
    // Open all apps in W3 ecosystem
    if (app.appType === 'browser' && app.url) {
      // Open apps (Gmail, X, LinkedIn, etc) in W3 Browser
      window.dispatchEvent(new CustomEvent('w3-open-app', {
        detail: { type: 'browser', url: app.url, title: app.title }
      }));
      // Show toast notification
      setToast(`Opening ${app.title}...`);
      setTimeout(() => setToast(null), 3000);
    } else if (app.appType === 'agent-chat') {
      onAppLaunch('agent-chat', { agentId: app.agentId, agentName: app.title });
    } else {
      onAppLaunch(app.appType);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0" onClick={onClose} style={{ zIndex: 999 }}>
        <div
          className="absolute bottom-16 left-0 w-80 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 1000 }}
        >
          {/* Start Menu Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 px-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🖥️</span>
              <h2 className="text-white font-bold text-lg">W3 Cloud OS</h2>
            </div>
            <p className="text-blue-100 text-sm">Launch your applications</p>
          </div>

          {/* Categories */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700 max-h-96 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
                    {category.title}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {category.expanded ? '▼' : '▶'}
                  </span>
                </button>

                {/* Category Items */}
                {category.expanded && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/30">
                    {category.items.map((app) => (
                      <button
                        key={app.id}
                        onMouseEnter={() => setHoveredApp(app.id)}
                        onMouseLeave={() => setHoveredApp(null)}
                        onClick={() => handleAppClick(app)}
                        className={`w-full px-8 py-2 flex items-center gap-3 text-left transition-colors ${
                          hoveredApp === app.id
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{app.icon}</span>
                        <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-50">
                          {app.title}
                        </span>
                        {hoveredApp === app.id && (
                          <span className="text-blue-500 dark:text-blue-400 text-xs">→</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-3 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Powered by Google Cloud | Mastech Digital
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10000,
            fontSize: '14px',
            fontWeight: '500',
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
