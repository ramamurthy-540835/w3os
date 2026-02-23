const { chromium } = require('playwright');

class BrowserSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.cdpSession = null;
    this.frameCallback = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log(`[${this.sessionId}] Launching browser...`);

      // Launch with anti-detection settings + Docker/Cloud Run compatibility
      this.browser = await chromium.launch({
        headless: true,  // Playwright's "new headless" is NOT detectable
        args: [
          // REQUIRED for Docker (no /dev/shm, no sandbox in container)
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',

          // Performance in constrained environment
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--single-process',  // Reduces memory: 800MB -> 400MB

          // Anti-detection
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',

          // Window size (1280x800 for canvas display)
          '--window-size=1280,800',

          // Additional optimizations
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });

      console.log(`[${this.sessionId}] Browser launched, creating context...`);

      // Create context with realistic fingerprint
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        colorScheme: 'light',
        deviceScaleFactor: 1,
        hasTouch: false,
        javaScriptEnabled: true,
        acceptDownloads: false,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      });

      // Remove automation indicators - CRITICAL for login forms
      await this.context.addInitScript(() => {
        // Override navigator.webdriver (the #1 bot detection signal)
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // Override chrome.runtime to appear as regular Chrome
        window.chrome = { runtime: {} };

        // Override permissions query
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);

        // Add plugins (headless Chrome has 0 plugins — a detection signal)
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],  // Fake plugin count
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Override connection (headless has different connection type)
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 10,
            saveData: false,
          }),
        });
      });

      console.log(`[${this.sessionId}] Creating page...`);
      this.page = await this.context.newPage();

      // Start CDP screencast for efficient frame streaming
      console.log(`[${this.sessionId}] Starting CDP screencast...`);
      this.cdpSession = await this.page.context().newCDPSession(this.page);

      await this.cdpSession.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 75,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 2,  // Stream every 2nd frame (15 FPS -> 7.5 FPS)
      });

      this.cdpSession.on('Page.screencastFrame', async (frame) => {
        if (this.frameCallback) {
          this.frameCallback(frame.data);
        }
        // MUST acknowledge frame to get next one
        await this.cdpSession.send('Page.screencastFrameAck', {
          sessionId: frame.sessionId,
        }).catch(() => {});
      });

      this.isInitialized = true;
      console.log(`[${this.sessionId}] Browser session initialized`);
    } catch (error) {
      console.error(`[${this.sessionId}] Initialization error:`, error.message);
      throw error;
    }
  }

  onFrame(callback) {
    this.frameCallback = callback;
  }

  async navigate(url) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      console.log(`[${this.sessionId}] Navigating to ${url}`);

      // Try networkidle first (better for SPAs like X.com)
      // If it times out, that's usually OK - the page is likely usable
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      }).catch(async (err) => {
        // If networkidle times out, try with domcontentloaded
        if (err.message.includes('Timeout') || err.message.includes('timeout')) {
          console.log(`[${this.sessionId}] networkidle timeout, page may still be loading but is likely usable`);
        } else {
          // For other errors, try domcontentloaded as fallback
          console.log(`[${this.sessionId}] networkidle failed, trying domcontentloaded...`);
          await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
        }
      });

      // Additional wait for JS-heavy sites to fully render
      await new Promise(r => setTimeout(r, 1000));

      console.log(`[${this.sessionId}] Navigation complete (page ready)`);
    } catch (err) {
      // Log error but don't throw - the page might still be partially usable
      console.error(`[${this.sessionId}] Navigation error: ${err.message}`);
      console.log(`[${this.sessionId}] Continuing anyway - page may be partially loaded`);
    }
  }

  async click(x, y, button = 'left') {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Human-like: move mouse first with random steps
      const steps = 3 + Math.floor(Math.random() * 5);
      await this.page.mouse.move(x, y, { steps });

      // Random delay to appear human (30-100ms)
      await new Promise(r => setTimeout(r, 30 + Math.random() * 70));

      // Click at coordinates
      await this.page.mouse.click(x, y, { button });

      // Wait for any navigation or JS to execute
      await new Promise(r => setTimeout(r, 300));

      console.log(`[${this.sessionId}] Clicked at (${x}, ${y})`);
    } catch (err) {
      console.error(`[${this.sessionId}] Click error:`, err.message);
    }
  }

  async doubleClick(x, y) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.mouse.move(x, y);
      await this.page.mouse.dblclick(x, y);
      console.log(`[${this.sessionId}] Double-clicked at (${x}, ${y})`);
    } catch (err) {
      console.error(`[${this.sessionId}] Double-click error:`, err.message);
    }
  }

  async mouseDown(x, y, button = 'left') {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.mouse.move(x, y);
      await this.page.mouse.down({ button });
      console.log(`[${this.sessionId}] Mouse down at (${x}, ${y})`);
    } catch (err) {
      console.error(`[${this.sessionId}] Mouse down error:`, err.message);
    }
  }

  async mouseUp(x, y, button = 'left') {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.mouse.up({ button });
      console.log(`[${this.sessionId}] Mouse up at (${x}, ${y})`);
    } catch (err) {
      console.error(`[${this.sessionId}] Mouse up error:`, err.message);
    }
  }

  async keyPress(key, modifiers = {}) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Handle modifier keys
      if (modifiers.ctrl) await this.page.keyboard.down('Control');
      if (modifiers.shift) await this.page.keyboard.down('Shift');
      if (modifiers.alt) await this.page.keyboard.down('Alt');
      if (modifiers.meta) await this.page.keyboard.down('Meta');

      // Add slight random delay to appear human (20-70ms)
      await new Promise(r => setTimeout(r, 20 + Math.random() * 50));

      // Press key down (will be released with keyRelease)
      await this.page.keyboard.down(key);

      console.log(`[${this.sessionId}] Key down: ${key}`);
    } catch (err) {
      console.error(`[${this.sessionId}] Key press error:`, err.message);
    }
  }

  async keyRelease(key, modifiers = {}) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Release the key
      await this.page.keyboard.up(key);

      // Release modifiers
      if (modifiers.meta) await this.page.keyboard.up('Meta');
      if (modifiers.alt) await this.page.keyboard.up('Alt');
      if (modifiers.shift) await this.page.keyboard.up('Shift');
      if (modifiers.ctrl) await this.page.keyboard.up('Control');

      console.log(`[${this.sessionId}] Key up: ${key}`);
    } catch (err) {
      console.error(`[${this.sessionId}] Key release error:`, err.message);
    }
  }

  async type(text) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.keyboard.type(text, { delay: 50 });
      console.log(`[${this.sessionId}] Typed: ${text}`);
    } catch (err) {
      console.error(`[${this.sessionId}] Type error:`, err.message);
    }
  }

  async scroll(deltaX, deltaY) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.mouse.wheel(deltaX, deltaY);
      console.log(`[${this.sessionId}] Scrolled: (${deltaX}, ${deltaY})`);
    } catch (err) {
      console.error(`[${this.sessionId}] Scroll error:`, err.message);
    }
  }

  async mouseMove(x, y) {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.mouse.move(x, y);
    } catch (err) {
      // Ignore mouse move errors (they're frequent and non-critical)
    }
  }

  async saveState() {
    if (!this.context) return null;

    try {
      const state = await this.context.storageState();
      console.log(`[${this.sessionId}] Session state saved (${state.cookies.length} cookies)`);
      return state;
    } catch (err) {
      console.error(`[${this.sessionId}] Save state error:`, err.message);
      return null;
    }
  }

  async restoreState(state) {
    if (!this.context || !state) return;

    try {
      await this.context.addCookies(state.cookies);
      console.log(`[${this.sessionId}] Session state restored (${state.cookies.length} cookies)`);
    } catch (err) {
      console.error(`[${this.sessionId}] Restore state error:`, err.message);
    }
  }

  async close() {
    console.log(`[${this.sessionId}] Closing browser session...`);

    try {
      if (this.cdpSession) {
        await this.cdpSession.send('Page.stopScreencast').catch(() => {});
        await this.cdpSession.detach().catch(() => {});
      }
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});

      this.isInitialized = false;
      console.log(`[${this.sessionId}] Browser session closed`);
    } catch (err) {
      console.error(`[${this.sessionId}] Cleanup error:`, err.message);
    }
  }
}

module.exports = { BrowserSession };
