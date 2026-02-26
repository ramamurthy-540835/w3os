'use client';

import { useState, useCallback } from 'react';
import { DesktopWindow } from '@/lib/types';

export function useWindowManager() {
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1);

  const openWindow = useCallback((appType: DesktopWindow['appType'], title: string, state?: Record<string, any>) => {
    // Default sizes for each window type (reduced ~25%)
    const defaultSizes: Record<string, { width: number; height: number }> = {
      terminal: { width: 550, height: 380 },
      'ai-assistant': { width: 420, height: 480 },
      'file-explorer': { width: 480, height: 360 },
      notepad: { width: 500, height: 400 },
      settings: { width: 440, height: 400 },
      'agent-store': { width: 900, height: 600 },
      'sql-editor': { width: 1000, height: 640 },
      'pyspark': { width: 900, height: 600 },
      'model-gallery': { width: 1000, height: 660 },
      'prompt-craft': { width: 950, height: 680 },
      'oauth-login': { width: 340, height: 440 },
      browser: { width: 700, height: 480 },
      'agent-chat': { width: 450, height: 460 },
      gmail: { width: 550, height: 450 },
      drive: { width: 500, height: 400 },
      'x-app': { width: 450, height: 460 },
      'linkedin-app': { width: 450, height: 460 },
    };

    const size = defaultSizes[appType] || { width: 700, height: 500 };

    // Cascade new windows
    const windowOffset = (windows.length * 30) % 200;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const left = Math.max(50, (screenWidth - size.width) / 2 + windowOffset);
    const top = Math.max(50, (screenHeight - size.height) / 2 + windowOffset);

    const newWindow: DesktopWindow = {
      id: `${appType}-${Date.now()}`,
      title,
      appType,
      isMinimized: false,
      isMaximized: false,
      position: { x: left, y: top },
      size,
      zIndex: nextZIndex,
      state,
    };

    setWindows((prev) => [...prev, newWindow]);
    setNextZIndex((prev) => prev + 1);
    return newWindow.id;
  }, [windows.length, nextZIndex]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          if (w.isMaximized) {
            // Restore to previous size
            return { ...w, isMaximized: false };
          } else {
            // Maximize to fill screen minus taskbar
            return { ...w, isMaximized: true, position: { x: 0, y: 0 }, size: { width: typeof window !== 'undefined' ? window.innerWidth : 1024, height: (typeof window !== 'undefined' ? window.innerHeight : 768) - 48 } };
          }
        }
        return w;
      })
    );
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const window = prev.find((w) => w.id === id);
      if (!window) return prev;

      return prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex } : w));
    });
    setNextZIndex((prev) => prev + 1);
  }, [nextZIndex]);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position: { x, y } } : w))
    );
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size: { width, height } } : w))
    );
  }, []);

  const updateWindowState = useCallback((id: string, newState: Record<string, any>) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, state: { ...w.state, ...newState } } : w))
    );
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    updateWindowState,
  };
}
