import { createConnection } from 'node:net';
import { generateRequestId, getSocketPath, CLI_VERSION, PROTOCOL_VERSION, } from '@wig/canvas-core';
export class DaemonClient {
    socket = null;
    socketPath;
    pendingRequests = new Map();
    buffer = '';
    constructor() {
        this.socketPath = getSocketPath();
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = createConnection(this.socketPath);
            this.socket.on('connect', () => {
                resolve();
            });
            this.socket.on('error', (err) => {
                reject(err);
            });
            this.socket.on('data', (data) => {
                this.buffer += data.toString();
                let newlineIndex;
                while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
                    const line = this.buffer.slice(0, newlineIndex);
                    this.buffer = this.buffer.slice(newlineIndex + 1);
                    if (line.trim()) {
                        this.handleResponse(line);
                    }
                }
            });
            this.socket.on('close', () => {
                for (const { reject: rej } of this.pendingRequests.values()) {
                    rej(new Error('Connection closed'));
                }
                this.pendingRequests.clear();
            });
        });
    }
    disconnect() {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
    }
    async send(method, params) {
        if (!this.socket) {
            throw new Error('Not connected');
        }
        const request = {
            id: generateRequestId(),
            method,
            params,
            meta: {
                cwd: process.cwd(),
                format: 'json',
                protocolVersion: PROTOCOL_VERSION,
                client: {
                    name: 'canvas',
                    version: CLI_VERSION,
                },
            },
        };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, {
                resolve: resolve,
                reject,
            });
            const json = JSON.stringify(request) + '\n';
            this.socket?.write(json);
        });
    }
    handleResponse(line) {
        try {
            const response = JSON.parse(line);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
                this.pendingRequests.delete(response.id);
                pending.resolve(response);
            }
        }
        catch {
            console.error('Failed to parse response:', line);
        }
    }
}
export async function withClient(fn) {
    const client = new DaemonClient();
    await client.connect();
    try {
        return await fn(client);
    }
    finally {
        client.disconnect();
    }
}
//# sourceMappingURL=index.js.map