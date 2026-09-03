import { describe, expect, it } from "vitest";
import { findCompleteDayObjects } from "./streamParser";

describe("findCompleteDayObjects", () => {
  it("returns an empty array when the days array hasn't started yet", () => {
    expect(findCompleteDayObjects("")).toEqual([]);
    expect(findCompleteDayObjects('{"day')).toEqual([]);
  });

  it("returns no objects while the first day object is still incomplete", () => {
    const text = '{"days": [{"id": 1, "stops": [{"title": "Eiffel Tow';
    expect(findCompleteDayObjects(text)).toEqual([]);
  });

  it("returns one complete day object once its closing brace arrives", () => {
    const text = '{"days": [{"id": 1, "stops": [{"title": "Eiffel Tower"}]}';
    const result = findCompleteDayObjects(text);
    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0])).toEqual({ id: 1, stops: [{ title: "Eiffel Tower" }] });
  });

  it("returns multiple complete day objects found across accumulated chunks", () => {
    const text =
      '{"days": [{"id": 1, "stops": []}, {"id": 2, "stops": [{"title": "Louvre"}]}';
    const result = findCompleteDayObjects(text);
    expect(result).toHaveLength(2);
    expect(JSON.parse(result[0])).toEqual({ id: 1, stops: [] });
    expect(JSON.parse(result[1])).toEqual({ id: 2, stops: [{ title: "Louvre" }] });
  });

  it("does not miscount braces that appear inside quoted string values", () => {
    const text = '{"days": [{"id": 1, "stops": [{"title": "A {weird} place"}]}';
    const result = findCompleteDayObjects(text);
    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0])).toEqual({ id: 1, stops: [{ title: "A {weird} place" }] });
  });

  it("does not miscount escaped quotes within a string value", () => {
    const text = '{"days": [{"id": 1, "stops": [{"title": "Say \\"hi\\""}]}';
    const result = findCompleteDayObjects(text);
    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0])).toEqual({ id: 1, stops: [{ title: 'Say "hi"' }] });
  });

  it("stops scanning once the days array itself closes", () => {
    const text = '{"days": [{"id": 1, "stops": []}]}';
    const result = findCompleteDayObjects(text);
    expect(result).toHaveLength(1);
  });
});
