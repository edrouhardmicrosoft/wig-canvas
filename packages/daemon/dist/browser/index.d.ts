import { type Page } from 'playwright';
export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';
export interface BrowserManagerConfig {
    engine?: BrowserEngine;
    headless?: boolean;
}
export interface SessionState {
    url: string | null;
    viewport: {
        width: number;
        height: number;
    };
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
export declare class BrowserManager {
    private browser;
    private context;
    private page;
    private config;
    constructor(config?: BrowserManagerConfig);
    launchBrowser(): Promise<void>;
    closeBrowser(): Promise<void>;
    connect(url: string): Promise<SessionState>;
    disconnect(): Promise<void>;
    getSessionState(): SessionState;
    isConnected(): boolean;
    getPage(): Page | null;
    getEngine(): BrowserEngine;
    takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult>;
}
//# sourceMappingURL=index.d.ts.map