'use client';

import { useState, useCallback } from 'react';
import RemoteBrowser from './RemoteBrowser';

interface BrowserWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
  url?: string;
}

export default function BrowserWindow({
  windowId,
  onStateChange,
  url,
}: BrowserWindowProps) {
  const [currentURL, setCurrentURL] = useState<string | null>(url || null);
  const [urlInput, setUrlInput] = useState(url || 'https://www.google.com');
  const [isLoading, setIsLoading] = useState(url ? true : false);

  const handleLoad = useCallback(() => {
    let url = urlInput;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setCurrentURL(url);
    setIsLoading(true);
    onStateChange({ currentURL: url });
  }, [urlInput, onStateChange]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Browser Toolbar */}
      <div className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 p-3 flex gap-2 items-center flex-shrink-0">
        <div className="flex gap-1">
          <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded disabled:opacity-50" disabled>
            ←
          </button>
          <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded disabled:opacity-50" disabled>
            →
          </button>
          <button
            onClick={() => setIsLoading(true)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            ⟳
          </button>
        </div>

        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter URL..."
          className="flex-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-black dark:text-white text-sm"
        />

        <button
          onClick={handleLoad}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm"
        >
          Go
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 overflow-hidden">
        {currentURL ? (
          <RemoteBrowser
            url={currentURL}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <div className="text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Web Browser
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Enter a URL above to get started
              </p>
              <button
                onClick={() => setUrlInput('https://www.google.com')}
                className="text-blue-500 hover:underline text-sm"
              >
                or visit Google
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
      )}
    </div>
  );
}
