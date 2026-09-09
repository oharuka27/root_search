import { describe, it, expect, vi } from "vitest";
import {
  checkOrigin,
  readBody,
  MAX_BODY_BYTES,
  rateKey,
  allowLive,
  privateResponse,
} from "../server/security";
import type { Env } from "../server/env";
const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://yorimichi.account.workers.dev/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
describe("public Worker request protection", () => {
  it("allows same-origin Workers and configured custom domains, rejecting cross-origin and arbitrary hosts", () => {
    expect(() =>
      checkOrigin(
        request("{}", { Origin: "https://yorimichi.account.workers.dev" }),
      ),
    ).not.toThrow();
    expect(() =>
      checkOrigin(
        request("{}", { Origin: "https://another.account.workers.dev" }),
      ),
    ).toThrow("Origin");
    expect(() => checkOrigin(request("{}", { Origin: "null" }))).toThrow(
      "Origin",
    );
    expect(() =>
      checkOrigin(new Request("https://untrusted.example/mcp")),
    ).toThrow("Host");
    expect(() =>
      checkOrigin(
        new Request("https://walk.example/mcp", {
          headers: { Origin: "https://walk.example" },
        }),
        "https://walk.example",
      ),
    ).not.toThrow();
    expect(() =>
      checkOrigin(
        new Request("http://127.0.0.1:5173/mcp", {
          headers: { Origin: "http://127.0.0.1:4000" },
        }),
      ),
    ).toThrow("Origin");
  });
  it("checks the actual UTF-8 byte size even when Content-Length is absent or false", async () => {
    const body = JSON.stringify({ text: "あ".repeat(6000) });
    await expect(readBody(request(body))).rejects.toMatchObject({
      status: 413,
    });
    await expect(
      readBody(request(body, { "Content-Length": "2" })),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readBody(request("{}", { "Content-Length": String(MAX_BODY_BYTES + 1) })),
    ).rejects.toMatchObject({ status: 413 });
    await expect(readBody(request("{invalid"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      readBody(request("{}", { "Content-Type": "text/plain" })),
    ).rejects.toMatchObject({ status: 415 });
    await expect(readBody(request('{"mode":"sample"}'))).resolves.toBe(
      '{"mode":"sample"}',
    );
  });
  it("derives rate keys from edge metadata, without placing the raw IP or user data in the key", async () => {
    const a = await rateKey(request("{}", { "CF-Connecting-IP": "192.0.2.1" }));
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain("192.0.2.1");
    expect(
      await rateKey(request("{}", { "CF-Connecting-IP": "192.0.2.2" })),
    ).not.toBe(a);
  });
  it("limits live lookups per network and per edge location before fetching", async () => {
    const shared = vi.fn().mockResolvedValue({ success: true });
    const env = {
      LIVE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) },
      OVERPASS_LIMITER: { limit: shared },
    } as unknown as Env;
    expect(await allowLive(env, "key")).toBe(false);
    expect(shared).not.toHaveBeenCalled();
    vi.mocked(env.LIVE_LIMITER.limit).mockResolvedValue({ success: true });
    shared.mockResolvedValue({ success: false });
    expect(await allowLive(env, "key")).toBe(false);
    expect(shared).toHaveBeenCalledWith({ key: "overpass" });
  });
  it("prevents response caching without stripping protocol and retry headers", () => {
    const response = privateResponse(
      new Response("busy", { status: 429, headers: { "Retry-After": "60" } }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
