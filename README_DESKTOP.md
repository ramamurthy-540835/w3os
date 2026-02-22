# 🖥️ W3 Desktop - AI-Powered OS Emulator

A complete Windows-like desktop environment built with Next.js, React, and Tailwind CSS. Full-featured with draggable windows, file explorer, terminal, text editor, settings panel, and Claude AI integration.

## 🎬 Quick Demo

```bash
npm run dev
# Open http://localhost:3000 in your browser
```

**What you'll see:**
- Beautiful blue gradient desktop
- Taskbar at the bottom with ⊞ Start button
- Click Start → Select an app
- Drag windows around, resize, minimize, maximize
- 6 fully-functional applications

## 📊 What's Included

### 🌐 **Web Browser**
- URL input with auto-protocol detection
- Back/Forward/Refresh buttons
- Embedded web viewing
- Interactive browsing support

### 📁 **File Explorer**
- Navigate directories
- View file types with icons
- File size and date information
- Breadcrumb navigation
- Mock filesystem with sample files

### 📝 **Text Editor (Notepad)**
- Full-featured text editor
- Save status indicator
- Real-time unsaved changes warning
- Clean, distraction-free interface

### ⌨️ **Terminal Emulator**
- 8+ built-in commands
- Command history (Arrow Up/Down)
- Classic green-on-black look
- Perfect for system info and commands

### ⚙️ **Settings Panel**
- 3 tabbed interface (General, Appearance, System)
- Theme selection (Light/Dark/Auto)
- System information display
- Service status monitoring

### 🤖 **Claude AI Assistant**
- Beautiful chat interface
- Message history with timestamps
- API key configuration
- Ready for Anthropic Claude API integration
- Built-in demo responses

## 🎮 How to Use

### Start the Application
```bash
npm install  # (if needed)
npm run dev
```

### Launch Apps
1. Click the **⊞ Start** button (bottom-left)
2. Click any app icon
3. Drag, resize, minimize, maximize as desired

### Window Controls
- **Drag**: Click title bar and drag to move
- **Resize**: Drag the bottom-right corner
- **Minimize**: Click `-` button
- **Maximize**: Click `□` button
- **Close**: Click `✕` button

### Keyboard Shortcuts
- **Terminal**: Arrow Up/Down for history, Ctrl+Enter to execute
- **AI Chat**: Ctrl+Enter to send message
- **Browser**: Enter in address bar to navigate

## 📁 Project Structure

```
/home/appadmin/w3/
├── components/              # React components
│   ├── Desktop.tsx         # Main orchestrator
│   ├── DraggableWindow.tsx # Window container
│   ├── Taskbar.tsx         # Bottom taskbar
│   ├── StartMenu.tsx       # App launcher
│   ├── BrowserWindow.tsx   # Web browser
│   ├── FileExplorerWindow.tsx
│   ├── NotesWindow.tsx
│   ├── TerminalWindow.tsx
│   ├── SettingsWindow.tsx
│   └── AIAssistantWindow.tsx
├── hooks/
│   └── useWindowManager.ts  # Window state logic
├── lib/
│   └── types.ts            # TypeScript definitions
├── app/
│   ├── page.tsx            # Home page (Desktop)
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── QUICK_START.md          # Quick start guide
├── DESKTOP_UI_GUIDE.md     # Complete guide
├── FEATURES_SHOWCASE.md    # Feature details
└── README_DESKTOP.md       # This file
```

## 🚀 Quick Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

## 🎨 Design Features

- ✅ Fully draggable and resizable windows
- ✅ Modern gradient UI with blue theme
- ✅ Complete dark mode support
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Professional window management
- ✅ Keyboard shortcuts
- ✅ Beautiful typography

## 💻 Technology Stack

- **Framework**: Next.js 16.1.6
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Browser Control**: Playwright 1.50.0
- **Real-time**: WebSockets (ws)

## 📈 Build Information

- **Build Time**: ~4 seconds
- **Production Size**: ~200-270MB (optimized with multi-stage Docker)
- **TypeScript**: ✅ Full type checking
- **ESLint**: ✅ Code quality maintained

## 🔧 Advanced Features

### Adding New Applications

Create a new component in `/components/YourApp.tsx`:

```tsx
interface YourAppWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function YourAppWindow({ windowId, onStateChange }: YourAppWindowProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Your app UI */}
    </div>
  );
}
```

Then add to `Desktop.tsx` and `types.ts`.

### Claude API Integration

To enable real AI responses:

1. Get API key from https://console.anthropic.com
2. Open AI Assistant app
3. Click settings (⚙️)
4. Paste your API key
5. Start chatting!

## 📚 Documentation

- **QUICK_START.md** - Get running in 2 minutes
- **DESKTOP_UI_GUIDE.md** - Complete technical guide
- **FEATURES_SHOWCASE.md** - Feature demonstrations

## 🎯 Roadmap

### Completed ✅
- Window management system
- Draggable/resizable windows
- Desktop environment
- 6 integrated applications
- Dark mode support
- Responsive design

### Planned 📋
- Persistent localStorage
- Google Workspace integration
- Real file system access
- Advanced terminal
- More applications
- Settings persistence

## 🐛 Troubleshooting

### Build Issues
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Dev Server Won't Start
```bash
pkill -f "node server.js"
rm -f .next/dev/lock
npm run dev
```

### Windows Not Responding
- Check browser console for errors
- Try refreshing the page
- Clear browser cache

## 📞 Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

## 🎓 What You Can Learn

This project demonstrates:
- ✅ Advanced React hooks and state management
- ✅ Complex component composition
- ✅ Window/UI management patterns
- ✅ TypeScript for type safety
- ✅ Modern CSS with Tailwind
- ✅ Next.js best practices
- ✅ Responsive design principles
- ✅ Dark mode implementation

## 📝 Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code style enforcement
- **Tailwind**: Utility-first CSS
- **Responsive**: Mobile to desktop
- **Accessible**: WCAG guidelines

## 🤝 Contributing

To extend this project:

1. Create feature branch
2. Add new components to `/components/`
3. Update types in `/lib/types.ts`
4. Test with `npm run build`
5. Submit your improvements

## 📄 License

Built with ❤️ using Next.js, React, and Tailwind CSS

---

## 🎉 Getting Started Right Now

```bash
# 1. Start the server
npm run dev

# 2. Open browser
# http://localhost:3000

# 3. Click ⊞ Start button

# 4. Select your app

# 5. Enjoy!
```

**Happy coding! 🚀**
