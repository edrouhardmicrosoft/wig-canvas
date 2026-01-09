export function generateRequestId() {
    const timestamp = String(Date.now());
    const random = Math.random().toString(36).slice(2, 8);
    return `req_${timestamp}_${random}`;
}
export function isSuccessResponse(response) {
    return response.ok;
}
export function isErrorResponse(response) {
    return !response.ok;
}
//# sourceMappingURL=index.js.map