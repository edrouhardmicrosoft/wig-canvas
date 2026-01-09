export const ErrorCodes = {
    DAEMON_NOT_RUNNING: 1001,
    DAEMON_ALREADY_RUNNING: 1002,
    TRANSPORT_CONNECT_FAILED: 1003,
    TRANSPORT_CLOSED: 1004,
    HANDSHAKE_FAILED: 1005,
    PROTOCOL_VERSION_MISMATCH: 1006,
    TIMEOUT_NAVIGATION: 2001,
    TIMEOUT_SELECTOR: 2002,
    TIMEOUT_BROWSER: 2003,
    NAVIGATION_TIMEOUT: 2004,
    NAVIGATION_FAILED: 2005,
    PAGE_NOT_READY: 2006,
    BROWSER_NOT_READY: 2007,
    SELECTOR_INVALID: 3001,
    SELECTOR_NOT_FOUND: 3002,
    SELECTOR_AMBIGUOUS: 3003,
    DOM_ACCESS_FAILED: 3004,
    FILESYSTEM_WRITE_FAILED: 4001,
    FILESYSTEM_READ_FAILED: 4002,
    ARTIFACT_PATH_INVALID: 4003,
    ARTIFACT_NOT_FOUND: 4004,
    INPUT_INVALID: 5001,
    INPUT_MISSING: 5002,
    INPUT_TIMESTAMP_INVALID: 5003,
    INPUT_ENUM_INVALID: 5004,
    INPUT_CONSTRAINT_VIOLATED: 5005,
    INTERNAL_ERROR: 9001,
    UNEXPECTED_ERROR: 9002,
};
export function createError(code, message, data) {
    return { code, message, data };
}
export function createDaemonError(code, message, options = {}) {
    return createError(code, message, {
        category: 'daemon',
        retryable: options.retryable ?? false,
        suggestion: options.suggestion,
    });
}
export function createSelectorError(code, message, selector, options = {}) {
    return createError(code, message, {
        category: 'selector',
        retryable: true,
        param: 'selector',
        suggestion: options.suggestion ?? `Selector '${selector}' failed.`,
    });
}
export function createTimeoutError(code, message, options = {}) {
    return createError(code, message, {
        category: 'timeout',
        retryable: options.retryable ?? true,
        suggestion: options.suggestion,
    });
}
export function createInputError(code, message, param, options = {}) {
    return createError(code, message, {
        category: 'input',
        retryable: false,
        param,
        suggestion: options.suggestion,
    });
}
export function createInternalError(message) {
    return createError(ErrorCodes.INTERNAL_ERROR, message, {
        category: 'internal',
        retryable: false,
    });
}
//# sourceMappingURL=index.js.map