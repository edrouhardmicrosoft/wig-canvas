import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  getPidFilePath,
  getSocketPath,
  isSuccessResponse,
  type OutputFormat,
} from '@wig/canvas-core';
import { withClient } from './client/index.js';
import { renderError } from './output/index.js';

export function isDaemonRunning(): { running: boolean; pid: number | null } {
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

export async function tryAutoStartDaemon(format: OutputFormat): Promise<boolean> {
  const { running } = isDaemonRunning();
  if (running) {
    return true;
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
    renderError(`Daemon not found at: ${daemonPath}. Run pnpm build.`, format);
    return false;
  }

  const child = spawn('node', [daemonPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  const startDeadlineMs = 10_000;
  const startedAt = Date.now();
  const delaysMs = [50, 100, 150, 250, 400, 600, 800, 1000, 1200, 1500, 2000];

  for (const delayMs of delaysMs) {
    try {
      const response = await withClient(async (client) => {
        return client.send<{ pong: boolean }>('ping', {});
      });
      if (isSuccessResponse(response)) {
        return true;
      }
    } catch {}

    if (Date.now() - startedAt >= startDeadlineMs) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  renderError('Failed to auto-start daemon. Run `canvas daemon start`.', format);
  return false;
}

export async function stopDaemonIfRunning(): Promise<void> {
  const { running } = isDaemonRunning();
  if (!running) return;

  try {
    await withClient(async (client) => {
      await client.send('daemon.stop', {});
    });
  } catch {}
}

export type WithEphemeralDaemonOptions = {
  format: OutputFormat;
  keepAlive?: boolean;
};

export async function withEphemeralDaemon<T>(
  options: WithEphemeralDaemonOptions,
  fn: () => Promise<T>
): Promise<T> {
  const wasRunning = isDaemonRunning().running;
  if (!wasRunning) {
    const started = await tryAutoStartDaemon(options.format);
    if (!started) {
      throw new Error('Failed to auto-start daemon');
    }
  }

  try {
    return await fn();
  } finally {
    const shouldStop = !wasRunning && !options.keepAlive;
    if (shouldStop) {
      await stopDaemonIfRunning();
    }
  }
}
