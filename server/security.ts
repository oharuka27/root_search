import type { Env } from "./env";
export const MAX_BODY_BYTES = 16 * 1024;
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request, appOrigin?: string): void {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const workersDomain =
    url.hostname.endsWith(".workers.dev") && url.protocol === "https:";
  const configured = appOrigin ? new URL(appOrigin).origin : undefined;
  if (!local && !workersDomain && url.origin !== configured)
    throw new RequestError(403, "Host is not allowed");
  const origin = request.headers.get("Origin");
  // Public, read-only non-browser MCP clients are supported. CORS is not authentication.
  if (origin !== null && origin !== url.origin)
    throw new RequestError(403, "Origin is not allowed");
  if (request.headers.get("Sec-Fetch-Site") === "cross-site")
    throw new RequestError(403, "Cross-site request is not allowed");
}
export async function readBody(request: Request): Promise<string> {
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new RequestError(415, "Content-Type must be application/json");
  const length = Number(request.headers.get("Content-Length"));
  if (length > MAX_BODY_BYTES)
    throw new RequestError(413, "Request is too large");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "JSON body is required");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413, "Request is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    JSON.parse(text);
  } catch {
    throw new RequestError(400, "Invalid JSON");
  }
  return text;
}
export async function rateKey(request: Request): Promise<string> {
  // Cloudflare supplies this header at the edge. No identity is persisted by the application.
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const bytes = new TextEncoder().encode(
    `${new Date().toISOString().slice(0, 10)}:${ip}`,
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function allowLive(env: Env, key: string): Promise<boolean> {
  if (!(await env.LIVE_LIMITER.limit({ key })).success) return false;
  return (await env.OVERPASS_LIMITER.limit({ key: "overpass" })).success;
}
export function privateResponse(response: Response): Response {
  const copy = new Response(response.body, response);
  copy.headers.set("Cache-Control", "no-store");
  copy.headers.set("X-Content-Type-Options", "nosniff");
  copy.headers.set("Referrer-Policy", "no-referrer");
  return copy;
}
