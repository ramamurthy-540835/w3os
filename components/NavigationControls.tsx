"use client";

import { useState } from "react";
import type { NavigationControlsProps } from "@/lib/types";

export default function NavigationControls({
  onBack,
  onForward,
  onReload,
  onClearHistory,
  canGoBack,
  canGoForward,
}: NavigationControlsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    onClearHistory();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        title="Go back"
        className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Go back"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        onClick={onForward}
        disabled={!canGoForward}
        title="Go forward"
        className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Go forward"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <button
        onClick={onReload}
        title="Reload"
        className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        aria-label="Reload"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      <div className="border-l border-zinc-300 dark:border-zinc-600 h-6" />

      <div className="relative">
        <button
          onClick={handleClearClick}
          title="Clear history"
          className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
        >
          Clear History
        </button>

        {showClearConfirm && (
          <div className="absolute right-0 mt-2 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg z-50 whitespace-nowrap">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
              Clear history?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmClear}
                className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 text-sm rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
