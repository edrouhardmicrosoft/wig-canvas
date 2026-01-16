import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

vi.mock('../client/index.js', () => {
  return {
    withClient: vi.fn(),
  };
});

vi.mock('../output/index.js', () => {
  return {
    renderError: vi.fn(),
  };
});

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { withClient } from '../client/index.js';
import { renderError } from '../output/index.js';
import { withEphemeralDaemon, isDaemonRunning } from '../lifecycle.js';

const originalKill = process.kill;

beforeEach(() => {
  vi.resetAllMocks();
  process.kill = vi.fn() as unknown as typeof process.kill;
});

afterEach(() => {
  process.kill = originalKill;
});

describe('lifecycle', () => {
  describe('isDaemonRunning', () => {
    it('returns not running when pidfile missing', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(isDaemonRunning()).toEqual({ running: false, pid: null });
    });

    it('returns running when pidfile exists and process alive', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('1234');
      vi.mocked(process.kill).mockImplementation(() => {
        return true;
      });

      expect(isDaemonRunning()).toEqual({ running: true, pid: 1234 });
    });

    it('returns not running when pidfile exists but process dead', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('1234');
      vi.mocked(process.kill).mockImplementation(() => {
        throw new Error('ESRCH');
      });

      expect(isDaemonRunning()).toEqual({ running: false, pid: 1234 });
    });

    it('returns not running when pidfile unreadable', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EACCES');
      });

      expect(isDaemonRunning()).toEqual({ running: false, pid: null });
    });
  });

  describe('withEphemeralDaemon', () => {
    it('auto-starts and then stops daemon when it was not running', async () => {
      let daemonPidExists = false;

      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        if (p.endsWith('.pid')) return daemonPidExists;
        if (p.endsWith('canvas.sock')) return false;
        if (p.includes('/daemon/dist/index.js')) return true;
        return false;
      });

      vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as never);

      const pingResult = { id: 'req', ok: true, result: { pong: true } };
      const stopResult = { id: 'req', ok: true, result: { stopping: true } };

      const send = vi.fn().mockImplementation(async (method: string) => {
        if (method === 'ping') {
          daemonPidExists = true;
          return pingResult;
        }
        if (method === 'daemon.stop') return stopResult;
        throw new Error(`Unexpected method: ${method}`);
      });

      vi.mocked(withClient).mockImplementation(async (fn: any) => {
        return fn({ send });
      });

      const value = await withEphemeralDaemon({ format: 'json' }, async () => 'ok');

      expect(value).toBe('ok');
      expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('ping', {});
    });

    it('does not stop daemon when keepAlive is true', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        if (p.includes('canvasd.pid')) return false;
        if (p.includes('canvas.sock')) return false;
        if (p.includes('/daemon/dist/index.js')) return true;
        return false;
      });

      vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as never);

      const pingResult = { id: 'req', ok: true, result: { pong: true } };
      const send = vi.fn().mockResolvedValueOnce(pingResult);

      vi.mocked(withClient).mockImplementation(async (fn: any) => {
        return fn({ send });
      });

      await withEphemeralDaemon({ format: 'json', keepAlive: true }, async () => 'ok');

      expect(send).toHaveBeenCalledWith('ping', {});
      expect(send).not.toHaveBeenCalledWith('daemon.stop', {});
    });

    it('does not auto-stop if daemon already running', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(readFileSync).mockReturnValue('1234');
      vi.mocked(process.kill).mockImplementation(() => {
        return true;
      });

      const send = vi.fn().mockResolvedValue({ id: 'req', ok: true, result: { pong: true } });
      vi.mocked(withClient).mockImplementation(async (fn: any) => {
        return fn({ send });
      });

      await withEphemeralDaemon({ format: 'json' }, async () => 'ok');

      expect(vi.mocked(spawn)).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalledWith('daemon.stop', {});
    });

    it('still stops daemon if fn throws', async () => {
      let daemonPidExists = false;

      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        if (p.endsWith('.pid')) return daemonPidExists;
        if (p.endsWith('canvas.sock')) return false;
        if (p.includes('/daemon/dist/index.js')) return true;
        return false;
      });

      vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as never);

      const pingResult = { id: 'req', ok: true, result: { pong: true } };
      const stopResult = { id: 'req', ok: true, result: { stopping: true } };

      const send = vi.fn().mockImplementation(async (method: string) => {
        if (method === 'ping') {
          daemonPidExists = true;
          return pingResult;
        }
        if (method === 'daemon.stop') return stopResult;
        throw new Error(`Unexpected method: ${method}`);
      });

      vi.mocked(withClient).mockImplementation(async (fn: any) => {
        return fn({ send });
      });

      await expect(
        withEphemeralDaemon({ format: 'json' }, async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
    });

    it('renders error and throws when auto-start cannot find daemon path', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        if (p.includes('canvasd.pid')) return false;
        if (p.includes('canvas.sock')) return false;
        if (p.includes('/daemon/dist/index.js')) return false;
        return false;
      });

      await expect(withEphemeralDaemon({ format: 'json' }, async () => 'ok')).rejects.toThrow(
        'Failed to auto-start daemon'
      );
      expect(vi.mocked(renderError)).toHaveBeenCalledTimes(1);
    });

    it('cleans stale socket/pidfile before spawning', async () => {
      const calls: string[] = [];
      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        if (p.endsWith('.pid')) return true;
        if (p.endsWith('canvas.sock')) return true;
        if (p.includes('/daemon/dist/index.js')) return true;
        return false;
      });

      vi.mocked(unlinkSync).mockImplementation((path: any) => {
        calls.push(String(path));
      });

      vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as never);

      const pingResult = { id: 'req', ok: true, result: { pong: true } };
      const stopResult = { id: 'req', ok: true, result: { stopping: true } };

      const send = vi.fn().mockImplementation(async (method: string) => {
        if (method === 'ping') return pingResult;
        if (method === 'daemon.stop') return stopResult;
        throw new Error(`Unexpected method: ${method}`);
      });

      vi.mocked(withClient).mockImplementation(async (fn: any) => {
        return fn({ send });
      });

      await withEphemeralDaemon({ format: 'json' }, async () => 'ok');

      const joined = calls.join('\n');
      expect(joined).toContain('canvas.sock');
      expect(joined).toMatch(/\.pid(\n|$)/);
      expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
    });
  });
});
