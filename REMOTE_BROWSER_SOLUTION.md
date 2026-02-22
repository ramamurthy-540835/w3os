# Remote Browser Solution for Interactive Website Embedding

## Problem
Need to embed and interact with ANY website (Gmail, Grok, X.com, etc.) even when they block iframes.

## Solution Architecture

### Approach: Remote Browser with Input Streaming

Run a headless browser on the server, stream the display to users, and capture their inputs.

## Implementation Options

### Option 1: noVNC + Xvfb + Chromium (Full VNC Solution)

**Tech Stack:**
- Xvfb: Virtual display server
- x11vnc: VNC server for X display
- noVNC: Browser-based VNC client
- Chromium: Browser engine

**Architecture:**
```
User Browser → noVNC Client → WebSocket → VNC Server → Chromium (on Xvfb)
                                            ↓
                                    Captures display
                                    Sends mouse/keyboard
```

**Pros:**
- Full browser interaction
- Works with ANY website
- Mature technology

**Cons:**
- High resource usage (each session needs isolated browser)
- Complex deployment
- Need session management

**Implementation:**

1. **Update Dockerfile:**
```dockerfile
FROM node:22

# Install X11, VNC, and Chromium
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    chromium \
    websockify \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC
RUN git clone https://github.com/novnc/noVNC.git /opt/novnc

WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Start script that launches Xvfb, VNC, and Next.js
CMD ["./start-remote-browser.sh"]
```

2. **Create start script:**
```bash
#!/bin/bash
# Start virtual display
Xvfb :99 -screen 0 1280x800x24 &
export DISPLAY=:99

# Start window manager
fluxbox &

# Start VNC server
x11vnc -display :99 -nopw -forever -shared &

# Start websockify for noVNC
websockify --web /opt/novnc 6080 localhost:5900 &

# Start Next.js app
npm start
```

3. **Create API to spawn browser sessions:**
```typescript
// app/api/browser-session/route.ts
export async function POST() {
  const sessionId = generateUniqueId();

  // Launch Chromium in the X display
  exec(`DISPLAY=:99 chromium --app=${url} --user-data-dir=/tmp/session-${sessionId}`);

  return Response.json({
    sessionId,
    vncUrl: `wss://your-app.run.app/novnc/${sessionId}`
  });
}
```

**Resource Requirements:**
- Memory: 2GB+ per session
- CPU: 1-2 cores per session
- Storage: Ephemeral sessions

---

### Option 2: Puppeteer + Canvas Streaming (Custom Solution)

**Tech Stack:**
- Puppeteer: Browser automation
- WebSocket: Real-time communication
- Canvas: Render screenshots continuously

**Architecture:**
```
User Browser → WebSocket → Server → Puppeteer → Website
    ↓                        ↓
  Canvas ← Screenshot Stream ←
  Mouse/Keyboard → Input Events →
```

**Pros:**
- More control over browser
- Can optimize for specific use cases
- Easier to deploy than VNC

**Cons:**
- Need to build custom streaming
- Higher latency than VNC
- Need to handle all input types manually

**Implementation:**

1. **WebSocket Server:**
```typescript
// app/api/browser-ws/route.ts
import { Server } from 'ws';
import puppeteer from 'puppeteer';

const wss = new Server({ port: 8080 });

wss.on('connection', async (ws) => {
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Handle incoming messages (URL to navigate, mouse clicks, etc.)
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    switch(msg.type) {
      case 'navigate':
        await page.goto(msg.url);
        break;
      case 'click':
        await page.mouse.click(msg.x, msg.y);
        break;
      case 'type':
        await page.keyboard.type(msg.text);
        break;
    }
  });

  // Stream screenshots at 10 FPS
  const streamInterval = setInterval(async () => {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    ws.send(JSON.stringify({
      type: 'frame',
      data: screenshot
    }));
  }, 100); // 10 FPS

  ws.on('close', () => {
    clearInterval(streamInterval);
    browser.close();
  });
});
```

2. **Client Side:**
```typescript
// components/RemoteBrowser.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function RemoteBrowser({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('wss://your-app.run.app/browser-ws');
    wsRef.current = ws;

    ws.onopen = () => {
      // Request to load URL
      ws.send(JSON.stringify({ type: 'navigate', url }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'frame') {
        // Draw screenshot to canvas
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = new Image();
        img.onload = () => ctx?.drawImage(img, 0, 0);
        img.src = `data:image/png;base64,${msg.data}`;
      }
    };

    return () => ws.close();
  }, [url]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    wsRef.current?.send(JSON.stringify({
      type: 'click',
      x,
      y
    }));
  };

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={800}
      onClick={handleClick}
      className="border border-gray-300"
    />
  );
}
```

---

### Option 3: Use Existing Service (Fastest to Deploy)

Use a third-party service that already solves this:

**Services:**
1. **Browserless.io** - Managed browser API
   - $50-200/month
   - REST API + WebSocket
   - Handles scaling

2. **Apify** - Browser automation platform
   - Pay per use
   - Pre-built actors

3. **BrowserStack** - Testing platform with Live view
   - Expensive but fully managed

**Integration Example (Browserless.io):**
```typescript
// Use their WebSocket API
const ws = new WebSocket('wss://chrome.browserless.io?token=YOUR_TOKEN');

ws.send(JSON.stringify({
  type: 'goto',
  url: 'https://gmail.com'
}));

// They stream back screenshots and handle inputs
```

---

## Recommended Approach

**For MVP / Testing:**
- Use **Option 3** (Browserless.io or similar service)
- Fastest to implement
- No infrastructure complexity

**For Production:**
- Build **Option 2** (Puppeteer + Canvas Streaming)
- More control
- Lower per-request cost at scale
- Deploy on Cloud Run with higher memory (4GB+)

**For Enterprise:**
- Implement **Option 1** (Full VNC solution)
- Best performance
- Most mature
- Requires dedicated infrastructure

---

## Cost & Performance Considerations

| Approach | Cost/Session | Latency | Concurrent Users | Complexity |
|----------|--------------|---------|------------------|------------|
| Static Screenshot | $0.001 | 10-15s | Unlimited | Low |
| Canvas Streaming | $0.05 | 100-200ms | 50-100 | Medium |
| VNC Solution | $0.10 | 50-100ms | 20-50 | High |
| Browserless.io | $0.20 | 100ms | Based on plan | Low |

---

## Next Steps

1. **Decide on approach** based on budget and requirements
2. **If building custom**: Start with Option 2 (Puppeteer + Canvas)
3. **If using service**: Sign up for Browserless.io trial
4. **Update Cloud Run**: Increase memory to 2GB+, timeout to 60s+

Let me know which approach you want to implement and I can help build it!
