import { createMcpHandler } from "agents/mcp/server";
import { createServer } from "./mcp";
import type { Env } from "./env";
import {
  checkOrigin,
  privateResponse,
  rateKey,
  readBody,
  RequestError,
} from "./security";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      if (url.pathname.startsWith("/mcp/"))
        return privateResponse(new Response("Not found", { status: 404 }));
      return env.ASSETS.fetch(request);
    }
    try {
      checkOrigin(request, env.APP_ORIGIN);
      if (request.method !== "POST")
        return privateResponse(
          new Response("Method not allowed", {
            status: 405,
            headers: { Allow: "POST" },
          }),
        );
      const key = await rateKey(request);
      if (!(await env.MCP_LIMITER.limit({ key })).success)
        return privateResponse(
          new Response("少し時間をおいてから再検索してください。", {
            status: 429,
            headers: { "Retry-After": "60" },
          }),
        );
      const body = await readBody(request);
      const headers = new Headers(request.headers);
      headers.delete("Content-Length");
      const bounded = new Request(request.url, {
        method: "POST",
        headers,
        body,
        signal: request.signal,
      });
      const handler = createMcpHandler(() => createServer(env, key), {
        route: "/mcp",
        responseMode: "json",
        corsOptions: false,
        // Exact origin and the deployment host were already validated above.
        allowedHostnames: [url.hostname],
        allowedOriginHostnames: [url.hostname],
      });
      return privateResponse(await handler(bounded, env, ctx));
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const message =
        error instanceof RequestError ? error.message : "MCP request failed";
      return privateResponse(Response.json({ error: message }, { status }));
    }
  },
} satisfies ExportedHandler<Env>;
