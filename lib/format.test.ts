import { describe, expect, it } from "vitest";

import { formatBaht } from "./format";

describe("formatBaht", () => {
  it("appends the baht sign", () => {
    expect(formatBaht(50)).toBe("50 ฿");
  });

  it("groups thousands with commas", () => {
    expect(formatBaht(1250)).toBe("1,250 ฿");
    expect(formatBaht(1234567)).toBe("1,234,567 ฿");
  });

  it("keeps zero clean", () => {
    expect(formatBaht(0)).toBe("0 ฿");
  });

  it("shows decimals when present", () => {
    expect(formatBaht(99.5)).toBe("99.5 ฿");
  });
});
