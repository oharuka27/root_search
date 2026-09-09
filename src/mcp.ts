import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import type { Place, Spot } from "../shared/data";
const resultSchema = z.object({
  spots: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      category: z.enum(["park", "cafe", "cat"]),
      description: z.string(),
      stay: z.number(),
      source: z.enum(["sample", "osm"]),
    }),
  ),
});
export async function fetchSpots(
  start: Place,
  end: Place,
  mode: "sample" | "live",
): Promise<Spot[]> {
  const client = new Client({ name: "yorimichi-browser", version: "1.0.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL("/mcp", window.location.origin),
      ),
    );
    // Round outward to a coarse area; never transmit labels or exact endpoint coordinates.
    const result = await client.callTool({
      name: "find_spots",
      arguments: {
        mode,
        south: Math.max(
          34.55,
          Math.floor((Math.min(start.lat, end.lat) - 0.008) * 100) / 100,
        ),
        north: Math.min(
          34.85,
          Math.ceil((Math.max(start.lat, end.lat) + 0.008) * 100) / 100,
        ),
        west: Math.max(
          135.35,
          Math.floor((Math.min(start.lng, end.lng) - 0.008) * 100) / 100,
        ),
        east: Math.min(
          135.65,
          Math.ceil((Math.max(start.lng, end.lng) + 0.008) * 100) / 100,
        ),
      },
    });
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((c) => c.type === "text")?.text;
    if (result.isError) throw new Error(text || "MCPエラー");
    return resultSchema.parse(JSON.parse(text || "{}")).spots;
  } catch (error) {
    if (error instanceof StreamableHTTPError && error.code === 429) {
      throw new Error(
        "アクセスが集中しています。1分ほど待ってから再検索してください。",
      );
    }
    throw error;
  } finally {
    await client.close();
  }
}
