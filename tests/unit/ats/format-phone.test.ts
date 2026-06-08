import { describe, it, expect } from "vitest";
import { formatPhone } from "@/lib/ats/format-phone";

describe("formatPhone", () => {
  it("concatenates country code and number", () => {
    expect(formatPhone("+65", "91234567")).toBe("+6591234567");
  });

  it("strips whitespace from the number", () => {
    expect(formatPhone("+852", "9123 4567")).toBe("+85291234567");
  });

  it("defaults country code to +65 when null", () => {
    expect(formatPhone(null, "91234567")).toBe("+6591234567");
  });

  it("defaults number to empty string when null", () => {
    expect(formatPhone("+65", null)).toBe("+65");
  });

  it("handles both null — returns default country code only", () => {
    expect(formatPhone(null, null)).toBe("+65");
  });
});
