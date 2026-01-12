#!/usr/bin/env node
import { Command } from 'commander';
import {
  getTransportConfig,
  getSocketPath,
  getPidFilePath,
  isSuccessResponse,
  type DaemonInfo,
  type SessionInfo,
  type ScreenshotResult,
} from '@wig/canvas-core';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { withClient } from './client/index.js';

const VERSION = '0.0.0';

const program = new Command();

program
  .name('canvas')
  .description('CLI-first canvas toolkit for browser automation')
  .version(VERSION);

const daemonCmd = program.command('daemon').description('Manage the canvas daemon process');

function isDaemonRunning(): { running: boolean; pid: number | null } {
  const pidFile = getPidFilePath();
  if (!existsSync(pidFile)) {
    return { running: false, pid: null };
  }

  try {
    const pidContent = readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(pidContent, 10);
    try {
      process.kill(pid, 0);
      return { running: true, pid };
    } catch {
      return { running: false, pid };
    }
  } catch {
    return { running: false, pid: null };
  }
}

daemonCmd
  .command('status')
  .description('Show daemon status and endpoint info')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (options: { format: string }) => {
    const transport = getTransportConfig();
    const socketPath = getSocketPath();
    const { running, pid } = isDaemonRunning();

    let daemonInfo: DaemonInfo | null = null;
    if (running) {
      try {
        const response = await withClient(async (client) => {
          return client.send<DaemonInfo>('daemon.status', {});
        });
        if (isSuccessResponse(response)) {
          daemonInfo = response.result;
        }
      } catch {
        daemonInfo = null;
      }
    }

    const status = {
      running,
      pid: daemonInfo?.pid ?? pid,
      transport: transport.type,
      endpoint: socketPath,
      socketExists: transport.type === 'unix' ? existsSync(socketPath) : null,
      version: daemonInfo?.version ?? null,
      protocolVersion: daemonInfo?.protocolVersion ?? null,
    };

    if (options.format === 'json') {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('Daemon Status');
      console.log(`  Running:          ${running ? 'yes' : 'no'}`);
      if (status.pid) {
        console.log(`  PID:              ${String(status.pid)}`);
      }
      console.log(`  Transport:        ${transport.type}`);
      console.log(`  Endpoint:         ${socketPath}`);
      if (transport.type === 'unix') {
        console.log(`  Socket:           ${existsSync(socketPath) ? 'exists' : 'not found'}`);
      }
      if (status.version) {
        console.log(`  Version:          ${status.version}`);
      }
      if (status.protocolVersion) {
        console.log(`  Protocol Version: ${status.protocolVersion}`);
      }
    }
  });

daemonCmd
  .command('start')
  .description('Start the daemon process')
  .option('--foreground', 'Run in foreground (do not daemonize)', false)
  .action(async (options: { foreground: boolean }) => {
    const { running, pid } = isDaemonRunning();
    if (running) {
      console.error(`Daemon already running (PID: ${String(pid)})`);
      process.exit(1);
    }

    const socketPath = getSocketPath();
    const pidFile = getPidFilePath();
    if (existsSync(socketPath)) {
      unlinkSync(socketPath);
    }
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const daemonPath = resolve(__dirname, '../../daemon/dist/index.js');

    if (!existsSync(daemonPath)) {
      console.error(`Daemon not found at: ${daemonPath}`);
      console.error('Run `pnpm build` to build the daemon.');
      process.exit(1);
    }

    if (options.foreground) {
      const { execSync } = await import('node:child_process');
      try {
        execSync(`node "${daemonPath}"`, { stdio: 'inherit' });
      } catch {
        process.exit(1);
      }
    } else {
      const child = spawn('node', [daemonPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      const startDeadlineMs = 10_000;
      const startedAt = Date.now();
      let lastErrorMessage: string | null = null;

      const delaysMs = [50, 100, 150, 250, 400, 600, 800, 1000, 1200, 1500, 2000];

      for (const delayMs of delaysMs) {
        try {
          const response = await withClient(async (client) => {
            return client.send<{ pong: boolean }>('ping', {});
          });

          if (isSuccessResponse(response)) {
            const { pid: newPid } = isDaemonRunning();
            console.log(`Daemon started (PID: ${String(newPid ?? 'unknown')})`);
            return;
          }

          lastErrorMessage = response.error.message;
        } catch (err) {
          lastErrorMessage = err instanceof Error ? err.message : String(err);
        }

        if (Date.now() - startedAt >= startDeadlineMs) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const elapsedMs = Date.now() - startedAt;
      console.error(
        `Failed to start daemon: did not become ready within ${String(startDeadlineMs)}ms (waited ${String(
          elapsedMs
        )}ms).${lastErrorMessage ? ` Last error: ${lastErrorMessage}` : ''}`
      );
      process.exit(1);
    }
  });

daemonCmd
  .command('stop')
  .description('Stop the daemon process')
  .action(async () => {
    const { running, pid } = isDaemonRunning();
    if (!running) {
      console.log('Daemon is not running');
      return;
    }

    try {
      const response = await withClient(async (client) => {
        return client.send<{ stopping: boolean }>('daemon.stop', {});
      });

      if (isSuccessResponse(response)) {
        console.log(`Daemon stopping (PID: ${String(pid)})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.error(`Error: ${response.error.message}`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        if (pid) {
          try {
            process.kill(pid, 'SIGTERM');
            console.log(`Sent SIGTERM to daemon (PID: ${String(pid)})`);
          } catch {
            console.error('Failed to stop daemon');
            process.exit(1);
          }
        }
      } else {
        console.error(`Failed to connect: ${message}`);
        process.exit(1);
      }
    }
  });

daemonCmd
  .command('ping')
  .description('Ping the daemon to verify connectivity')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (options: { format: string }) => {
    try {
      const response = await withClient(async (client) => {
        return client.send<{ pong: boolean }>('ping', {});
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.log('pong');
        }
        process.exit(0);
      } else {
        console.error(`Error: ${response.error.message}`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to connect: ${message}`);
      }
      process.exit(1);
    }
  });

program
  .command('connect')
  .description('Connect to a URL and open a browser session')
  .argument('<url>', 'URL to connect to')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (url: string, options: { format: string }) => {
    try {
      const response = await withClient(async (client) => {
        return client.send<SessionInfo>('connect', { url });
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.log(`Connected to: ${response.result.url ?? url}`);
          console.log(`  Browser:  ${response.result.browser ?? 'unknown'}`);
          if (response.result.viewport) {
            console.log(
              `  Viewport: ${String(response.result.viewport.width)}x${String(response.result.viewport.height)}`
            );
          }
        }
      } else {
        console.error(`Error: ${response.error.message}`);
        if (response.error.data.suggestion) {
          console.error(`Suggestion: ${response.error.data.suggestion}`);
        }
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to connect: ${message}`);
      }
      process.exit(1);
    }
  });

program
  .command('disconnect')
  .description('Disconnect from the current browser session')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (options: { format: string }) => {
    try {
      const response = await withClient(async (client) => {
        return client.send<{ disconnected: boolean }>('disconnect', {});
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.log('Disconnected');
        }
      } else {
        console.error(`Error: ${response.error.message}`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to disconnect: ${message}`);
      }
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current session status')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (options: { format: string }) => {
    try {
      const response = await withClient(async (client) => {
        return client.send<SessionInfo>('status', {});
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          const session = response.result;
          console.log('Session Status');
          console.log(`  Connected: ${session.connected ? 'yes' : 'no'}`);
          if (session.url) {
            console.log(`  URL:       ${session.url}`);
          }
          if (session.browser) {
            console.log(`  Browser:   ${session.browser}`);
          }
          if (session.viewport) {
            console.log(
              `  Viewport:  ${String(session.viewport.width)}x${String(session.viewport.height)}`
            );
          }
        }
      } else {
        console.error(`Error: ${response.error.message}`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to get status: ${message}`);
      }
      process.exit(1);
    }
  });

program
  .command('execute')
  .description(
    'Execute JavaScript in the connected page context (DANGEROUS: arbitrary code execution)'
  )
  .argument('<code>', 'JavaScript source code to run')
  .option('--timeout-ms <ms>', 'Execution timeout in milliseconds', '5000')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (code: string, options: { timeoutMs: string; format: string }) => {
    const timeoutMs = Number(options.timeoutMs);

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      console.error('Invalid --timeout-ms. Must be a positive number.');
      process.exit(1);
    }

    try {
      const response = await withClient(async (client) => {
        return client.send<{ value: unknown }>('execute', { code, timeoutMs });
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          if (typeof response.result.value === 'string') {
            console.log(response.result.value);
          } else {
            console.log(JSON.stringify(response.result.value, null, 2));
          }
        }
      } else {
        console.error(`Error: ${response.error.message}`);
        if (response.error.data.suggestion) {
          console.error(`Suggestion: ${response.error.data.suggestion}`);
        }
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to execute: ${message}`);
      }
      process.exit(1);
    }
  });

program
  .command('screenshot')
  .description('Take a screenshot of the viewport or an element')
  .argument('[selector]', 'CSS selector for element screenshot (viewport if omitted)')
  .option('--out <path>', 'Output path for the screenshot')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (selector: string | undefined, options: { out?: string; format: string }) => {
    try {
      const method = selector ? 'screenshot.element' : 'screenshot.viewport';
      const params = selector ? { selector, out: options.out } : { out: options.out };

      const response = await withClient(async (client) => {
        return client.send<ScreenshotResult>(method, params);
      });

      if (isSuccessResponse(response)) {
        if (options.format === 'json') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.log(`Screenshot saved to: ${response.result.path}`);
          console.log(`  Size: ${String(response.result.width)}x${String(response.result.height)}`);
        }
      } else {
        console.error(`Error: ${response.error.message}`);
        if (response.error.data.suggestion) {
          console.error(`Suggestion: ${response.error.data.suggestion}`);
        }
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
        console.error('Daemon is not running. Start it with: canvas daemon start');
      } else {
        console.error(`Failed to take screenshot: ${message}`);
      }
      process.exit(1);
    }
  });

program.parse();
