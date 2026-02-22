'use client';

import { useState, useRef, ReactNode } from 'react';
import { DesktopWindow } from '@/lib/types';

interface DraggableWindowProps {
  window: DesktopWindow;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onFocus: () => void;
}

export default function DraggableWindow({
  window,
  children,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
  onFocus,
}: DraggableWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y,
    });
    onFocus();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      onMove(
        e.clientX - dragOffset.x,
        e.clientY - dragOffset.y
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: window.size.width,
      h: window.size.height,
    });
    onFocus();
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(300, resizeStart.w + deltaX);
      const newHeight = Math.max(200, resizeStart.h + deltaY);
      onResize(newWidth, newHeight);
    }
  };

  const handleResizeUp = () => {
    setIsResizing(false);
  };

  if (window.isMinimized) {
    return null;
  }

  const style = {
    position: 'absolute' as const,
    left: window.isMaximized ? '0px' : `${window.position.x}px`,
    top: window.isMaximized ? '0px' : `${window.position.y}px`,
    width: window.isMaximized ? '100%' : `${window.size.width}px`,
    height: window.isMaximized ? '100%' : `${window.size.height}px`,
    zIndex: window.zIndex,
  };

  return (
    <div
      ref={windowRef}
      style={{...style, display:'flex', flexDirection:'column'}}
      className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-lg rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', height:'36px', background:'linear-gradient(135deg, #1e40af, #3b82f6)', color:'white', borderRadius:'8px 8px 0 0', cursor:'grab', flexShrink:0}}
      >
        <span style={{fontSize:'13px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1}}>{window.title}</span>
        <div style={{display:'flex', gap:'4px', flexShrink:0, marginLeft:'8px'}} data-no-drag>
          <button
            onClick={onMinimize}
            style={{width:'28px', height:'28px', border:'none', borderRadius:'4px', background:'rgba(255,255,255,0.15)', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            title="Minimize"
          >
            −
          </button>
          <button
            onClick={onMaximize}
            style={{width:'28px', height:'28px', border:'none', borderRadius:'4px', background:'rgba(255,255,255,0.15)', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            title="Maximize"
          >
            □
          </button>
          <button
            onClick={onClose}
            style={{width:'28px', height:'28px', border:'none', borderRadius:'4px', background:'rgba(255,255,255,0.15)', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}
            onMouseEnter={e=>e.currentTarget.style.background='#ef4444'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1, overflow:'hidden'}}>{children}</div>

      {/* Resize Handle */}
      {!window.isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          onMouseMove={handleResizeMove}
          onMouseUp={handleResizeUp}
          onMouseLeave={handleResizeUp}
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize"
        />
      )}
    </div>
  );
}
