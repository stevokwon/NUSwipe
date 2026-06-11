// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fillGreenhouseForm, submitGreenhouseForm } from "../src/fillers/greenhouse";

function buildGreenhouseForm(): void {
  document.body.innerHTML = `
    <form id="application_form">
      <input id="first_name" type="text" />
      <input id="last_name" type="text" />
      <input id="email" type="email" />
      <input id="phone" type="tel" />
      <input name="job_application[linkedin_url]" type="url" />
      <button type="submit">Submit Application</button>
    </form>
  `;
}

const basePayload = {
  first_name: "Alice",
  last_name: "Tan",
  email: "alice@example.com",
  phone: "+6591234567",
  linkedin_url: "https://linkedin.com/in/alice",
  resume_url: "https://example.com/resume.pdf",
  skills: ["Python", "React"],
};

describe("fillGreenhouseForm", () => {
  beforeEach(() => {
    buildGreenhouseForm();
  });

  it("fills all fields", () => {
    fillGreenhouseForm(basePayload);

    expect(document.querySelector<HTMLInputElement>("#first_name")!.value).toBe("Alice");
    expect(document.querySelector<HTMLInputElement>("#last_name")!.value).toBe("Tan");
    expect(document.querySelector<HTMLInputElement>("#email")!.value).toBe("alice@example.com");
    expect(document.querySelector<HTMLInputElement>("#phone")!.value).toBe("+6591234567");
    expect(
      document.querySelector<HTMLInputElement>("input[name='job_application[linkedin_url]']")!.value
    ).toBe("https://linkedin.com/in/alice");
  });

  it("null linkedin_url skips the field", () => {
    fillGreenhouseForm({ ...basePayload, linkedin_url: null });

    expect(
      document.querySelector<HTMLInputElement>("input[name='job_application[linkedin_url]']")!.value
    ).toBe("");
  });

  it("dispatches change events on filled inputs", () => {
    const spy = vi.fn();
    document.querySelector<HTMLInputElement>("#first_name")!.addEventListener("change", spy);

    fillGreenhouseForm(basePayload);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not throw when form fields are missing", () => {
    document.body.innerHTML = "<form></form>";

    expect(() => fillGreenhouseForm(basePayload)).not.toThrow();
  });

  it("injects resume file into #resume input when resume_base64 is provided", () => {
    // jsdom does not implement DataTransfer — stub it to capture added files
    const addedFiles: File[] = [];
    const mockDt = { items: { add: (f: File) => addedFiles.push(f) }, files: [] as unknown as FileList };
    vi.stubGlobal("DataTransfer", vi.fn().mockImplementation(function() { return mockDt; }));

    document.body.innerHTML = `
      <form id="application_form">
        <input id="first_name" type="text" />
        <input id="last_name" type="text" />
        <input id="email" type="email" />
        <input id="phone" type="tel" />
        <input id="resume" type="file" />
        <button type="submit">Submit</button>
      </form>
    `;
    // jsdom's files setter only accepts a real FileList; intercept it so the
    // DataTransfer assignment doesn't throw while still letting us assert on addedFiles
    const fileInput = document.querySelector<HTMLInputElement>("#resume")!;
    Object.defineProperty(fileInput, "files", { set: vi.fn(), configurable: true });

    fillGreenhouseForm({ ...basePayload, resume_base64: btoa("%PDF"), resume_filename: "cv.pdf" });

    expect(addedFiles).toHaveLength(1);
    expect(addedFiles[0].name).toBe("cv.pdf");
    expect(addedFiles[0].type).toBe("application/pdf");

    vi.unstubAllGlobals();
  });

  it("skips resume injection when resume_base64 is absent", () => {
    buildGreenhouseForm();
    expect(() => fillGreenhouseForm(basePayload)).not.toThrow();
  });
});

describe("submitGreenhouseForm", () => {
  it("returns false when no submit button is present", async () => {
    document.body.innerHTML = "<form></form>";

    const result = await submitGreenhouseForm();
    expect(result).toBe(false);
  });

  it("clicks the submit button and resolves false after timeout (no navigation in jsdom)", async () => {
    vi.useFakeTimers();
    buildGreenhouseForm();

    const submitBtn = document.querySelector<HTMLButtonElement>("button[type='submit']")!;
    const clickSpy = vi.fn();
    submitBtn.addEventListener("click", clickSpy);

    const resultPromise = submitGreenhouseForm();

    // Verify click was fired synchronously
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Fast-forward past the 15s polling timeout
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBe(false);

    vi.useRealTimers();
  });
});
