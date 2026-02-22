"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface InteractiveBrowserProps {
  url: string | null;
  onLoad: () => void;
  onError: (error: string) => void;
}

export default function InteractiveBrowser({
  url,
  onLoad,
  onError,
}: InteractiveBrowserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!url) return;

    setIsConnecting(true);
    setIsReady(false);

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/browser-ws`;

    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'ready':
            console.log('Browser session ready:', msg.sessionId);
            setIsConnecting(false);
            setIsReady(true);
            // Navigate to URL
            ws.send(JSON.stringify({ type: 'navigate', url }));
            setTimeout(() => onLoad(), 2000);
            break;

          case 'frame':
            // Draw screenshot to canvas
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = `data:image/jpeg;base64,${msg.data}`;
            break;

          case 'error':
            console.error('Browser error:', msg.message);
            onError(msg.message);
            break;
        }
      } catch (err) {
        console.error('Message parsing error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      onError('WebSocket connection failed');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnecting(false);
      setIsReady(false);
    };

    return () => {
      ws.close();
    };
  }, [url, onLoad, onError]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ws.send(JSON.stringify({ type: 'click', x, y }));

    // Focus the hidden input to capture keyboard
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    e.preventDefault();

    // Handle special keys
    if (e.key.length === 1) {
      // Regular character
      ws.send(JSON.stringify({ type: 'type', text: e.key }));
    } else {
      // Special key (Enter, Backspace, etc.)
      let key = e.key;
      if (key === ' ') key = 'Space';
      ws.send(JSON.stringify({ type: 'keypress', key }));
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    e.preventDefault();
    ws.send(JSON.stringify({ type: 'scroll', deltaY: e.deltaY }));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ws.send(JSON.stringify({ type: 'mousemove', x, y }));
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50 rounded-full animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Starting interactive browser... (10-15 seconds)
            </p>
          </div>
        </div>
      )}

      {isReady && (
        <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
          🟢 Live - Click & Type!
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1280}
        height={800}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        className="w-full h-auto border border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Hidden input to capture keyboard events */}
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 pointer-events-none"
        autoComplete="off"
      />

      {!url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            Enter a URL above to start
          </p>
        </div>
      )}
    </div>
  );
}
