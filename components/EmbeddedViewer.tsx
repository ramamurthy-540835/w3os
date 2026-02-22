"use client";

import { useState, useEffect, useRef } from "react";
import type { EmbeddedViewerProps } from "@/lib/types";

export default function EmbeddedViewer({
  url,
  isLoading,
  error,
  onLoad,
  onError,
}: EmbeddedViewerProps) {
  const [frameError, setFrameError] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if this is a screenshot URL
  const isScreenshot = url?.includes('/api/screenshot');

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    if (isLoading) {
      // Set a longer timeout for screenshots (20s), shorter for iframes (5s)
      const timeoutDuration = isScreenshot ? 20000 : 5000;
      timeoutRef.current = setTimeout(() => {
        onError(
          isScreenshot
            ? "Screenshot timeout - the site may be too slow to load or unavailable"
            : "Site failed to load - it may block embedding or require external resources that are blocked by CORS"
        );
      }, timeoutDuration);
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, onError, isScreenshot]);

  const handleIframeLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setFrameError("");
    onLoad();
  };

  const handleIframeError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const errorMsg =
      "This website does not allow embedding. Open in new tab.";
    setFrameError(errorMsg);
    onError(errorMsg);
  };

  // Extract original URL if this is a proxy/screenshot URL
  const getOriginalUrl = (proxyUrl: string | null): string | null => {
    if (!proxyUrl) return null;
    if (proxyUrl.includes('/api/proxy?url=') || proxyUrl.includes('/api/screenshot?url=')) {
      const urlParam = new URLSearchParams(proxyUrl.split('?')[1]).get('url');
      return urlParam || proxyUrl;
    }
    return proxyUrl;
  };

  const originalUrl = getOriginalUrl(url);

  return (
    <div className="w-full flex-1 flex flex-col gap-4">
      {/* Error message */}
      {(error || frameError) && (
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-200 font-semibold">
            {error || frameError}
          </p>
          <p className="text-red-700 dark:text-red-300 text-sm">
            Many modern websites (Google, Cursor, GitHub, etc.) cannot be embedded due to:
          </p>
          <ul className="text-red-700 dark:text-red-300 text-sm list-disc list-inside space-y-1">
            <li>Security headers that block iframe embedding</li>
            <li>External resources blocked by CORS policies</li>
            <li>JavaScript that requires full browser context</li>
          </ul>
          {originalUrl && (
            <button
              onClick={() => {
                const hostname = new URL(originalUrl).hostname || 'Website';
                window.dispatchEvent(new CustomEvent('w3-open-app', {
                  detail: { type: 'browser', url: originalUrl, title: hostname }
                }));
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 dark:bg-red-600 text-white rounded-lg font-medium hover:bg-red-800 dark:hover:bg-red-700 transition-colors w-fit"
            >
              Open {new URL(originalUrl).hostname} in W3 Browser →
            </button>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50 rounded-full animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-400">
              {isScreenshot ? "Capturing screenshot... (this may take 10-20 seconds)" : "Loading..."}
            </p>
          </div>
        </div>
      )}

      {/* Content container */}
      {url && !error && (
        <div className="relative w-full flex-1 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
          {isScreenshot ? (
            // Screenshot mode - display as image
            <div className="w-full h-full overflow-auto p-4 bg-zinc-100 dark:bg-zinc-800">
              <img
                key={url}
                src={url}
                alt="Website Screenshot"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                className="w-full h-auto rounded shadow-lg border border-zinc-300 dark:border-zinc-600"
                style={{ minHeight: "500px", objectFit: "contain" }}
              />
            </div>
          ) : (
            // Regular iframe mode
            <iframe
              key={url}
              src={url}
              title="Embedded URL Viewer"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full"
              style={{ minHeight: "500px" }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      )}

      {/* Empty state */}
      {!url && !error && (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900">
          <p className="text-center text-zinc-500 dark:text-zinc-400">
            Enter a URL above to view it here
          </p>
        </div>
      )}
    </div>
  );
}
