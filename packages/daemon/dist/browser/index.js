import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const SCREENSHOTS_DIR = '.canvas/screenshots';
export class BrowserManager {
    browser = null;
    context = null;
    page = null;
    config;
    constructor(config = {}) {
        this.config = {
            engine: config.engine ?? 'chromium',
            headless: config.headless ?? true,
        };
    }
    async launchBrowser() {
        if (this.browser) {
            return;
        }
        this.browser = await chromium.launch({
            headless: this.config.headless,
        });
        console.error(`Browser launched (engine: ${this.config.engine ?? 'chromium'}, headless: ${String(this.config.headless)})`);
    }
    async closeBrowser() {
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
    async connect(url) {
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
    async disconnect() {
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
    getSessionState() {
        if (!this.page) {
            return { url: null, viewport: DEFAULT_VIEWPORT };
        }
        return {
            url: this.page.url(),
            viewport: DEFAULT_VIEWPORT,
        };
    }
    isConnected() {
        return this.page !== null && !this.page.isClosed();
    }
    getPage() {
        return this.page;
    }
    getEngine() {
        return this.config.engine ?? 'chromium';
    }
    async takeScreenshot(options) {
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
        }
        else {
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
//# sourceMappingURL=index.js.map