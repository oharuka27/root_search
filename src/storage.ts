import { z } from "zod";
const place = z.object({
  id: z.string(),
  name: z.string().max(200),
  lat: z.number().min(34.55).max(34.85),
  lng: z.number().min(135.35).max(135.65),
  address: z.string().max(300).optional(),
});
const schema = z.object({
  home: place.nullable(),
  history: z.array(place).max(20),
  favorites: z.array(z.string()).max(500),
  external: z.boolean(),
});
export type Saved = z.infer<typeof schema>;
export const KEY = "yorimichi.private.v1";
export const empty: Saved = {
  home: null,
  history: [],
  favorites: [],
  external: false,
};
export function readSaved(): { data: Saved; error: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: empty, error: "" };
    return { data: schema.parse(JSON.parse(raw)), error: "" };
  } catch {
    return {
      data: empty,
      error:
        "保存データを読み込めませんでした。ブラウザの保存設定をご確認ください。",
    };
  }
}
export function writeSaved(data: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(schema.parse(data)));
    return "";
  } catch {
    return "ブラウザに保存できませんでした。今回の画面内でのみ保持します。";
  }
}
