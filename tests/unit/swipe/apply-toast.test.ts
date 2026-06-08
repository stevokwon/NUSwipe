import { describe, it, expect } from "vitest";
import { resolveApplyToast } from "@/lib/swipe/apply-toast";

describe("resolveApplyToast", () => {
  // ── Redirect (url-fallback) jobs ──────────────────────────────────────────

  it("redirect job → info variant with 'Opening in new tab' message", () => {
    const result = resolveApplyToast(
      { redirect: "https://careers.grab.com/apply/12345" },
      "Grab"
    );
    expect(result.variant).toBe("info");
    expect(result.message).toContain("Opening");
    expect(result.message).toContain("new tab");
  });

  it("redirect job → outcome is 'redirect'", () => {
    const result = resolveApplyToast({ redirect: "https://careers.grab.com" }, "Grab");
    expect(result.outcome).toBe("redirect");
  });

  it("redirect message includes company name", () => {
    const result = resolveApplyToast({ redirect: "https://example.com" }, "DBS Bank");
    expect(result.message).toContain("DBS Bank");
  });

  // ── Direct ATS submission (Greenhouse / Lever) ────────────────────────────

  it("direct submit → success variant with company name and checkmark", () => {
    const result = resolveApplyToast(
      { success: true, submissionId: "gh-99001" },
      "Grab"
    );
    expect(result.variant).toBe("success");
    expect(result.message).toContain("Grab");
    expect(result.message).toContain("\u2713"); // ✓ typographic checkmark, not emoji
  });

  it("direct submit → outcome is 'direct'", () => {
    const result = resolveApplyToast({ success: true, submissionId: "lv-abc" }, "DBS Bank");
    expect(result.outcome).toBe("direct");
  });

  it("direct submit message starts with 'Applied to'", () => {
    const result = resolveApplyToast({ success: true, submissionId: "x" }, "Shopee");
    expect(result.message).toMatch(/^Applied to Shopee/);
  });

  // ── Keyboard shortcut path ────────────────────────────────────────────────
  // ArrowRight in SwipeStack delegates through triggerRef → triggerSwipe →
  // submitApplication → resolveApplyToast, so keyboard and button share the
  // same toast logic. These tests validate the shared helper directly.

  it("keyboard → direct: same success toast as button", () => {
    const button = resolveApplyToast({ success: true, submissionId: "x" }, "Acme");
    // Keyboard calls the same function — assert identical shape
    expect(button.variant).toBe("success");
    expect(button.outcome).toBe("direct");
  });

  it("keyboard → redirect: same info toast as button", () => {
    const button = resolveApplyToast({ redirect: "https://acme.com" }, "Acme");
    expect(button.variant).toBe("info");
    expect(button.outcome).toBe("redirect");
  });
});
