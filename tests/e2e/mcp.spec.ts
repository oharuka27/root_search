import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
test("MCP rejects untrusted origins and oversized search regions", async ({
  request,
  baseURL,
}) => {
  const forbidden = await request.post("/mcp", {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  });
  expect(forbidden.status()).toBe(403);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL("/mcp", baseURL)),
    );
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toContain("find_spots");
    const result = await client.callTool({
      name: "find_spots",
      arguments: {
        mode: "sample",
        south: 34.55,
        north: 34.85,
        west: 135.35,
        east: 135.65,
      },
    });
    expect(result.isError).toBe(true);
  } finally {
    await client.close();
  }
});
test("live Overpass smoke test (opt-in)", async ({ baseURL }) => {
  test.skip(
    !process.env.RUN_LIVE,
    "External service availability is not part of the default test suite.",
  );
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL("/mcp", baseURL)),
    );
    const result = await client.callTool({
      name: "find_spots",
      arguments: {
        mode: "live",
        south: 34.69,
        north: 34.71,
        west: 135.49,
        east: 135.51,
      },
    });
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(
      (result.content as Array<{ text: string }>)[0].text,
    );
    expect(data.spots.length).toBeGreaterThan(0);
    expect(
      data.spots.every((s: { source: string }) => s.source === "osm"),
    ).toBe(true);
    console.log(`Live OSM spots received: ${data.spots.length}`);
  } finally {
    await client.close();
  }
});

test("Worker routes MCP before SPA fallback and enforces HTTP guards", async ({
  request,
}) => {
  const navigation = await request.get("/mcp", {
    headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
  });
  expect(navigation.status()).toBe(405);
  expect(navigation.headers()["cache-control"]).toBe("no-store");
  expect((await request.get("/mcp/unknown")).status()).toBe(404);
  const malformed = await request.post("/mcp", {
    headers: { "Content-Type": "application/json" },
    data: "{bad",
  });
  expect(malformed.status()).toBe(400);
  const large = await request.post("/mcp", {
    data: { text: "あ".repeat(6000) },
  });
  expect(large.status()).toBe(413);
  const wrongType = await request.post("/mcp", {
    headers: { "Content-Type": "text/plain" },
    data: "{}",
  });
  expect(wrongType.status()).toBe(415);
  expect(wrongType.headers()["access-control-allow-origin"]).toBeUndefined();
});
