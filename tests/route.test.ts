import { describe, it, expect } from "vitest";
import {
  distance,
  inOsaka,
  places,
  rankSpots,
  sampleSpots,
} from "../shared/data";
describe("walking suggestions", () => {
  it("does not suggest an endpoint as a detour", () => {
    expect(
      rankSpots(places[0], places[1], sampleSpots, ["park"], 90).some(
        (s) => s.id === "s1",
      ),
    ).toBe(false);
  });
  it("computes symmetric distances and zero for same endpoint", () => {
    expect(distance(places[0], places[0])).toBe(0);
    expect(distance(places[0], places[1])).toBeCloseTo(
      distance(places[1], places[0]),
      8,
    );
    expect(distance(places[0], places[1])).toBeGreaterThan(1);
  });
  it("includes stay time in the budget and ranks added time", () => {
    const items = rankSpots(
      places[0],
      places[1],
      sampleSpots,
      ["cafe", "park", "cat"],
      45,
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.addedMinutes).toBe(item.extra + item.stay);
      expect(item.addedMinutes).toBeLessThanOrEqual(45);
    }
    expect(items.map((x) => x.addedMinutes)).toEqual(
      items.map((x) => x.addedMinutes).sort((a, b) => a - b),
    );
  });
  it("filters categories and handles no category and no results", () => {
    expect(rankSpots(places[0], places[1], sampleSpots, [], 90)).toEqual([]);
    expect(rankSpots(places[0], places[1], sampleSpots, ["cat"], 15)).toEqual(
      [],
    );
    expect(
      rankSpots(places[0], places[1], sampleSpots, ["park"], 90).every(
        (x) => x.category === "park",
      ),
    ).toBe(true);
  });
  it("rejects non-Osaka locations", () => {
    expect(inOsaka(places[0])).toBe(true);
    expect(inOsaka({ lat: 35.68, lng: 139.76 })).toBe(false);
    expect(inOsaka({ lat: NaN, lng: 135.5 })).toBe(false);
  });
});
