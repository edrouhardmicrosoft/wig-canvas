import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';

export interface BrowserManagerConfig {
  engine?: BrowserEngine;
  headless?: boolean;
}

export interface SessionState {
  url: string | null;
  viewport: { width: number; height: number };
}

export interface ScreenshotOptions {
  path?: string;
  selector?: string;
  cwd: string;
}

export interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  timestamp: string;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const SCREENSHOTS_DIR = '.canvas/screenshots';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserManagerConfig;

  constructor(config: BrowserManagerConfig = {}) {
    this.config = {
      engine: config.engine ?? 'chromium',
      headless: config.headless ?? true,
    };
  }

  async launchBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    console.error(
      `Browser launched (engine: ${this.config.engine ?? 'chromium'}, headless: ${String(this.config.headless)})`
    );
  }

  async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.error('Browser closed');
    }
  }

  async connect(url: string): Promise<SessionState> {
    if (!this.browser) {
      await this.launchBrowser();
    }

    if (this.page) {
      await this.page.close();
    }

    if (this.context) {
      await this.context.close();
    }

    if (!this.browser) {
      throw new Error('Browser failed to launch');
    }

    this.context = await this.browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    this.page = await this.context.newPage();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    const currentUrl = this.page.url();
    console.error(`Connected to: ${currentUrl}`);

    return {
      url: currentUrl,
      viewport: DEFAULT_VIEWPORT,
    };
  }

  async disconnect(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    console.error('Disconnected from page');
  }

  getSessionState(): SessionState {
    if (!this.page) {
      return { url: null, viewport: DEFAULT_VIEWPORT };
    }

    return {
      url: this.page.url(),
      viewport: DEFAULT_VIEWPORT,
    };
  }

  isConnected(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  getPage(): Page | null {
    return this.page;
  }

  getEngine(): BrowserEngine {
    return this.config.engine ?? 'chromium';
  }

  async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    if (!this.page || this.page.isClosed()) {
      throw new Error('No page connected. Use connect first.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotsDir = join(options.cwd, SCREENSHOTS_DIR);

    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    const outputPath = options.path ?? join(screenshotsDir, `${timestamp}.png`);
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    if (options.selector) {
      const locator = this.page.locator(options.selector);
      await locator.screenshot({ path: outputPath });
    } else {
      await this.page.screenshot({ path: outputPath, fullPage: false });
    }

    const viewportSize = this.page.viewportSize();

    return {
      path: outputPath,
      width: viewportSize?.width ?? DEFAULT_VIEWPORT.width,
      height: viewportSize?.height ?? DEFAULT_VIEWPORT.height,
      timestamp: new Date().toISOString(),
    };
  }
}
