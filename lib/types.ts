export interface URLHistoryItem {
  url: string;
  timestamp: number;
  title?: string;
}

export interface EmbeddedViewerProps {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
  onError: (error: string) => void;
}

export interface NavigationControlsProps {
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onClearHistory: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface HistoryPanelProps {
  history: URLHistoryItem[];
  onURLClick: (url: string) => void;
}

export interface DesktopWindow {
  id: string;
  title: string;
  appType: 'browser' | 'notepad' | 'file-explorer' | 'terminal' | 'settings' | 'ai-assistant' | 'oauth-login' | 'agent-store' | 'agent-chat';
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  state?: Record<string, any>; // App-specific state (e.g., current URL for browser)
}

export interface AppLauncherItem {
  id: string;
  title: string;
  icon: string;
  appType: string; // Can be any app type, including virtual ones like 'gmail', 'sheets', 'drive', 'docs'
  url?: string; // Optional URL for browser apps
  agentId?: string; // Optional agent ID for agent-chat apps
  agentDescription?: string; // Optional agent description
}
