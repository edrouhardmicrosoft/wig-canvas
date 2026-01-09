import { ErrorCodes, createError, createDaemonError, createSelectorError, createTimeoutError, createInputError, createInternalError, } from '../errors/index.js';
const daemonError = createDaemonError(ErrorCodes.DAEMON_NOT_RUNNING, 'Daemon is not running', { retryable: true, suggestion: 'Run canvas daemon start' });
console.log(daemonError.code);
const transportError = createError(ErrorCodes.TRANSPORT_CONNECT_FAILED, 'Could not connect to socket', { category: 'transport', retryable: true });
console.log(transportError.code);
const timeoutError = createTimeoutError(ErrorCodes.TIMEOUT_NAVIGATION, 'Page navigation timed out', { retryable: true });
console.log(timeoutError.code);
const selectorError = createSelectorError(ErrorCodes.SELECTOR_NOT_FOUND, 'Element not found', '.hero', { suggestion: "Try '.hero-section' instead" });
console.log(selectorError.code);
const filesystemError = createError(ErrorCodes.FILESYSTEM_WRITE_FAILED, 'Could not write screenshot', { category: 'filesystem', retryable: false, param: 'out' });
console.log(filesystemError.code);
const inputError = createInputError(ErrorCodes.INPUT_TIMESTAMP_INVALID, 'Invalid timestamp format', 'since', { suggestion: 'Use ISO 8601 format or "last"' });
console.log(inputError.code);
const internalError = createInternalError('Unexpected state');
console.log(internalError.code);
//# sourceMappingURL=errors.typetest.js.map