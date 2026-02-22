"use client";

import { useState } from "react";
import { validateAndSanitizeURL } from "@/lib/urlValidator";

interface URLInputProps {
  onLoad: (url: string) => void;
  currentURL?: string;
  isLoading?: boolean;
}

export default function URLInput({
  onLoad,
  currentURL = "",
  isLoading = false,
}: URLInputProps) {
  const [input, setInput] = useState<string>(currentURL);
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const result = validateAndSanitizeURL(input);

    if (!result.valid) {
      setError(result.error || "Invalid URL");
      return;
    }

    if (result.url) {
      onLoad(result.url);
      setInput(result.url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter URL (e.g., https://example.com)"
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Load"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </form>
  );
}
