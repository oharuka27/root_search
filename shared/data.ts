export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
};
export type Category = "park" | "cafe" | "cat";
export type Spot = Place & {
  category: Category;
  description: string;
  stay: number;
  source: "sample" | "osm";
};
export const categories: Record<Category, { label: string; icon: string }> = {
  park: { label: "公園", icon: "♧" },
  cafe: { label: "喫茶店", icon: "☕" },
  cat: { label: "猫スポット", icon: "♧" },
};
export const places: Place[] = [
  {
    id: "osaka",
    name: "大阪駅",
    lat: 34.7025,
    lng: 135.4959,
    address: "大阪市北区梅田",
  },
  {
    id: "nakanoshima",
    name: "中之島公園",
    lat: 34.6925,
    lng: 135.5066,
    address: "大阪市北区中之島",
  },
  {
    id: "namba",
    name: "なんば駅",
    lat: 34.6665,
    lng: 135.5,
    address: "大阪市中央区難波",
  },
  {
    id: "castle",
    name: "大阪城公園",
    lat: 34.6865,
    lng: 135.5262,
    address: "大阪市中央区大阪城",
  },
  {
    id: "tennoji",
    name: "天王寺駅",
    lat: 34.6473,
    lng: 135.5137,
    address: "大阪市天王寺区悲田院町",
  },
  {
    id: "nakazakicho",
    name: "中崎町駅",
    lat: 34.7066,
    lng: 135.5057,
    address: "大阪市北区中崎",
  },
  {
    id: "yodoyabashi",
    name: "淀屋橋駅",
    lat: 34.6924,
    lng: 135.5013,
    address: "大阪市中央区北浜",
  },
  {
    id: "shinsaibashi",
    name: "心斎橋駅",
    lat: 34.675,
    lng: 135.5003,
    address: "大阪市中央区心斎橋筋",
  },
  {
    id: "temmabashi",
    name: "天満橋駅",
    lat: 34.6901,
    lng: 135.5168,
    address: "大阪市中央区天満橋京町",
  },
  {
    id: "fukushima",
    name: "福島駅",
    lat: 34.6972,
    lng: 135.4869,
    address: "大阪市福島区福島",
  },
  {
    id: "ogimachi",
    name: "扇町公園",
    lat: 34.7044,
    lng: 135.5108,
    address: "大阪市北区扇町",
  },
  {
    id: "utsubo",
    name: "靱公園",
    lat: 34.6845,
    lng: 135.4926,
    address: "大阪市西区靱本町",
  },
];
// Sample cafe/cat venues are illustrative, not real business listings.
export const sampleSpots: Spot[] = [
  {
    id: "s1",
    name: "中之島公園",
    lat: 34.6925,
    lng: 135.5066,
    category: "park",
    description: "川沿いの緑を眺めて、ひと休み。水辺を歩く寄り道に。",
    stay: 15,
    source: "sample",
  },
  {
    id: "s2",
    name: "西天満の小さな喫茶店",
    lat: 34.6965,
    lng: 135.5038,
    category: "cafe",
    description: "ゆっくりコーヒーを楽しむ、喫茶店のサンプルスポット。",
    stay: 25,
    source: "sample",
  },
  {
    id: "s3",
    name: "お初天神そばの猫カフェ",
    lat: 34.699,
    lng: 135.501,
    category: "cat",
    description: "猫と過ごす寄り道をイメージしたサンプルスポット。",
    stay: 30,
    source: "sample",
  },
  {
    id: "s4",
    name: "扇町公園",
    lat: 34.7044,
    lng: 135.5108,
    category: "park",
    description: "街の真ん中で、空を見上げる時間。",
    stay: 15,
    source: "sample",
  },
  {
    id: "s5",
    name: "靱公園",
    lat: 34.6845,
    lng: 135.4926,
    category: "park",
    description: "木々に囲まれた散歩道で、少しだけ深呼吸。",
    stay: 20,
    source: "sample",
  },
  {
    id: "s6",
    name: "中崎町の路地裏喫茶",
    lat: 34.7055,
    lng: 135.505,
    category: "cafe",
    description: "路地を歩く楽しみを添えた、架空の喫茶店。",
    stay: 25,
    source: "sample",
  },
  {
    id: "s7",
    name: "北浜の水辺カフェ",
    lat: 34.691,
    lng: 135.508,
    category: "cafe",
    description: "水辺で休むプラン用の、架空のカフェ。",
    stay: 20,
    source: "sample",
  },
  {
    id: "s8",
    name: "大阪城公園",
    lat: 34.6865,
    lng: 135.5262,
    category: "park",
    description: "広い緑の中をのんびり歩く寄り道。",
    stay: 20,
    source: "sample",
  },
  {
    id: "s9",
    name: "なんばの猫カフェ",
    lat: 34.669,
    lng: 135.503,
    category: "cat",
    description: "猫カフェに立ち寄るプラン用の架空スポット。",
    stay: 30,
    source: "sample",
  },
  {
    id: "s10",
    name: "難波の小さな喫茶室",
    lat: 34.671,
    lng: 135.498,
    category: "cafe",
    description: "街歩きの途中にコーヒーを楽しむ架空スポット。",
    stay: 20,
    source: "sample",
  },
];
export function inOsaka(p: Pick<Place, "lat" | "lng">) {
  return p.lat >= 34.55 && p.lat <= 34.85 && p.lng >= 135.35 && p.lng <= 135.65;
}
export function distance(
  a: Pick<Place, "lat" | "lng">,
  b: Pick<Place, "lat" | "lng">,
) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function rankSpots(
  start: Place,
  end: Place,
  spots: Spot[],
  selected: Category[],
  budget: number,
) {
  return spots
    .filter(
      (s) =>
        selected.includes(s.category) &&
        distance(start, s) > 0.05 &&
        distance(end, s) > 0.05,
    )
    .map((spot) => {
      const km = (distance(start, spot) + distance(spot, end)) * 1.3;
      const extra = Math.max(
        0,
        Math.ceil(((km - distance(start, end) * 1.3) / 4.5) * 60),
      );
      return { ...spot, km, extra, addedMinutes: extra + spot.stay };
    })
    .filter((s) => s.addedMinutes <= budget)
    .sort((a, b) => a.addedMinutes - b.addedMinutes);
}
