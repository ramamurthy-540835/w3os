"use client";

import { useState, useEffect } from "react";
import type { URLHistoryItem } from "@/lib/types";

const VISITED_URLS_KEY = "VISITED_URLS";
const MAX_HISTORY = 10;

interface UseURLHistoryReturn {
  history: URLHistoryItem[];
  currentIndex: number;
  addURL: (url: string) => void;
  goBack: () => string | null;
  goForward: () => string | null;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  clearHistory: () => void;
}

export function useURLHistory(): UseURLHistoryReturn {
  const [history, setHistory] = useState<URLHistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load from localStorage on mount (hydration-safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(VISITED_URLS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setHistory(parsed);
          setCurrentIndex(parsed.length - 1);
        }
      } catch (error) {
        console.error("Failed to load URL history:", error);
      }
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage whenever history changes
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        localStorage.setItem(VISITED_URLS_KEY, JSON.stringify(history));
      } catch (error) {
        console.error("Failed to save URL history:", error);
      }
    }
  }, [history, isHydrated]);

  const addURL = (url: string): void => {
    // Don't add if it's the same as the current URL (avoid duplicates at top)
    if (history.length > 0 && history[history.length - 1].url === url) {
      return;
    }

    // Remove any items after current index (user can't go forward from here)
    const newHistory = history.slice(0, currentIndex + 1);

    // Add new URL
    const newItem: URLHistoryItem = {
      url,
      timestamp: Date.now(),
    };

    newHistory.push(newItem);

    // Keep only last MAX_HISTORY items
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const goBack = (): string | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex].url;
    }
    return null;
  };

  const goForward = (): string | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex].url;
    }
    return null;
  };

  const canGoBack = (): boolean => currentIndex > 0;
  const canGoForward = (): boolean => currentIndex < history.length - 1;

  const clearHistory = (): void => {
    setHistory([]);
    setCurrentIndex(-1);
  };

  return {
    history,
    currentIndex,
    addURL,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    clearHistory,
  };
}
