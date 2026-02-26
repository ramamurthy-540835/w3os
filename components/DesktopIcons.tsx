'use client';

interface DesktopIconsProps {
  onOpenApp: (appType: string, options?: any) => void;
}

export default function DesktopIcons({ onOpenApp }: DesktopIconsProps) {
  const icons = [
    { title: 'Terminal', icon: '⌨️', appType: 'terminal' },
    { title: 'File Explorer', icon: '📁', appType: 'file-explorer' },
    { title: 'Notepad', icon: '📝', appType: 'notepad' },
    { title: 'AI Assistant', icon: '🤖', appType: 'ai-assistant' },
    { title: 'Prompt Craft', icon: '🎯', appType: 'prompt-craft' },
    { title: 'Model Gallery', icon: '🤗', appType: 'model-gallery' },
    { title: 'SQL Editor', icon: '🗄️', appType: 'sql-editor' },
    { title: 'PySpark', icon: '⚡', appType: 'pyspark' },
    { title: 'Web Browser', icon: '🌐', appType: 'browser' },
    { title: 'AI Agents', icon: '🧠', appType: 'agent-store' },
  ];

  const handleDoubleClick = (appType: string) => {
    onOpenApp(appType);
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <div
        className="relative w-full h-full pointer-events-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '0px',
          padding: '20px',
          alignContent: 'start',
        }}
      >
        {icons.map((item, index) => (
          <div
            key={index}
            onDoubleClick={() => handleDoubleClick(item.appType)}
            style={{
              width: '80px',
              height: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                fontSize: '32px',
                marginBottom: '4px',
              }}
            >
              {item.icon}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'white',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                width: '100%',
                wordWrap: 'break-word',
              }}
            >
              {item.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
