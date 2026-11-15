import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiKey } from "@/lib/db/repo";
import { registerMcpTools } from "./tools";

export function createMcpServer(apiKey: ApiKey): McpServer {
  const server = new McpServer({
    name: "AdvertiseOS",
    version: "0.1.0",
  });

  registerMcpTools(server, { apiKey });

  return server;
}
