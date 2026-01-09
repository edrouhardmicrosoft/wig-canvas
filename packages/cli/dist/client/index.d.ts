import { type Response, type MethodName } from '@wig/canvas-core';
export declare class DaemonClient {
    private socket;
    private socketPath;
    private pendingRequests;
    private buffer;
    constructor();
    connect(): Promise<void>;
    disconnect(): void;
    send<R>(method: MethodName, params: unknown): Promise<Response<R>>;
    private handleResponse;
}
export declare function withClient<T>(fn: (client: DaemonClient) => Promise<T>): Promise<T>;
//# sourceMappingURL=index.d.ts.map