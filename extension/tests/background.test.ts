// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi, type Mock } from "vitest";

// ── Chrome API mocks (must be set before background.ts is imported) ──────────

const mockTabsCreate = vi.fn();
const mockTabsRemove = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockRuntimeOnMessage = { addListener: vi.fn() };
const mockStorageSessionSet = vi.fn();

(globalThis as Record<string, unknown>).chrome = {
  tabs: {
    create: mockTabsCreate,
    remove: mockTabsRemove,
    sendMessage: mockTabsSendMessage,
  },
  runtime: {
    onMessage: mockRuntimeOnMessage,
  },
  storage: {
    session: {
      set: mockStorageSessionSet,
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageHandler = (
  message: unknown,
  sender: { tab?: { id?: number } },
  sendResponse: (r: unknown) => void
) => boolean | undefined;

// ── Helpers ───────────────────────────────────────────────────────────────────

function flushMicrotasks() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const BASE_SUBMIT_PAYLOAD = {
  type: "NUSW_SUBMIT",
  jobUrl: "https://jobs.lever.co/test/abc-123",
  jobId: "job-1",
  extensionToken: "tok-abc",
  profile: {
    first_name: "Alice",
    last_name: "Tan",
    email: "alice@example.com",
    phone: "+6591234567",
    linkedin_url: null,
    resume_url: "https://example.com/resume.pdf",
    skills: ["TypeScript"],
  },
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("background.ts message handler", () => {
  let handler: MessageHandler;

  beforeAll(async () => {
    // Import background module once — it calls addListener at module load time
    await import("../src/background");
    // Capture the registered handler (called exactly once at import)
    handler = (mockRuntimeOnMessage.addListener as Mock).mock.calls[0][0] as MessageHandler;
  });

  beforeEach(() => {
    // Clear call history between tests but preserve the handler reference
    mockTabsCreate.mockReset();
    mockTabsRemove.mockReset();
    mockTabsSendMessage.mockReset();
    mockStorageSessionSet.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("registers a message listener on load", () => {
    expect(mockRuntimeOnMessage.addListener).toHaveBeenCalledOnce();
    expect(typeof handler).toBe("function");
  });

  it("NUSW_SUBMIT — opens a hidden background tab and stores session payload", async () => {
    mockTabsCreate.mockResolvedValueOnce({ id: 201 });

    const sendResponse = vi.fn();
    handler(
      { ...BASE_SUBMIT_PAYLOAD, jobId: "job-submit-1" },
      { tab: { id: 1 } },
      sendResponse
    );

    // sendResponse is called synchronously
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });

    // tabs.create called with correct URL and inactive
    expect(mockTabsCreate).toHaveBeenCalledWith({
      url: BASE_SUBMIT_PAYLOAD.jobUrl,
      active: false,
    });

    // Flush .then() microtask so storage.session.set is called
    await flushMicrotasks();

    expect(mockStorageSessionSet).toHaveBeenCalledWith(
      expect.objectContaining({
        "payload_201": expect.objectContaining({ jobId: "job-submit-1" }),
      })
    );
  });

  it("NUSW_SUBMIT — does nothing when sender has no tab id", async () => {
    mockTabsCreate.mockResolvedValueOnce({ id: 202 });

    const sendResponse = vi.fn();
    handler({ ...BASE_SUBMIT_PAYLOAD }, { tab: undefined }, sendResponse);

    expect(mockTabsCreate).not.toHaveBeenCalled();
  });

  it("SUBMIT_RESULT success — calls confirm fetch, closes tab, notifies NUSwipe tab", async () => {
    // Populate pendingTabs: NUSwipe tab 10 → background tab 301
    mockTabsCreate.mockResolvedValueOnce({ id: 301 });
    handler(
      { ...BASE_SUBMIT_PAYLOAD, jobId: "job-success", extensionToken: "tok-success" },
      { tab: { id: 10 } },
      vi.fn()
    );
    await flushMicrotasks();

    // Reset storage mock so it doesn't bleed into assertions below
    mockStorageSessionSet.mockReset();

    // Mock fetch success
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true });

    const sendResponse = vi.fn();
    handler(
      {
        type: "SUBMIT_RESULT",
        success: true,
        jobId: "job-success",
        extensionToken: "tok-success",
      },
      { tab: { id: 301 } },
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });

    await flushMicrotasks();

    // confirm fetch called with correct endpoint and body
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/apply/confirm"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("tok-success"),
      })
    );

    // Background tab closed
    expect(mockTabsRemove).toHaveBeenCalledWith(301);

    // NUSwipe tab notified
    expect(mockTabsSendMessage).toHaveBeenCalledWith(10, {
      type: "SUBMIT_CONFIRMED",
      jobId: "job-success",
      success: true,
    });
  });

  it("SUBMIT_RESULT failure — skips confirm fetch, still closes tab and notifies NUSwipe tab", async () => {
    // Populate pendingTabs: NUSwipe tab 20 → background tab 401
    mockTabsCreate.mockResolvedValueOnce({ id: 401 });
    handler(
      { ...BASE_SUBMIT_PAYLOAD, jobId: "job-fail", extensionToken: "tok-fail" },
      { tab: { id: 20 } },
      vi.fn()
    );
    await flushMicrotasks();

    mockStorageSessionSet.mockReset();

    const sendResponse = vi.fn();
    handler(
      {
        type: "SUBMIT_RESULT",
        success: false,
        jobId: "job-fail",
        extensionToken: "tok-fail",
      },
      { tab: { id: 401 } },
      sendResponse
    );

    await flushMicrotasks();

    // fetch must NOT be called on failure
    expect(global.fetch).not.toHaveBeenCalled();

    // Tab still closed
    expect(mockTabsRemove).toHaveBeenCalledWith(401);

    // NUSwipe tab still notified with success: false
    expect(mockTabsSendMessage).toHaveBeenCalledWith(20, {
      type: "SUBMIT_CONFIRMED",
      jobId: "job-fail",
      success: false,
    });
  });

  it("SUBMIT_RESULT — ignored when sender tab is not in pendingTabs", async () => {
    const sendResponse = vi.fn();
    handler(
      {
        type: "SUBMIT_RESULT",
        success: true,
        jobId: "job-unknown",
        extensionToken: "tok-unknown",
      },
      { tab: { id: 9999 } }, // never registered in pendingTabs
      sendResponse
    );

    await flushMicrotasks();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockTabsRemove).not.toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });

  it("unknown message type — no chrome APIs called", async () => {
    const sendResponse = vi.fn();
    handler({ type: "UNKNOWN_MESSAGE", data: "irrelevant" }, { tab: { id: 5 } }, sendResponse);

    await flushMicrotasks();

    expect(mockTabsCreate).not.toHaveBeenCalled();
    expect(mockTabsRemove).not.toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
