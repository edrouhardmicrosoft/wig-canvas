import {
  ErrorCodes,
  createError,
  createDaemonError,
  createSelectorError,
  createTimeoutError,
  createInputError,
  createInternalError,
  type CanvasError,
} from '../errors/index.js';

const daemonError: CanvasError = createDaemonError(
  ErrorCodes.DAEMON_NOT_RUNNING,
  'Daemon is not running',
  { retryable: true, suggestion: 'Run canvas daemon start' }
);
console.log(daemonError.code);

const transportError: CanvasError = createError(
  ErrorCodes.TRANSPORT_CONNECT_FAILED,
  'Could not connect to socket',
  { category: 'transport', retryable: true }
);
console.log(transportError.code);

const timeoutError: CanvasError = createTimeoutError(
  ErrorCodes.TIMEOUT_NAVIGATION,
  'Page navigation timed out',
  { retryable: true }
);
console.log(timeoutError.code);

const selectorError: CanvasError = createSelectorError(
  ErrorCodes.SELECTOR_NOT_FOUND,
  'Element not found',
  '.hero',
  { suggestion: "Try '.hero-section' instead" }
);
console.log(selectorError.code);

const filesystemError: CanvasError = createError(
  ErrorCodes.FILESYSTEM_WRITE_FAILED,
  'Could not write screenshot',
  { category: 'filesystem', retryable: false, param: 'out' }
);
console.log(filesystemError.code);

const inputError: CanvasError = createInputError(
  ErrorCodes.INPUT_TIMESTAMP_INVALID,
  'Invalid timestamp format',
  'since',
  { suggestion: 'Use ISO 8601 format or "last"' }
);
console.log(inputError.code);

const internalError: CanvasError = createInternalError('Unexpected state');
console.log(internalError.code);
