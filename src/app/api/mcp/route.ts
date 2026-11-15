import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getRepo } from "@/lib/db/fileRepo";
import { checkRateLimit } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";

const WRITE_TOOLS = new Set(["create_brief_draft", "request_changes", "reject_item", "approve_item"]);

function jsonRpcError(id: string | number | null, code: number, message: string, status = 400) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonRpcError(null, -32001, "Unauthorized: Missing or invalid Bearer token", 401);
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey) {
      return jsonRpcError(null, -32001, "Unauthorized: Empty Bearer token", 401);
    }

    const repo = await getRepo();
    const apiKey = await repo.verifyApiKey(rawKey);

    if (!apiKey || apiKey.revoked_at) {
      return jsonRpcError(null, -32001, "Unauthorized: Invalid or revoked API key", 401);
    }

    // IP allowlist check
    if (apiKey.ip_allowlist && apiKey.ip_allowlist.length > 0) {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
      if (!apiKey.ip_allowlist.includes(clientIp)) {
        return jsonRpcError(null, -32003, "Forbidden: IP address not in allowlist", 403);
      }
    }

    // Rate limit check (60 req/min per key)
    if (!checkRateLimit(apiKey.id)) {
      return jsonRpcError(null, -32002, "Too Many Requests: Rate limit exceeded (60 requests/minute)", 429);
    }

    // Read and parse request body safely
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {
      return jsonRpcError(null, -32700, "Parse error: Unable to read request body", 400);
    }

    let parsedBody: Record<string, unknown> | null = null;
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        return jsonRpcError(null, -32700, "Parse error: Invalid JSON", 400);
      }
    }

    // Pre-flight scope check for tool calls
    if (parsedBody && parsedBody.method === "tools/call") {
      const params = parsedBody.params as { name?: string } | undefined;
      const toolName = params?.name;

      if (toolName && WRITE_TOOLS.has(toolName)) {
        if (process.env.MCP_ALLOW_WRITES !== "true") {
          return jsonRpcError(
            (parsedBody.id as string | number) ?? null,
            -32601,
            "Write operations are disabled on this MCP server. Set MCP_ALLOW_WRITES=true to enable.",
            403
          );
        }

        if (!apiKey.scopes.includes("write")) {
          return jsonRpcError(
            (parsedBody.id as string | number) ?? null,
            -32003,
            "Forbidden: API key does not have write scope",
            403
          );
        }
      }
    }

    // Create MCP server & transport
    const server = createMcpServer(apiKey);
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });

    await server.connect(transport);

    // Normalize accept header so clients accepting application/json don't get 406
    const headers = new Headers(req.headers);
    const currentAccept = headers.get("accept") || "";
    if (!currentAccept.includes("text/event-stream")) {
      headers.set("accept", currentAccept ? `${currentAccept}, text/event-stream` : "application/json, text/event-stream");
    }

    const mcpRequest = new Request(req.url, {
      method: "POST",
      headers,
      body: bodyText,
    });

    const mcpResponse = await transport.handleRequest(mcpRequest);
    return mcpResponse;
  } catch {
    // Sanitized JSON-RPC error without stack trace
    return jsonRpcError(null, -32603, "Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonRpcError(null, -32001, "Unauthorized: Missing Bearer token", 401);
    }

    const rawKey = authHeader.slice(7).trim();
    const repo = await getRepo();
    const apiKey = await repo.verifyApiKey(rawKey);

    if (!apiKey || apiKey.revoked_at) {
      return jsonRpcError(null, -32001, "Unauthorized: Invalid or revoked API key", 401);
    }

    const server = createMcpServer(apiKey);
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });

    await server.connect(transport);

    const headers = new Headers(req.headers);
    const currentAccept = headers.get("accept") || "";
    if (!currentAccept.includes("text/event-stream")) {
      headers.set("accept", currentAccept ? `${currentAccept}, text/event-stream` : "application/json, text/event-stream");
    }

    const mcpRequest = new Request(req.url, {
      method: "GET",
      headers,
    });

    return await transport.handleRequest(mcpRequest);
  } catch {
    return jsonRpcError(null, -32603, "Internal server error", 500);
  }
}
