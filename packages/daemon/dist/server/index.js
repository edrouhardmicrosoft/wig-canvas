import { createServer } from 'node:net';
import { unlinkSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { ErrorCodes, createDaemonError, createTimeoutError, createSelectorError, PROTOCOL_VERSION, DAEMON_VERSION, isCompatible, getSocketPath, getPidFilePath, } from '@wig/canvas-core';
import { BrowserManager } from '../browser/index.js';
export class DaemonServer {
    server = null;
    socketPath;
    connections = new Set();
    browserManager;
    constructor() {
        this.socketPath = getSocketPath();
        this.browserManager = new BrowserManager();
    }
    async start() {
        if (existsSync(this.socketPath)) {
            unlinkSync(this.socketPath);
        }
        this.server = createServer((socket) => {
            this.handleConnection(socket);
        });
        return new Promise((resolve, reject) => {
            this.server?.on('error', reject);
            this.server?.listen(this.socketPath, () => {
                chmodSync(this.socketPath, 0o600);
                writeFileSync(getPidFilePath(), String(process.pid), { mode: 0o600 });
                console.error(`Daemon listening on ${this.socketPath}`);
                resolve();
            });
        });
    }
    async stop() {
        await this.browserManager.closeBrowser();
        for (const socket of this.connections) {
            socket.destroy();
        }
        this.connections.clear();
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    if (existsSync(this.socketPath)) {
                        unlinkSync(this.socketPath);
                    }
                    if (existsSync(getPidFilePath())) {
                        unlinkSync(getPidFilePath());
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    handleConnection(socket) {
        this.connections.add(socket);
        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString();
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                if (line.trim()) {
                    void this.handleMessage(socket, line);
                }
            }
        });
        socket.on('close', () => {
            this.connections.delete(socket);
        });
        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
            this.connections.delete(socket);
        });
    }
    async handleMessage(socket, message) {
        let request;
        try {
            request = JSON.parse(message);
        }
        catch {
            const response = {
                id: 'req_unknown',
                ok: false,
                error: {
                    code: ErrorCodes.INPUT_INVALID,
                    message: 'Invalid JSON in request',
                    data: { category: 'input', retryable: false },
                },
            };
            this.sendResponse(socket, response);
            return;
        }
        const clientProtocolVersion = request.meta.protocolVersion;
        if (!isCompatible(clientProtocolVersion, PROTOCOL_VERSION)) {
            const response = {
                id: request.id,
                ok: false,
                error: createDaemonError(ErrorCodes.PROTOCOL_VERSION_MISMATCH, `Protocol version mismatch: client ${clientProtocolVersion}, daemon ${PROTOCOL_VERSION}`, {
                    retryable: false,
                    suggestion: `Upgrade your CLI to match daemon protocol version ${PROTOCOL_VERSION}`,
                }),
            };
            this.sendResponse(socket, response);
            return;
        }
        const response = await this.dispatch(request);
        this.sendResponse(socket, response);
    }
    async dispatch(request) {
        const { id, method, params } = request;
        switch (method) {
            case 'ping':
                return this.successResponse(id, { pong: true });
            case 'daemon.status':
                return this.successResponse(id, this.getDaemonStatus());
            case 'daemon.stop':
                setImmediate(() => {
                    void this.stop().then(() => process.exit(0));
                });
                return this.successResponse(id, { stopping: true });
            case 'connect':
                return this.handleConnect(id, params);
            case 'disconnect':
                return this.handleDisconnect(id);
            case 'status':
                return this.successResponse(id, this.getSessionStatus());
            case 'screenshot.viewport':
                return this.handleScreenshot(id, request.meta.cwd, params);
            case 'screenshot.element':
                return this.handleScreenshot(id, request.meta.cwd, params);
            default:
                return {
                    id,
                    ok: false,
                    error: {
                        code: ErrorCodes.INPUT_INVALID,
                        message: `Unknown method: ${method}`,
                        data: { category: 'input', retryable: false, param: 'method' },
                    },
                };
        }
    }
    async handleConnect(id, params) {
        if (!params.url) {
            return {
                id,
                ok: false,
                error: {
                    code: ErrorCodes.INPUT_MISSING,
                    message: 'Missing required parameter: url',
                    data: { category: 'input', retryable: false, param: 'url' },
                },
            };
        }
        try {
            const sessionState = await this.browserManager.connect(params.url);
            return this.successResponse(id, {
                connected: true,
                url: sessionState.url ?? undefined,
                browser: this.browserManager.getEngine(),
                viewport: sessionState.viewport,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('Timeout') || message.includes('timeout')) {
                return {
                    id,
                    ok: false,
                    error: createTimeoutError(ErrorCodes.NAVIGATION_TIMEOUT, `Navigation timeout: ${params.url}`, { suggestion: 'Check if the URL is accessible and try again' }),
                };
            }
            return {
                id,
                ok: false,
                error: {
                    code: ErrorCodes.NAVIGATION_FAILED,
                    message: `Failed to connect: ${message}`,
                    data: { category: 'navigation', retryable: true },
                },
            };
        }
    }
    async handleDisconnect(id) {
        await this.browserManager.disconnect();
        return this.successResponse(id, { disconnected: true });
    }
    async handleScreenshot(id, cwd, params) {
        if (!this.browserManager.isConnected()) {
            return {
                id,
                ok: false,
                error: {
                    code: ErrorCodes.PAGE_NOT_READY,
                    message: 'No page connected. Use connect first.',
                    data: { category: 'browser', retryable: false },
                },
            };
        }
        try {
            const result = await this.browserManager.takeScreenshot({
                path: params.out,
                selector: params.selector,
                cwd,
            });
            return this.successResponse(id, result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('selector') || message.includes('locator')) {
                return {
                    id,
                    ok: false,
                    error: createSelectorError(ErrorCodes.SELECTOR_NOT_FOUND, `Selector not found: ${params.selector ?? 'unknown'}`, params.selector ?? 'unknown'),
                };
            }
            return {
                id,
                ok: false,
                error: {
                    code: ErrorCodes.INTERNAL_ERROR,
                    message: `Screenshot failed: ${message}`,
                    data: { category: 'internal', retryable: false },
                },
            };
        }
    }
    getSessionStatus() {
        const state = this.browserManager.getSessionState();
        return {
            connected: this.browserManager.isConnected(),
            url: state.url ?? undefined,
            browser: this.browserManager.getEngine(),
            viewport: state.viewport,
        };
    }
    getDaemonStatus() {
        return {
            pid: process.pid,
            socketPath: this.socketPath,
            version: DAEMON_VERSION,
            protocolVersion: PROTOCOL_VERSION,
        };
    }
    successResponse(id, result) {
        return { id, ok: true, result };
    }
    sendResponse(socket, response) {
        const json = JSON.stringify(response);
        socket.write(json + '\n');
    }
}
//# sourceMappingURL=index.js.map