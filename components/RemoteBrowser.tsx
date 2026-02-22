'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface RemoteBrowserProps {
  url: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string, sessionId?: string) => void;
}

interface TypeDialogState {
  isOpen: boolean;
  inputText: string;
  submitAction?: 'type' | 'type-enter' | 'type-tab';
}

export default function RemoteBrowser({ url, onLoad, onError, onStatusChange }: RemoteBrowserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasLoadedRef = useRef<boolean>(false);
  const [isFocused, setIsFocused] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ready' | 'error' | 'disconnected'>('connecting');
  const [sessionId, setSessionId] = useState<string>('');
  const [typeDialog, setTypeDialog] = useState<TypeDialogState>({ isOpen: false, inputText: '' });
  const [keyboardMode, setKeyboardMode] = useState(false);

  // Update status helper
  const updateStatus = useCallback((newStatus: typeof status, newSessionId?: string) => {
    setStatus(newStatus);
    if (newSessionId) setSessionId(newSessionId);
    onStatusChange?.(newStatus, newSessionId);
  }, [onStatusChange]);

  // Stable send function
  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Handle text typing with optional key press
  const handleTypeText = useCallback((submitAction?: 'type' | 'type-enter' | 'type-tab') => {
    if (typeDialog.inputText.trim()) {
      // Send type action
      sendMessage({ type: 'type', text: typeDialog.inputText });

      // Send optional key press after typing
      if (submitAction === 'type-enter') {
        setTimeout(() => sendMessage({ type: 'keydown', key: 'Enter' }), 150);
        setTimeout(() => sendMessage({ type: 'keyup', key: 'Enter' }), 200);
      } else if (submitAction === 'type-tab') {
        setTimeout(() => sendMessage({ type: 'keydown', key: 'Tab' }), 150);
        setTimeout(() => sendMessage({ type: 'keyup', key: 'Tab' }), 200);
      }

      setTypeDialog({ isOpen: false, inputText: '', submitAction: undefined });
    }
  }, [typeDialog.inputText, sendMessage]);

  // Draw frame to canvas
  const drawFrame = useCallback((base64Data: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = (err) => {
      console.error('[RemoteBrowser] Image load error:', err);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!url) return;

    hasLoadedRef.current = false;
    updateStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/browser-ws`;
    console.log('[RemoteBrowser] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[RemoteBrowser] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'ready':
            console.log('[RemoteBrowser] Session ready:', message.sessionId);
            updateStatus('connected', message.sessionId);
            // Send navigation request
            ws.send(JSON.stringify({ type: 'navigate', url }));
            break;

          case 'session':
            updateStatus('connected', message.sessionId);
            break;

          case 'frame':
            drawFrame(message.data);
            if (!hasLoadedRef.current) {
              hasLoadedRef.current = true;
              updateStatus('ready');
              onLoad?.();
              console.log('[RemoteBrowser] First frame received, ready for interaction');
            }
            break;

          case 'error':
            console.error('[RemoteBrowser] Server error:', message.message);
            onError?.(message.message);
            updateStatus('error');
            break;

          case 'navigated':
            console.log('[RemoteBrowser] Navigation complete:', message.url);
            break;
        }
      } catch (e) {
        console.error('[RemoteBrowser] Parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[RemoteBrowser] WebSocket error:', error);
      updateStatus('error');
      onError?.('WebSocket connection failed');
    };

    ws.onclose = (event) => {
      console.log('[RemoteBrowser] WebSocket closed:', event.code, event.reason);
      updateStatus('disconnected');
    };

    return () => {
      console.log('[RemoteBrowser] Cleanup: closing WebSocket');
      ws.close();
      wsRef.current = null;
    };
    // ⚠️ NO 'status' in dependency array! Only stable refs and props.
  }, [url, onLoad, onError, updateStatus, drawFrame, sendMessage]);

  // Native event listeners for keyboard (NOT React handlers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardMode) return;

      e.preventDefault();
      e.stopPropagation();

      const specialKeys: Record<string, string> = {
        'Enter': 'Enter', 'Tab': 'Tab', 'Backspace': 'Backspace',
        'Escape': 'Escape', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
        'Delete': 'Delete', 'Home': 'Home', 'End': 'End',
      };

      // For special keys, send press/release sequence
      if (specialKeys[e.key]) {
        sendMessage({ type: 'keydown', key: specialKeys[e.key] });
      } else if (e.key.length === 1) {
        // For printable characters, send type action
        sendMessage({ type: 'type', text: e.key });
      }

      console.log(`[RemoteBrowser] Key: ${e.key}, keyboardMode: ${keyboardMode}`);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!keyboardMode) return;

      e.preventDefault();
      e.stopPropagation();

      const specialKeys: Record<string, string> = {
        'Enter': 'Enter', 'Tab': 'Tab', 'Backspace': 'Backspace',
        'Escape': 'Escape', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
        'Delete': 'Delete', 'Home': 'Home', 'End': 'End',
      };

      if (specialKeys[e.key]) {
        sendMessage({ type: 'keyup', key: specialKeys[e.key] });
      }
    };

    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);

    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendMessage, keyboardMode]);

  // Native event listeners for mouse (NOT React handlers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getScaledCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Scale from CSS display size to canvas pixel buffer size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      // Clamp to canvas bounds
      return {
        x: Math.max(0, Math.min(x, canvas.width - 1)),
        y: Math.max(0, Math.min(y, canvas.height - 1)),
      };
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      canvas.focus(); // Always re-focus canvas on click
      const { x, y } = getScaledCoords(e);
      sendMessage({ type: 'click', x, y, button: e.button === 2 ? 'right' : 'left' });
      console.log(`[RemoteBrowser] Click at (${x}, ${y})`);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const { x, y } = getScaledCoords(e);
      sendMessage({ type: 'mousedown', x, y, button: e.button === 2 ? 'right' : 'left' });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      const { x, y } = getScaledCoords(e);
      sendMessage({ type: 'mouseup', x, y, button: e.button === 2 ? 'right' : 'left' });
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Don't preventDefault on mousemove (no need, and avoids perf issues)
      const { x, y } = getScaledCoords(e);
      sendMessage({ type: 'mousemove', x, y });
    };

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      const { x, y } = getScaledCoords(e);
      sendMessage({ type: 'dblclick', x, y });
    };

    // CRITICAL: { passive: false } for wheel to allow preventDefault
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      sendMessage({ type: 'scroll', x: 0, y: 0, deltaX: e.deltaX, deltaY: e.deltaY });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Block right-click menu
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('dblclick', handleDblClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Focus tracking
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('dblclick', handleDblClick);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
    };
  }, [sendMessage]);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Status indicator */}
      <div className={`absolute top-4 right-4 z-10 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
        status === 'ready' ? 'bg-green-500 text-white' :
        status === 'connected' ? 'bg-blue-500 text-white' :
        status === 'error' ? 'bg-red-500 text-white' :
        status === 'disconnected' ? 'bg-gray-500 text-white' :
        'bg-yellow-500 text-black'
      }`}>
        {status === 'ready' ? '🟢 Live — Click & Type!' :
         status === 'connected' ? '🔵 Loading page...' :
         status === 'error' ? '🔴 Connection Error' :
         status === 'disconnected' ? '⚫ Disconnected' :
         '🟡 Connecting...'}
      </div>

      {/* Session ID (for debugging) */}
      {sessionId && (
        <div className="absolute top-16 right-4 z-10 px-3 py-1 rounded bg-gray-800 text-white text-xs font-mono">
          {sessionId}
        </div>
      )}

      {/* Browser Toolbar - Type Text & Keyboard Mode */}
      {status === 'ready' && (
        <div style={{position:'absolute', top:'16px', right:'16px', zIndex:20, display:'flex', gap:'8px'}}>
          <button
            onClick={() => setKeyboardMode(!keyboardMode)}
            style={{
              padding: '8px 16px',
              background: keyboardMode ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title={keyboardMode ? 'Keyboard mode ON - All keystrokes forwarded' : 'Keyboard mode OFF - Click Type Text button'}
          >
            ⌨️ {keyboardMode ? 'Keyboard: ON' : 'Keyboard: OFF'}
          </button>
          <button
            onClick={() => setTypeDialog({ ...typeDialog, isOpen: true })}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            title="Click to type text into the page"
          >
            ✎ Type Text
          </button>
        </div>
      )}

      {/* Type Dialog Modal */}
      {typeDialog.isOpen && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }} onClick={() => setTypeDialog({ isOpen: false, inputText: '' })}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>
              Type Text
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Enter the text you want to type:
            </p>
            <textarea
              value={typeDialog.inputText}
              onChange={(e) => setTypeDialog({ ...typeDialog, inputText: e.target.value })}
              placeholder="Type here..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTypeText();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                marginBottom: '16px',
                boxSizing: 'border-box',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTypeDialog({ isOpen: false, inputText: '', submitAction: undefined })}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleTypeText('type')}
                disabled={!typeDialog.inputText.trim()}
                style={{
                  padding: '8px 16px',
                  background: typeDialog.inputText.trim() ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: typeDialog.inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Type
              </button>
              <button
                onClick={() => handleTypeText('type-enter')}
                disabled={!typeDialog.inputText.trim()}
                style={{
                  padding: '8px 16px',
                  background: typeDialog.inputText.trim() ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: typeDialog.inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Type + Enter
              </button>
              <button
                onClick={() => handleTypeText('type-tab')}
                disabled={!typeDialog.inputText.trim()}
                style={{
                  padding: '8px 16px',
                  background: typeDialog.inputText.trim() ? '#8b5cf6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: typeDialog.inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Type + Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas - EXACT dimensions matching remote viewport */}
      <canvas
        ref={canvasRef}
        width={1280}         // MUST match remote viewport pixel width
        height={800}         // MUST match remote viewport pixel height
        tabIndex={0}         // CRITICAL: Makes canvas focusable
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: 'auto',
          aspectRatio: '1280 / 800',
          cursor: 'default',
          outline: 'none',
          border: keyboardMode ? '4px solid #10b981' : (isFocused ? '4px solid #2563eb' : '4px solid #d1d5db'),
          boxShadow: keyboardMode ? '0 0 0 4px rgba(16, 185, 129, 0.3)' : (isFocused ? '0 0 0 4px rgba(37, 99, 235, 0.3)' : 'none'),
          borderRadius: '8px',
          display: 'block',
          backgroundColor: '#1a1a1a',
          transition: 'all 0.2s',
        }}
      />

      {/* Focus hint overlay */}
      {!isFocused && status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(37, 99, 235, 0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'pulse 2s infinite',
        }}>
          💡 Click the canvas to start typing
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center space-y-2 max-w-2xl">
        <div className="inline-block px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-bold">
            💡 CLICK THE CANVAS FIRST, then you can type, click, and scroll!
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            The <strong>blue glow</strong> around the canvas means it's focused and ready for input.
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Use <strong>Keyboard: ON/OFF</strong> button to toggle automatic keystroke forwarding, or use <strong>Type Text</strong> for text input.
          </p>
        </div>

        {status === 'ready' && (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✅ Connected! You can now type in forms, click buttons, scroll, and navigate normally.
          </p>
        )}
        {status === 'connecting' && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Starting remote browser... this may take 10-15 seconds
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Failed to connect. Please refresh the page and try again.
          </p>
        )}
      </div>
    </div>
  );
}
