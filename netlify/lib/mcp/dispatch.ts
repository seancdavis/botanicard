import {
  ERROR_CODES,
  error,
  isNotification,
  isRequest,
  success,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./protocol";
import { tools, toolsByName } from "./tools";

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = { name: "botanicard", version: "0.1.0" };

interface ToolContent {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

function wrapToolResult(value: unknown): ToolResult {
  if (
    value &&
    typeof value === "object" &&
    "content" in value &&
    Array.isArray((value as { content: unknown }).content)
  ) {
    return value as ToolResult;
  }
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function toolError(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

const MAX_LOGGED_STRING = 500;

export function summarizeArgs(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === "string" && v.length > MAX_LOGGED_STRING) {
      out[k] = `${v.slice(0, 60)}...<${v.length} chars>`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function callTool(params: unknown): Promise<ToolResult> {
  if (!params || typeof params !== "object") {
    return toolError("Error: Invalid tool call params");
  }
  const { name, arguments: args } = params as {
    name?: string;
    arguments?: unknown;
  };
  if (typeof name !== "string") {
    return toolError("Error: Missing tool name");
  }
  const tool = toolsByName.get(name);
  if (!tool) {
    return toolError(`Error: Unknown tool: ${name}`);
  }

  const callArgs =
    args && typeof args === "object"
      ? (args as Record<string, unknown>)
      : {};

  console.info("[MCP]", name, JSON.stringify(summarizeArgs(callArgs)));
  try {
    const result = await tool.handler(callArgs);
    console.info("[MCP]", name, "ok");
    return wrapToolResult(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.info("[MCP]", name, "error:", message);
    return toolError(`Error: ${message}`);
  }
}

export async function dispatch(
  msg: unknown,
): Promise<JsonRpcResponse | null> {
  if (!isRequest(msg)) {
    return error(null, ERROR_CODES.INVALID_REQUEST, "Invalid request");
  }

  const req = msg as JsonRpcRequest;
  const id = req.id ?? null;

  // Notifications get no response
  if (isNotification(req)) {
    return null;
  }

  try {
    switch (req.method) {
      case "initialize":
        return success(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        });

      case "tools/list":
        return success(id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });

      case "tools/call":
        return success(id, await callTool(req.params));

      case "ping":
        return success(id, {});

      default:
        return error(
          id,
          ERROR_CODES.METHOD_NOT_FOUND,
          `Method not found: ${req.method}`,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[MCP] dispatch error:", err);
    return error(id, ERROR_CODES.INTERNAL_ERROR, message);
  }
}
