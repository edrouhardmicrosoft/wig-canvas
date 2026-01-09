import type { Request, Response, MethodName } from '../protocol/index.js';
import type { SessionInfo } from '../types/index.js';
import { generateRequestId, isSuccessResponse, isErrorResponse } from '../protocol/index.js';

const _testRequest: Request<{ url: string }> = {
  id: generateRequestId(),
  method: 'connect' satisfies MethodName,
  params: { url: 'http://localhost:3000' },
  meta: {
    cwd: '/project',
    format: 'json',
    protocolVersion: '1.0.0',
    client: { name: 'canvas', version: '0.1.0' },
  },
};
console.log(_testRequest.id);

const _testSuccessResponse: Response<SessionInfo> = {
  id: 'req_123_abc',
  ok: true,
  result: {
    connected: true,
    url: 'http://localhost:3000',
  },
};

const _testErrorResponse: Response<SessionInfo> = {
  id: 'req_123_abc',
  ok: false,
  error: {
    code: 3001,
    message: 'Element not found',
    data: {
      category: 'selector',
      retryable: true,
      param: 'selector',
      suggestion: "Selector '.hero' not found. Try '.hero-section'.",
    },
  },
};

function _typeGuardTest(response: Response<SessionInfo>): void {
  if (isSuccessResponse(response)) {
    const _url: string | undefined = response.result.url;
    console.log(_url);
  } else if (isErrorResponse(response)) {
    const _code: number = response.error.code;
    console.log(_code);
  }
}

_typeGuardTest(_testSuccessResponse);
_typeGuardTest(_testErrorResponse);
