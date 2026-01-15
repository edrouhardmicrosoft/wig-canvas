#!/usr/bin/env node

import { createConnection } from 'node:net';
import {
  type MethodName,
  type Request,
  type Response,
  CLI_VERSION,
  PROTOCOL_VERSION,
  ErrorCodes,
  generateRequestId,
  getSocketPath,
} from '@wig/canvas-core';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; structuredContent?: unknown };

type ToolCallArgs = Record<string, unknown>;

const tools: Tool[] = [
  {
    name: 'connect',
    description: 'Connect to a URL and open a browser session.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        watchPaths: { type: 'array', items: { type: 'string' } },
        browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'] },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
        cwd: { type: 'string' },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'disconnect',
    description: 'Disconnect from the current browser session.',
    inputSchema: { type: 'object', additionalProperties: false },
  },
  {
    name: 'status',
    description: 'Get current session status.',
    inputSchema: { type: 'object', additionalProperties: false },
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the viewport or an element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        out: { type: 'string' },
        inline: { type: 'boolean' },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
        cwd: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'describe',
    description: 'Get a natural language description of an element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
      },
      required: ['selector'],
      additionalProperties: false,
    },
  },
  {
    name: 'dom',
    description: 'Get DOM accessibility snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        depth: { type: 'integer' },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'styles',
    description: 'Get computed styles for an element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        props: { type: 'array', items: { type: 'string' } },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
      },
      required: ['selector'],
      additionalProperties: false,
    },
  },
  {
    name: 'context',
    description: 'Get full inspection context (screenshot, describe, dom, styles).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        depth: { type: 'integer' },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
        cwd: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'diff',
    description: 'Compare current screenshot against a baseline and output a visual diff.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        since: { type: 'string' },
        threshold: { type: 'number' },
        cwd: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'a11y',
    description: 'Run accessibility checks on the page or selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        level: { type: 'string', enum: ['A', 'AA', 'AAA'] },
        timeoutMs: { type: 'integer' },
        retries: { type: 'integer' },
        backoffMs: { type: 'integer' },
      },
      additionalProperties: false,
    },
  },
];

function toToolResult(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

function errorResponse(
  message: string,
  code: number,
  category: string,
  options?: { suggestion?: string; retryable?: boolean }
): Response {
  return {
    id: generateRequestId(),
    ok: false,
    error: {
      code,
      message,
      data: {
        category,
        retryable: options?.retryable ?? false,
        suggestion: options?.suggestion,
      },
    },
  };
}

async function sendDaemonRequest<R>(
  method: MethodName,
  params: unknown,
  options?: { cwd?: string; format?: 'json' | 'text' | 'yaml' | 'ndjson' }
): Promise<Response<R>> {
  const request: Request = {
    id: generateRequestId(),
    method,
    params,
    meta: {
      cwd: options?.cwd ?? process.cwd(),
      format: options?.format ?? 'json',
      protocolVersion: PROTOCOL_VERSION,
      client: { name: 'canvas-mcp', version: CLI_VERSION },
    },
  };

  const socketPath = getSocketPath();
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    let buffer = '';

    socket.on('connect', () => {
      socket.write(JSON.stringify(request) + '\n');
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line) as Response<R>;
          socket.end();
          resolve(response);
        } catch (err) {
          socket.end();
          reject(err instanceof Error ? err : new Error('Failed to parse response'));
        }
      }
    });
  });
}

async function callTool(name: string, args: ToolCallArgs): Promise<ToolResult> {
  try {
    switch (name) {
      case 'connect': {
        const response = await sendDaemonRequest(
          'connect',
          {
            url: args.url,
            watchPaths: args.watchPaths,
            browser: args.browser,
            timeoutMs: args.timeoutMs,
            retries: args.retries,
            backoffMs: args.backoffMs,
          },
          { cwd: args.cwd as string | undefined }
        );
        return toToolResult(response);
      }
      case 'disconnect': {
        return toToolResult(await sendDaemonRequest('disconnect', {}));
      }
      case 'status': {
        return toToolResult(await sendDaemonRequest('status', {}));
      }
      case 'screenshot': {
        const method: MethodName = args.selector ? 'screenshot.element' : 'screenshot.viewport';
        const params = args.selector
          ? {
              selector: args.selector,
              out: args.out,
              inline: args.inline,
              timeoutMs: args.timeoutMs,
              retries: args.retries,
              backoffMs: args.backoffMs,
            }
          : {
              out: args.out,
              inline: args.inline,
              timeoutMs: args.timeoutMs,
              retries: args.retries,
              backoffMs: args.backoffMs,
            };
        return toToolResult(
          await sendDaemonRequest(method, params, { cwd: args.cwd as string | undefined })
        );
      }
      case 'describe': {
        return toToolResult(
          await sendDaemonRequest('describe', {
            selector: args.selector,
            timeoutMs: args.timeoutMs,
            retries: args.retries,
            backoffMs: args.backoffMs,
          })
        );
      }
      case 'dom': {
        return toToolResult(
          await sendDaemonRequest('dom', {
            selector: args.selector,
            depth: args.depth,
            timeoutMs: args.timeoutMs,
            retries: args.retries,
            backoffMs: args.backoffMs,
          })
        );
      }
      case 'styles': {
        return toToolResult(
          await sendDaemonRequest('styles', {
            selector: args.selector,
            props: args.props,
            timeoutMs: args.timeoutMs,
            retries: args.retries,
            backoffMs: args.backoffMs,
          })
        );
      }
      case 'context': {
        return toToolResult(
          await sendDaemonRequest(
            'context',
            {
              selector: args.selector,
              depth: args.depth,
              timeoutMs: args.timeoutMs,
              retries: args.retries,
              backoffMs: args.backoffMs,
            },
            { cwd: args.cwd as string | undefined }
          )
        );
      }
      case 'diff': {
        return toToolResult(
          await sendDaemonRequest(
            'diff',
            {
              selector: args.selector,
              since: args.since,
              threshold: args.threshold,
            },
            { cwd: args.cwd as string | undefined }
          )
        );
      }
      case 'a11y': {
        return toToolResult(
          await sendDaemonRequest('a11y', {
            selector: args.selector,
            level: args.level,
            timeoutMs: args.timeoutMs,
            retries: args.retries,
            backoffMs: args.backoffMs,
          })
        );
      }
      default: {
        return toToolResult(
          errorResponse(`Unknown tool: ${name}`, ErrorCodes.INPUT_INVALID, 'input')
        );
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
      return toToolResult(
        errorResponse(
          'Daemon is not running. Start it with: canvas daemon start',
          ErrorCodes.TRANSPORT_CONNECT_FAILED,
          'transport',
          {
            suggestion: 'Run: canvas daemon start',
            retryable: true,
          }
        )
      );
    }
    return toToolResult(
      errorResponse(`MCP tool failed: ${message}`, ErrorCodes.INTERNAL_ERROR, 'internal')
    );
  }
}

const server = new Server(
  { name: 'canvas-mcp', version: CLI_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: { params: { name: string; arguments?: unknown } }) => {
    const toolName = request.params.name;
    const args = (request.params.arguments ?? {}) as ToolCallArgs;
    return callTool(toolName, args);
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('canvas-mcp running on stdio');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
