export type ErrorCategory = 'daemon' | 'transport' | 'handshake' | 'timeout' | 'navigation' | 'browser' | 'selector' | 'dom' | 'filesystem' | 'artifact' | 'input' | 'validation' | 'internal';
export interface CanvasErrorData {
    category: ErrorCategory;
    retryable: boolean;
    param?: string;
    suggestion?: string;
}
export interface CanvasError {
    code: number;
    message: string;
    data: CanvasErrorData;
}
export declare const ErrorCodes: {
    readonly DAEMON_NOT_RUNNING: 1001;
    readonly DAEMON_ALREADY_RUNNING: 1002;
    readonly TRANSPORT_CONNECT_FAILED: 1003;
    readonly TRANSPORT_CLOSED: 1004;
    readonly HANDSHAKE_FAILED: 1005;
    readonly PROTOCOL_VERSION_MISMATCH: 1006;
    readonly TIMEOUT_NAVIGATION: 2001;
    readonly TIMEOUT_SELECTOR: 2002;
    readonly TIMEOUT_BROWSER: 2003;
    readonly NAVIGATION_TIMEOUT: 2004;
    readonly NAVIGATION_FAILED: 2005;
    readonly PAGE_NOT_READY: 2006;
    readonly BROWSER_NOT_READY: 2007;
    readonly SELECTOR_INVALID: 3001;
    readonly SELECTOR_NOT_FOUND: 3002;
    readonly SELECTOR_AMBIGUOUS: 3003;
    readonly DOM_ACCESS_FAILED: 3004;
    readonly FILESYSTEM_WRITE_FAILED: 4001;
    readonly FILESYSTEM_READ_FAILED: 4002;
    readonly ARTIFACT_PATH_INVALID: 4003;
    readonly ARTIFACT_NOT_FOUND: 4004;
    readonly INPUT_INVALID: 5001;
    readonly INPUT_MISSING: 5002;
    readonly INPUT_TIMESTAMP_INVALID: 5003;
    readonly INPUT_ENUM_INVALID: 5004;
    readonly INPUT_CONSTRAINT_VIOLATED: 5005;
    readonly INTERNAL_ERROR: 9001;
    readonly UNEXPECTED_ERROR: 9002;
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export declare function createError(code: ErrorCode, message: string, data: CanvasErrorData): CanvasError;
export declare function createDaemonError(code: ErrorCode, message: string, options?: {
    retryable?: boolean;
    suggestion?: string;
}): CanvasError;
export declare function createSelectorError(code: ErrorCode, message: string, selector: string, options?: {
    suggestion?: string;
}): CanvasError;
export declare function createTimeoutError(code: ErrorCode, message: string, options?: {
    retryable?: boolean;
    suggestion?: string;
}): CanvasError;
export declare function createInputError(code: ErrorCode, message: string, param: string, options?: {
    suggestion?: string;
}): CanvasError;
export declare function createInternalError(message: string): CanvasError;
//# sourceMappingURL=index.d.ts.map