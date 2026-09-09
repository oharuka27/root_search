import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place, Spot } from "../shared/data";
export default function Map({
  start,
  end,
  spots,
  selected,
  external,
  onPick,
  picking,
}: {
  start: Place;
  end: Place;
  spots: Spot[];
  selected: Spot | null;
  external: boolean;
  onPick: (lat: number, lng: number) => void;
  picking: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick);
  const isPicking = useRef(picking);
  useEffect(() => {
    pick.current = onPick;
    isPicking.current = picking;
  }, [onPick, picking]);
  useEffect(() => {
    if (!node.current) return;
    const m = L.map(node.current, { zoomControl: false }).setView(
      [34.697, 135.503],
      14,
    );
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      if (isPicking.current) pick.current(e.latlng.lat, e.latlng.lng);
    });
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(node.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    if (external) {
      tiles.current = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      ).addTo(map.current);
    }
    return () => {
      tiles.current?.remove();
      tiles.current = null;
    };
  }, [external]);
  useEffect(() => {
    const m = map.current;
    const l = layer.current;
    if (!m || !l) return;
    l.clearLayers();
    const add = (p: Place, text: string, color: string) => {
      const icon = L.divIcon({
        className: "map-marker",
        html: `<span style="background:${color}">${text}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(l);
      const el = document.createElement("div");
      el.textContent = p.name;
      marker.bindTooltip(el, { direction: "top" });
    };
    spots.forEach((s, i) =>
      add(s, String(i + 1), selected?.id === s.id ? "#c37a49" : "#ffffff"),
    );
    const route = selected ? [start, selected, end] : [start, end];
    L.polyline(
      route.map((p) => [p.lat, p.lng]),
      { color: "#527962", weight: 4, dashArray: "7 9", opacity: 0.75 },
    ).addTo(l);
    add(start, "A", "#294d3f");
    add(end, "B", "#294d3f");
    m.fitBounds(L.latLngBounds(route.map((p) => [p.lat, p.lng])).pad(0.4), {
      maxZoom: 15,
    });
  }, [start, end, spots, selected]);
  return (
    <div
      ref={node}
      className={`map ${picking ? "picking" : ""}`}
      aria-label="寄り道マップ"
    />
  );
}
