export declare const PROTOCOL_VERSION = "1.0.0";
export declare const DAEMON_VERSION = "0.0.0";
export declare const CLI_VERSION = "0.0.0";
export declare function parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
} | null;
export declare function isCompatible(clientVersion: string, daemonVersion: string): boolean;
//# sourceMappingURL=index.d.ts.map