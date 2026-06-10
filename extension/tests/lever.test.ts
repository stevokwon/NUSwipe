// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fillLeverForm, submitLeverForm } from "../src/fillers/lever";

function buildLeverForm(): void {
  document.body.innerHTML = `
    <form>
      <div class="application-name"><input type="text" /></div>
      <div class="application-email"><input type="email" /></div>
      <div class="application-phone"><input type="tel" /></div>
      <div class="application-urls"><input type="url" /></div>
      <button type="submit" data-qa="btn-submit-application">Submit</button>
    </form>
  `;
}

const basePayload = {
  first_name: "Bob",
  last_name: "Lee",
  email: "bob@example.com",
  phone: "+85291234567",
  linkedin_url: "https://linkedin.com/in/bob",
  resume_url: "https://example.com/cv.pdf",
  skills: [],
};

describe("fillLeverForm", () => {
  beforeEach(() => {
    buildLeverForm();
  });

  it("fills name, email, and phone fields", () => {
    fillLeverForm(basePayload);

    expect(
      document.querySelector<HTMLInputElement>(".application-name input")!.value
    ).toBe("Bob Lee");
    expect(
      document.querySelector<HTMLInputElement>(".application-email input")!.value
    ).toBe("bob@example.com");
    expect(
      document.querySelector<HTMLInputElement>(".application-phone input")!.value
    ).toBe("+85291234567");
  });

  it("fills linkedin URL when provided", () => {
    fillLeverForm({ ...basePayload, linkedin_url: "https://linkedin.com/in/bob" });

    expect(
      document.querySelector<HTMLInputElement>(".application-urls input")!.value
    ).toBe("https://linkedin.com/in/bob");
  });

  it("skips linkedin URL field when null", () => {
    fillLeverForm({ ...basePayload, linkedin_url: null });

    expect(
      document.querySelector<HTMLInputElement>(".application-urls input")!.value
    ).toBe("");
  });

  it("does not throw when form fields are missing", () => {
    document.body.innerHTML = "<form></form>";

    expect(() => fillLeverForm(basePayload)).not.toThrow();
  });

  it("dispatches input events for React compatibility", () => {
    const spy = vi.fn();
    document.querySelector<HTMLInputElement>(".application-name input")!
      .addEventListener("input", spy);

    fillLeverForm(basePayload);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("submitLeverForm", () => {
  it("returns false when no submit button is present", async () => {
    document.body.innerHTML = "<form></form>";

    const result = await submitLeverForm();
    expect(result).toBe(false);
  });

  it("clicks the submit button and resolves false after timeout (no navigation in jsdom)", async () => {
    vi.useFakeTimers();
    buildLeverForm();

    const submitBtn = document.querySelector<HTMLButtonElement>(
      "button[type='submit'][data-qa='btn-submit-application']"
    )!;
    const clickSpy = vi.fn();
    submitBtn.addEventListener("click", clickSpy);

    const resultPromise = submitLeverForm();

    // Click is fired synchronously
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Fast-forward past the 15s polling timeout
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBe(false);

    vi.useRealTimers();
  });
});
