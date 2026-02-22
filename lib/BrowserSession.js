const puppeteer = require('puppeteer-core');

class BrowserSession {
  constructor(sessionId) {
    this.browser = null;
    this.page = null;
    this.streamInterval = null;
    this.sessionId = sessionId;
  }

  async initialize() {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

    this.browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--hide-scrollbars',
        '--mute-audio',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });

    console.log(`Browser session ${this.sessionId} initialized`);
  }

  async navigate(url) {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Navigating to ${url}`);
    await this.page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
  }

  async getScreenshot() {
    if (!this.page) throw new Error('Browser not initialized');

    const screenshot = await this.page.screenshot({
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
    });

    return screenshot;
  }

  async click(x, y) {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Click at ${x}, ${y}`);
    await this.page.mouse.click(x, y);
  }

  async type(text) {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Typing: ${text.substring(0, 20)}...`);
    await this.page.keyboard.type(text);
  }

  async keyPress(key) {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Key press: ${key}`);
    await this.page.keyboard.press(key);
  }

  async scroll(deltaY) {
    if (!this.page) throw new Error('Browser not initialized');

    await this.page.evaluate((delta) => {
      window.scrollBy(0, delta);
    }, deltaY);
  }

  async mouseMove(x, y) {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.mouse.move(x, y);
  }

  async mouseDown() {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.mouse.down();
  }

  async mouseUp() {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.mouse.up();
  }

  async close() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }

    if (this.browser) {
      await this.browser.close();
    }

    console.log(`Browser session ${this.sessionId} closed`);
  }
}

module.exports = { BrowserSession };
