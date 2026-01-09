export type RequestId = `req_${string}`;
export type OutputFormat = 'text' | 'json' | 'yaml' | 'ndjson';
export interface ClientInfo {
    name: string;
    version: string;
}
export interface RequestMeta {
    cwd: string;
    format: OutputFormat;
    protocolVersion: string;
    client: ClientInfo;
}
export type MethodName = 'ping' | 'daemon.status' | 'daemon.stop' | 'connect' | 'disconnect' | 'status' | 'screenshot.viewport' | 'screenshot.element' | 'describe' | 'dom' | 'styles' | 'a11y' | 'diff' | 'watch.subscribe' | 'watch.unsubscribe';
export interface Request<P = unknown> {
    id: RequestId;
    method: MethodName;
    params: P;
    meta: RequestMeta;
}
export interface SuccessResponse<R = unknown> {
    id: RequestId;
    ok: true;
    result: R;
}
export interface ErrorData {
    category: string;
    retryable: boolean;
    param?: string;
    suggestion?: string;
}
export interface ErrorInfo {
    code: number;
    message: string;
    data: ErrorData;
}
export interface ErrorResponse {
    id: RequestId;
    ok: false;
    error: ErrorInfo;
}
export type Response<R = unknown> = SuccessResponse<R> | ErrorResponse;
export declare function generateRequestId(): RequestId;
export declare function isSuccessResponse<R>(response: Response<R>): response is SuccessResponse<R>;
export declare function isErrorResponse(response: Response): response is ErrorResponse;
//# sourceMappingURL=index.d.ts.map