export const PROTOCOL_VERSION = '1.0.0';
export const DAEMON_VERSION = '0.0.0';
export const CLI_VERSION = '0.0.0';

export function parseVersion(
  version: string
): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return {
    major: parseInt(match[1] ?? '0', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
  };
}

export function isCompatible(clientVersion: string, daemonVersion: string): boolean {
  const client = parseVersion(clientVersion);
  const daemon = parseVersion(daemonVersion);

  if (!client || !daemon) return false;

  return client.major === daemon.major;
}
