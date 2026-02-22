const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { BrowserSession } = require('./lib/browser-session');
const pty = require('node-pty');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '8080', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active browser sessions
const sessions = new Map();

// Store session states for persistence
const sessionStates = new Map();

// Store active terminal sessions
const terminalSessions = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // WebSocket server for browser sessions
  const wss = new WebSocketServer({ server, path: '/browser-ws' });

  wss.on('connection', async (ws, req) => {
    const sessionId = Math.random().toString(36).substring(7);
    console.log(`[WebSocket] New connection: ${sessionId}`);

    let session = null;

    try {
      // Create and initialize browser session
      session = new BrowserSession(sessionId);
      await session.initialize();
      sessions.set(sessionId, session);

      // Restore previous session state if exists
      const previousState = sessionStates.get(sessionId);
      if (previousState) {
        await session.restoreState(previousState);
      }

      // Send session ready message
      ws.send(JSON.stringify({ type: 'ready', sessionId }));

      // Set up frame streaming callback
      session.onFrame((frameData) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'frame', data: frameData }));
        }
      });

      // Handle incoming messages from client
      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());

          switch (msg.type) {
            case 'navigate':
              console.log(`[${sessionId}] Navigate: ${msg.url}`);
              await session.navigate(msg.url);
              // Notify client that navigation completed
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'navigated', url: msg.url }));
              }
              break;

            case 'click':
              await session.click(msg.x, msg.y, msg.button || 'left');
              break;

            case 'dblclick':
              await session.doubleClick(msg.x, msg.y);
              break;

            case 'mousedown':
              await session.mouseDown(msg.x, msg.y, msg.button || 'left');
              break;

            case 'mouseup':
              await session.mouseUp(msg.x, msg.y, msg.button || 'left');
              break;

            case 'keydown':
              await session.keyPress(msg.key, msg.modifiers || {});
              break;

            case 'keyup':
              await session.keyRelease(msg.key, msg.modifiers || {});
              break;

            case 'scroll':
              await session.scroll(msg.deltaX || 0, msg.deltaY || 0);
              break;

            case 'mousemove':
              await session.mouseMove(msg.x, msg.y);
              break;

            case 'type':
              await session.type(msg.text || '');
              break;

            default:
              console.warn(`[${sessionId}] Unknown message type: ${msg.type}`);
          }
        } catch (err) {
          console.error(`[${sessionId}] Message handling error:`, err.message);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        }
      });

      // Handle WebSocket errors
      ws.on('error', (error) => {
        console.error(`[${sessionId}] WebSocket error:`, error.message);
      });

      // Cleanup on disconnect
      ws.on('close', async () => {
        console.log(`[${sessionId}] WebSocket closed, saving state...`);

        if (session) {
          // Save session state for potential reconnection
          const state = await session.saveState();
          if (state) {
            sessionStates.set(sessionId, state);
            // Clean up old states after 1 hour
            setTimeout(() => sessionStates.delete(sessionId), 3600000);
          }

          // Close browser session
          await session.close();
          sessions.delete(sessionId);
        }
      });

    } catch (err) {
      console.error(`[${sessionId}] Session initialization error:`, err.message);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Failed to initialize browser: ${err.message}`
        }));
      }
      ws.close();
    }
  });

  // WebSocket server for terminal sessions
  const terminalWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url, true);

    if (parsedUrl.pathname === '/terminal-ws') {
      terminalWss.handleUpgrade(request, socket, head, (ws) => {
        const sessionId = Math.random().toString(36).substring(7);
        console.log(`[Terminal] New connection: ${sessionId}`);

        try {
          // Determine shell
          const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
          const shellArgs = [];

          // Spawn PTY with bash shell
          const ptyProcess = pty.spawn(shell, shellArgs, {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: process.env.HOME || '/home',
            env: {
              ...process.env,
              TERM: 'xterm-256color',
            },
          });

          terminalSessions.set(sessionId, ptyProcess);

          // Send initial ready message
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'ready', sessionId }));
          }

          // Shell output → WebSocket
          ptyProcess.onData((data) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
            }
          });

          // WebSocket input → Shell
          ws.on('message', (msg) => {
            try {
              const data = JSON.parse(msg.toString());

              switch (data.type) {
                case 'input':
                  ptyProcess.write(data.data || '');
                  break;

                case 'resize':
                  if (data.cols && data.rows) {
                    ptyProcess.resize(data.cols, data.rows);
                  }
                  break;

                default:
                  console.warn(`[Terminal ${sessionId}] Unknown message type: ${data.type}`);
              }
            } catch (err) {
              console.error(`[Terminal ${sessionId}] Message error:`, err.message);
            }
          });

          // Handle WebSocket close
          ws.on('close', () => {
            console.log(`[Terminal] Session closed: ${sessionId}`);
            ptyProcess.kill();
            terminalSessions.delete(sessionId);
          });

          // Handle WebSocket errors
          ws.on('error', (error) => {
            console.error(`[Terminal ${sessionId}] WebSocket error:`, error.message);
          });

          // Handle PTY errors
          ptyProcess.onExit(() => {
            console.log(`[Terminal] Process exited: ${sessionId}`);
            if (ws.readyState === ws.OPEN) {
              ws.close();
            }
            terminalSessions.delete(sessionId);
          });
        } catch (err) {
          console.error(`[Terminal] Initialization error:`, err.message);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
            ws.close();
          }
        }
      });
    }
  });

  // Graceful shutdown handler
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing sessions...');

    // Close browser sessions
    for (const [sessionId, session] of sessions.entries()) {
      await session.close();
      sessions.delete(sessionId);
    }

    // Close terminal sessions
    for (const [sessionId, ptyProcess] of terminalSessions.entries()) {
      ptyProcess.kill();
      terminalSessions.delete(sessionId);
    }

    process.exit(0);
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Browser WebSocket ready on ws://${hostname}:${port}/browser-ws`);
    console.log(`> Terminal WebSocket ready on ws://${hostname}:${port}/terminal-ws`);
  });
});
