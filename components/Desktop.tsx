'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';
import Taskbar from './Taskbar';
import StartMenu from './StartMenu';
import DraggableWindow from './DraggableWindow';
import BrowserWindow from './BrowserWindow';
import NotesWindow from './NotesWindow';
import FileExplorerWindow from './FileExplorerWindow';
import TerminalWindow from './TerminalWindow';
import SettingsWindow from './SettingsWindow';
import AIAssistantWindow from './AIAssistantWindow';
import OAuthLoginWindow from './OAuthLoginWindow';
import AgentMarketplace from './AgentMarketplace';
import AgentChat from './AgentChat';
import GlobalVoiceButton from './GlobalVoiceButton';
import DesktopIcons from './DesktopIcons';
import GmailWindow from './GmailWindow';
import DriveWindow from './DriveWindow';
import XTwitterWindow from './XTwitterWindow';
import LinkedInWindow from './LinkedInWindow';

export default function Desktop() {
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    updateWindowState,
  } = useWindowManager();

  const handleAppLaunch = useCallback((appType: string, options?: any) => {
    switch (appType) {
      case 'browser':
        openWindow('browser', options?.title || 'Web Browser', options);
        break;
      case 'file-explorer':
        openWindow('file-explorer', 'File Explorer');
        break;
      case 'notepad':
        openWindow('notepad', 'Notepad');
        break;
      case 'terminal':
        openWindow('terminal', 'Terminal');
        break;
      case 'settings':
        openWindow('settings', 'Settings');
        break;
      case 'ai-assistant':
        openWindow('ai-assistant', 'W3 AI Assistant');
        break;
      case 'oauth-login':
        openWindow('oauth-login', 'Sign In');
        break;
      case 'agent-store':
        openWindow('agent-store', 'AI Agent Store');
        break;
      case 'gmail':
        openWindow('gmail', '📧 Gmail');
        break;
      case 'sheets':
        openWindow('browser', '📊 Google Sheets', { url: 'https://sheets.google.com' });
        break;
      case 'drive':
        openWindow('drive', '📁 Google Drive');
        break;
      case 'docs':
        openWindow('browser', '📝 Google Docs', { url: 'https://docs.google.com' });
        break;
      case 'x':
        openWindow('x-app', '🐦 X / Twitter');
        break;
      case 'linkedin':
        openWindow('linkedin-app', '💼 LinkedIn');
        break;
      case 'facebook':
        openWindow('browser', '📘 Facebook', { url: 'https://facebook.com' });
        break;
      case 'github':
        openWindow('browser', '🐙 GitHub', { url: 'https://github.com' });
        break;
      case 'agent-chat':
        if (options?.agentId && options?.agentName) {
          openWindow('agent-chat', options.agentName, options);
        }
        break;
    }
  }, [openWindow]);

  // Listen for w3-open-app events from terminal and voice commands
  useEffect(() => {
    const handleOpenApp = (e: any) => {
      const { detail } = e;
      switch (detail.type) {
        case 'terminal':
          handleAppLaunch('terminal');
          break;
        case 'notepad':
          handleAppLaunch('notepad');
          break;
        case 'browser':
          handleAppLaunch('browser', { url: detail.url, title: detail.title });
          break;
        case 'file-explorer':
          handleAppLaunch('file-explorer');
          break;
        case 'settings':
          handleAppLaunch('settings');
          break;
        case 'ai-assistant':
          handleAppLaunch('ai-assistant');
          break;
        case 'agent-store':
          handleAppLaunch('agent-store');
          break;
        case 'agent-chat':
          handleAppLaunch('agent-chat', { agentId: detail.agentId, agentName: detail.title });
          break;
        case 'gmail':
          handleAppLaunch('gmail');
          break;
        case 'drive':
          handleAppLaunch('drive');
          break;
        case 'x':
          handleAppLaunch('x');
          break;
        case 'linkedin':
          handleAppLaunch('linkedin');
          break;
      }
    };

    window.addEventListener('w3-open-app', handleOpenApp);
    return () => window.removeEventListener('w3-open-app', handleOpenApp);
  }, [handleAppLaunch]);

  const handleWindowClick = useCallback((windowId: string) => {
    focusWindow(windowId);
    const window = windows.find((w) => w.id === windowId);
    if (window?.isMinimized) {
      minimizeWindow(windowId);
    }
  }, [focusWindow, minimizeWindow, windows]);

  const renderWindowContent = (window: any) => {
    switch (window.appType) {
      case 'browser':
        return (
          <BrowserWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
            url={window.state?.url}
          />
        );
      case 'notepad':
        return (
          <NotesWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'file-explorer':
        return (
          <FileExplorerWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'terminal':
        return (
          <TerminalWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'settings':
        return (
          <SettingsWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'ai-assistant':
        return (
          <AIAssistantWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'oauth-login':
        return (
          <OAuthLoginWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
            onClose={() => closeWindow(window.id)}
          />
        );
      case 'agent-store':
        return (
          <AgentMarketplace
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
            onOpenAgent={(agentId, agentName, agentIcon, agentDescription) => {
              handleAppLaunch('agent-chat', { agentId, agentName, agentIcon, agentDescription });
            }}
          />
        );
      case 'agent-chat':
        return (
          <AgentChat
            windowId={window.id}
            agentId={window.state?.agentId || ''}
            agentName={window.state?.agentName || ''}
            agentIcon={window.state?.agentIcon || '🤖'}
            agentDescription={window.state?.agentDescription || ''}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'gmail':
        return (
          <GmailWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'drive':
        return (
          <DriveWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'x-app':
        return (
          <XTwitterWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      case 'linkedin-app':
        return (
          <LinkedInWindow
            windowId={window.id}
            onStateChange={(newState) => updateWindowState(window.id, newState)}
          />
        );
      default:
        return <div className="p-6">Unknown app type</div>;
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-900 dark:to-blue-950 overflow-hidden">
      {/* Desktop Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Desktop Icons */}
      <DesktopIcons onOpenApp={handleAppLaunch} />

      {/* Windows Container */}
      <div className="relative w-full h-full">
        {windows.map((window) => (
          <DraggableWindow
            key={window.id}
            window={window}
            onClose={() => closeWindow(window.id)}
            onMinimize={() => minimizeWindow(window.id)}
            onMaximize={() => maximizeWindow(window.id)}
            onMove={(x, y) => moveWindow(window.id, x, y)}
            onResize={(width, height) => resizeWindow(window.id, width, height)}
            onFocus={() => focusWindow(window.id)}
          >
            {renderWindowContent(window)}
          </DraggableWindow>
        ))}
      </div>

      {/* Taskbar */}
      <Taskbar
        isStartMenuOpen={isStartMenuOpen}
        onStartMenuToggle={() => setIsStartMenuOpen(!isStartMenuOpen)}
        windows={windows}
        onWindowClick={handleWindowClick}
        onWindowMinimize={minimizeWindow}
      />

      {/* Start Menu */}
      <StartMenu
        isOpen={isStartMenuOpen}
        onClose={() => setIsStartMenuOpen(false)}
        onAppLaunch={handleAppLaunch}
      />

      {/* Global Voice Button */}
      <GlobalVoiceButton
        onOpenTerminal={() => handleAppLaunch('terminal')}
        onOpenNotepad={() => handleAppLaunch('notepad')}
        onOpenPythonCoder={() => handleAppLaunch('agent-store')}
        onCommand={(cmd: string) => {
          if (cmd.startsWith('execute:')) {
            // Send to terminal
            const terminal = windows.find(w => w.appType === 'terminal');
            if (terminal) {
              focusWindow(terminal.id);
            } else {
              handleAppLaunch('terminal');
            }
          } else if (cmd.startsWith('message:')) {
            // Send to AI Assistant
            const ai = windows.find(w => w.appType === 'ai-assistant');
            if (ai) {
              focusWindow(ai.id);
            } else {
              handleAppLaunch('ai-assistant');
            }
          }
        }}
      />
    </div>
  );
}
