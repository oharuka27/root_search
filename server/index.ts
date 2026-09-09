import express from "express";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { sampleSpots, type Spot } from "../shared/data.js";
// Allow intercontinental connections to establish before trying another IP.
setDefaultAutoSelectFamilyAttemptTimeout(2000);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use("/mcp", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  const allowed = (
    process.env.ALLOWED_ORIGINS ||
    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3001,http://localhost:3001"
  ).split(",");
  if (origin && !allowed.includes(origin)) {
    res.status(403).json({ error: "Origin is not allowed" });
    return;
  }
  if (!["127.0.0.1", "localhost"].includes(req.hostname)) {
    res.status(403).json({ error: "Host is not allowed" });
    return;
  }
  next();
});
let activeLive = false;
let lastLive = 0;
function createServer() {
  const server = new McpServer({ name: "yorimichi-osaka", version: "1.0.0" });
  server.registerTool(
    "find_spots",
    {
      description:
        "大阪市周辺の公園・喫茶店・猫カフェを取得。住所・自宅・履歴は受け取らない。",
      inputSchema: {
        mode: z.enum(["sample", "live"]),
        south: z.number().min(34.55).max(34.85),
        west: z.number().min(135.35).max(135.65),
        north: z.number().min(34.55).max(34.85),
        east: z.number().min(135.35).max(135.65),
      },
    },
    async ({ mode, south, west, north, east }) => {
      if (
        north <= south ||
        east <= west ||
        north - south > 0.15 ||
        east - west > 0.15
      )
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "検索範囲が広すぎます。出発地と目的地を近づけてください。",
            },
          ],
        };
      let spots: Spot[];
      if (mode === "sample")
        spots = sampleSpots.filter(
          (s) =>
            s.lat >= south && s.lat <= north && s.lng >= west && s.lng <= east,
        );
      else {
        if (activeLive || Date.now() - lastLive < 2000)
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "少し時間をおいてから再検索してください。",
              },
            ],
          };
        activeLive = true;
        lastLive = Date.now();
        try {
          const bbox = `${south},${west},${north},${east}`;
          const query = `[out:json][timeout:20];(nwr[leisure=park](${bbox});nwr[amenity=cafe](${bbox}););out center 200;`;
          const url = new URL(
            process.env.OVERPASS_URL ||
              "https://overpass-api.de/api/interpreter",
          );
          url.searchParams.set("data", query);
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
              "User-Agent": "Yorimichi/1.0 (Osaka walking planner)",
            },
            signal: AbortSignal.timeout(25000),
          });
          if (!response.ok) throw new Error("upstream");
          const data = (await response.json()) as {
            elements: Array<{
              type: string;
              id: number;
              lat?: number;
              lon?: number;
              center?: { lat: number; lon: number };
              tags?: Record<string, string>;
            }>;
            remark?: string;
          };
          if (data.remark) throw new Error("partial");
          spots = data.elements.flatMap((e) => {
            const tags = e.tags || {};
            const lat = e.lat ?? e.center?.lat;
            const lng = e.lon ?? e.center?.lon;
            if (!tags.name || lat === undefined || lng === undefined) return [];
            const cat =
              tags["cafe"] === "cat" ||
              /猫|ねこ|ネコ|cat café|cat cafe/i.test(tags.name);
            const category =
              tags.leisure === "park" ? "park" : cat ? "cat" : "cafe";
            return [
              {
                id: `${e.type}/${e.id}`,
                name: tags["name:ja"] || tags.name,
                lat,
                lng,
                category,
                description:
                  "OpenStreetMapの登録情報です。営業状況・利用条件は訪問前に確認してください。",
                stay: category === "park" ? 15 : 25,
                source: "osm",
              } as Spot,
            ];
          });
        } catch {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "スポットを取得できませんでした。しばらく待つか、サンプルに切り替えてください。",
              },
            ],
          };
        } finally {
          activeLive = false;
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ spots }) }] };
    },
  );
  return server;
}
app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
  }
});
app.all("/mcp", (_req, res) => {
  res.status(405).end();
});
app.use(express.static("dist"));
app.listen(3001, "127.0.0.1", () =>
  console.log("よりみち: http://127.0.0.1:3001 · MCP /mcp"),
);
