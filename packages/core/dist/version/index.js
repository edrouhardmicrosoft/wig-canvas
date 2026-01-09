export const PROTOCOL_VERSION = '1.0.0';
export const DAEMON_VERSION = '0.0.0';
export const CLI_VERSION = '0.0.0';
export function parseVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
    if (!match)
        return null;
    return {
        major: parseInt(match[1] ?? '0', 10),
        minor: parseInt(match[2] ?? '0', 10),
        patch: parseInt(match[3] ?? '0', 10),
    };
}
export function isCompatible(clientVersion, daemonVersion) {
    const client = parseVersion(clientVersion);
    const daemon = parseVersion(daemonVersion);
    if (!client || !daemon)
        return false;
    return client.major === daemon.major;
}
//# sourceMappingURL=index.js.map