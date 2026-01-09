export interface DaemonState {
    running: boolean;
}
export declare class DaemonServer {
    private server;
    private socketPath;
    private connections;
    private browserManager;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleConnection;
    private handleMessage;
    private dispatch;
    private handleConnect;
    private handleDisconnect;
    private handleScreenshot;
    private getSessionStatus;
    private getDaemonStatus;
    private successResponse;
    private sendResponse;
}
//# sourceMappingURL=index.d.ts.map