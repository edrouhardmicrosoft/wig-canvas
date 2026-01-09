#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { PROTOCOL_VERSION, DAEMON_VERSION } from '@wig/canvas-core';
import { DaemonServer } from './server/index.js';
const { values } = parseArgs({
    options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
    },
    strict: false,
    allowPositionals: true,
});
if (values.help) {
    console.log(`canvasd - WIG Canvas daemon process

Usage: canvasd [options]

Options:
  -h, --help      Show this help message
  -v, --version   Show version information

The daemon manages browser lifecycle and serves RPC requests
over a local Unix socket (macOS/Linux) or named pipe (Windows).`);
    process.exit(0);
}
if (values.version) {
    console.log(`canvasd ${DAEMON_VERSION}`);
    console.log(`protocol ${PROTOCOL_VERSION}`);
    process.exit(0);
}
console.error(`canvasd ${DAEMON_VERSION} starting...`);
const server = new DaemonServer();
process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down...');
    void server.stop().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down...');
    void server.stop().then(() => process.exit(0));
});
server.start().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to start daemon:', message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map