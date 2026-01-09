import { homedir, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
const SOCKET_NAME = 'canvas.sock';
const PIPE_NAME = 'canvas';
function getStateDir() {
    const plat = platform();
    if (plat === 'darwin') {
        const dir = join(homedir(), 'Library', 'Application Support', 'canvas');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
        return dir;
    }
    if (plat === 'linux') {
        const xdgState = process.env['XDG_STATE_HOME'];
        const dir = xdgState ? join(xdgState, 'canvas') : join(homedir(), '.local', 'state', 'canvas');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
        return dir;
    }
    if (plat === 'win32') {
        const localAppData = process.env['LOCALAPPDATA'];
        const dir = localAppData
            ? join(localAppData, 'canvas')
            : join(homedir(), 'AppData', 'Local', 'canvas');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    const dir = join(tmpdir(), 'canvas');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
}
export function getTransportConfig() {
    const plat = platform();
    if (plat === 'win32') {
        return {
            type: 'pipe',
            path: `\\\\.\\pipe\\${PIPE_NAME}`,
        };
    }
    const stateDir = getStateDir();
    return {
        type: 'unix',
        path: join(stateDir, SOCKET_NAME),
    };
}
export function getSocketPath() {
    return getTransportConfig().path;
}
export function getPidFilePath() {
    return join(getStateDir(), 'canvas.pid');
}
//# sourceMappingURL=index.js.map