"use client";

import type { HistoryPanelProps } from "@/lib/types";

export default function HistoryPanel({
  history,
  onURLClick,
}: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
        No history yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700">
        History
      </h2>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {history.map((item, index) => (
            <li key={`${item.url}-${item.timestamp}`}>
              <button
                onClick={() => onURLClick(item.url)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:bg-zinc-100 dark:focus:bg-zinc-800"
              >
                <p className="text-sm text-zinc-900 dark:text-zinc-50 truncate">
                  {item.title || item.url}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {new URL(item.url).hostname}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
