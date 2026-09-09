import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { sampleSpots, type Spot } from "../shared/data";
import type { Env } from "./env";
import { allowLive } from "./security";
export function createServer(env: Env, clientKey: string) {
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
        if (!(await allowLive(env, clientKey)))
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "少し時間をおいてから再検索してください。",
              },
            ],
          };
        try {
          const bbox = `${south},${west},${north},${east}`;
          const query = `[out:json][timeout:20];(nwr[leisure=park](${bbox});nwr[amenity=cafe](${bbox}););out center 200;`;
          const url = new URL(
            env.OVERPASS_URL || "https://overpass-api.de/api/interpreter",
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
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ spots }) }] };
    },
  );
  return server;
}
