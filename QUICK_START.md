# W3 Desktop - Quick Start Guide

## 🚀 Getting Started in 2 Minutes

### Start the Server

```bash
npm run dev
```

**Output should show:**
```
> w3@0.1.0 dev
> node server.js
```

Open your browser to: **http://localhost:3000**

---

## 👆 First Steps

### 1. **See the Desktop**
You'll see a beautiful blue gradient desktop with a taskbar at the bottom.

### 2. **Click the Start Button**
Look for the **⊞ Start** button at the bottom-left of the screen.

### 3. **Launch an App**
Choose from:
- 🌐 **Browser** - Web browser
- 🤖 **Claude AI** - AI Assistant
- 📁 **File Explorer** - File manager
- 📝 **Notepad** - Text editor
- ⌨️ **Terminal** - Command line
- ⚙️ **Settings** - System preferences

### 4. **Interact with Windows**
- **Drag**: Click title bar and drag to move
- **Resize**: Drag bottom-right corner
- **Minimize**: Click `-` button
- **Maximize**: Click `□` button
- **Close**: Click `✕` button

---

## 🎮 Try These Actions

### In the Browser
1. Type a URL (e.g., `google.com`)
2. Click "Go" button
3. Interact with the website

### In the Terminal
1. Type `help` and press Enter
2. Try `echo Hello World`
3. Try `system` to see system info
4. Use Arrow Up/Down for command history

### In the AI Assistant
1. Click the settings ⚙️ to add your Claude API key (optional)
2. Type a message
3. Press Ctrl+Enter or click send
4. Watch the AI respond

### In File Explorer
1. Double-click a folder to navigate
2. Click breadcrumbs to go back
3. See file sizes and dates

### In Notepad
1. Start typing
2. Click Save to mark as saved
3. See unsaved indicator

### In Settings
1. Click different tabs (General, Appearance, System)
2. Toggle switches to change settings
3. View system information

---

## ⚙️ Configuration

### Claude API Integration
To enable the AI Assistant with real Claude responses:

1. Get your API key from https://console.anthropic.com
2. Open the AI Assistant app (🤖)
3. Click the settings icon (⚙️)
4. Paste your API key
5. Click Save

### Build for Production

```bash
npm run build
npm run start
```

---

## 📱 Browser Compatibility

Works best on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires WebSocket support for interactive features.

---

## 🎨 Customization

### Dark Mode
Dark mode is supported automatically based on your system preferences.

### Window Sizes
Windows open at 800x600 with offset positioning.

### Taskbar
Always visible at the bottom, shows:
- Start button
- Open windows
- Minimized window indicators
- System clock

---

## 🔧 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send message (AI) |
| `Ctrl+Enter` | Execute command (Terminal) |
| `Enter` | Navigate (Browser address bar) |
| `Arrow Up/Down` | Command history (Terminal) |

---

## 📊 What's Running

- **Framework**: Next.js 16 with Turbopack
- **UI Library**: React 19 with Tailwind CSS
- **Language**: TypeScript
- **Build Status**: ✅ Builds successfully

```bash
# Check build status
npm run build
```

---

## 💡 Tips & Tricks

1. **Multiple Windows**: Open multiple instances of the same app
2. **Stacking**: Drag windows to layer them
3. **Minimize All**: Close windows by clicking the X on taskbar
4. **Terminal History**: Use arrow keys to navigate command history
5. **File Preview**: File explorer shows file types with icons

---

## 🐛 If Something Goes Wrong

### Build Fails
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Dev Server Won't Start
```bash
# Kill existing process
pkill -f "node server.js"
# Remove lock
rm -f .next/dev/lock
# Restart
npm run dev
```

### Windows Not Dragging
- Make sure you're clicking the **title bar** (blue area at top)
- Not the content area

---

## 📚 Learn More

See **DESKTOP_UI_GUIDE.md** for:
- Complete component documentation
- Architecture details
- How to extend with new apps
- Advanced features

---

## 🎉 You're All Set!

Enjoy your W3 Desktop experience. Have fun exploring! 🚀

Questions? Check the detailed guide or explore the code in `/components/`.
