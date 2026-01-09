import { generateRequestId, isSuccessResponse, isErrorResponse } from '../protocol/index.js';
const _testRequest = {
    id: generateRequestId(),
    method: 'connect',
    params: { url: 'http://localhost:3000' },
    meta: {
        cwd: '/project',
        format: 'json',
        protocolVersion: '1.0.0',
        client: { name: 'canvas', version: '0.1.0' },
    },
};
console.log(_testRequest.id);
const _testSuccessResponse = {
    id: 'req_123_abc',
    ok: true,
    result: {
        connected: true,
        url: 'http://localhost:3000',
    },
};
const _testErrorResponse = {
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
function _typeGuardTest(response) {
    if (isSuccessResponse(response)) {
        const _url = response.result.url;
        console.log(_url);
    }
    else if (isErrorResponse(response)) {
        const _code = response.error.code;
        console.log(_code);
    }
}
_typeGuardTest(_testSuccessResponse);
_typeGuardTest(_testErrorResponse);
//# sourceMappingURL=protocol.typetest.js.map