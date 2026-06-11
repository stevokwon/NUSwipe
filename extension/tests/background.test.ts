// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi, type Mock } from "vitest";

// ── Chrome API mocks (must be set before background.ts is imported) ──────────

const mockTabsCreate = vi.fn();
const mockTabsRemove = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockRuntimeOnMessage = { addListener: vi.fn() };
const mockTabsOnUpdated = { addListener: vi.fn() };
const mockStorageSessionSet = vi.fn();
const mockStorageSessionGet = vi.fn();

(globalThis as Record<string, unknown>).chrome = {
  tabs: {
    create: mockTabsCreate,
    remove: mockTabsRemove,
    sendMessage: mockTabsSendMessage,
    onUpdated: mockTabsOnUpdated,
  },
  runtime: {
    onMessage: mockRuntimeOnMessage,
  },
  storage: {
    session: {
      set: mockStorageSessionSet,
      get: mockStorageSessionGet,
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageHandler = (
  message: unknown,
  sender: { tab?: { id?: number } },
  sendResponse: (r: unknown) => void
) => boolean | undefined;

type TabUpdateHandler = (tabId: number, changeInfo: { status?: string }) => void;

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
  let onUpdatedHandler: TabUpdateHandler;

  beforeAll(async () => {
    // Import background module once — it calls addListener at module load time
    await import("../src/background");
    // Capture the registered handlers (called exactly once at import)
    handler = (mockRuntimeOnMessage.addListener as Mock).mock.calls[0][0] as MessageHandler;
    onUpdatedHandler = (mockTabsOnUpdated.addListener as Mock).mock.calls[0][0] as TabUpdateHandler;
  });

  beforeEach(() => {
    // Clear call history between tests but preserve the handler references
    mockTabsCreate.mockReset();
    mockTabsRemove.mockReset();
    mockTabsSendMessage.mockReset();
    mockStorageSessionSet.mockReset();
    mockStorageSessionGet.mockReset();
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

  it("registers a tabs.onUpdated listener on load", () => {
    expect(mockTabsOnUpdated.addListener).toHaveBeenCalledOnce();
    expect(typeof onUpdatedHandler).toBe("function");
  });

  it("onUpdated — ignored when tab is not in pendingTabs", async () => {
    await onUpdatedHandler(9000, { status: "complete" });
    await flushMicrotasks();

    expect(mockStorageSessionGet).not.toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });

  it("onUpdated — cleans up tab when session payload is missing", async () => {
    // Populate pendingTabs
    mockTabsCreate.mockResolvedValueOnce({ id: 901 });
    handler({ ...BASE_SUBMIT_PAYLOAD }, { tab: { id: 9 } }, vi.fn());
    await flushMicrotasks();

    // storage.session.get returns nothing for this tab (eviction / race)
    mockStorageSessionGet.mockImplementation((_key: string, cb: (r: Record<string, unknown>) => void) => {
      cb({});
    });

    await onUpdatedHandler(901, { status: "complete" });
    await flushMicrotasks();

    // Tab must be closed and pendingTabs entry removed — no NUSW_FILL sent
    expect(mockTabsRemove).toHaveBeenCalledWith(901);
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });

  it("onUpdated — ignored when status is not complete", async () => {
    // Populate pendingTabs
    mockTabsCreate.mockResolvedValueOnce({ id: 601 });
    handler({ ...BASE_SUBMIT_PAYLOAD }, { tab: { id: 6 } }, vi.fn());
    await flushMicrotasks();

    await onUpdatedHandler(601, { status: "loading" });
    await flushMicrotasks();

    expect(mockStorageSessionGet).not.toHaveBeenCalled();
  });

  it("onUpdated — NUSW_FILL includes resume_base64 when fetch succeeds", async () => {
    // Populate pendingTabs: NUSwipe tab 7 → ATS tab 701
    mockTabsCreate.mockResolvedValueOnce({ id: 701 });
    handler({ ...BASE_SUBMIT_PAYLOAD, jobId: "job-resume" }, { tab: { id: 7 } }, vi.fn());
    await flushMicrotasks();

    // storage.session.get calls callback synchronously with stored payload
    mockStorageSessionGet.mockImplementation((_key: string, cb: (r: Record<string, unknown>) => void) => {
      cb({ payload_701: { ...BASE_SUBMIT_PAYLOAD, jobId: "job-resume" } });
    });

    // fetch returns a minimal PDF-like buffer (%PDF header bytes)
    const fakeBytes = new Uint8Array([37, 80, 68, 70]);
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });

    await onUpdatedHandler(701, { status: "complete" });
    await flushMicrotasks();
    await flushMicrotasks(); // second flush for the inner async fetch

    expect(global.fetch).toHaveBeenCalledWith(BASE_SUBMIT_PAYLOAD.profile.resume_url);
    expect(mockTabsSendMessage).toHaveBeenCalledWith(
      701,
      expect.objectContaining({
        type: "NUSW_FILL",
        payload: expect.objectContaining({
          resume_base64: expect.any(String),
          resume_filename: "resume.pdf",
        }),
      })
    );
  });

  it("onUpdated — NUSW_FILL sent without resume fields when fetch fails", async () => {
    // Populate pendingTabs: NUSwipe tab 8 → ATS tab 801
    mockTabsCreate.mockResolvedValueOnce({ id: 801 });
    handler({ ...BASE_SUBMIT_PAYLOAD, jobId: "job-noresume" }, { tab: { id: 8 } }, vi.fn());
    await flushMicrotasks();

    mockStorageSessionGet.mockImplementation((_key: string, cb: (r: Record<string, unknown>) => void) => {
      cb({ payload_801: { ...BASE_SUBMIT_PAYLOAD, jobId: "job-noresume" } });
    });

    // fetch fails
    (global.fetch as Mock).mockRejectedValueOnce(new Error("network error"));

    await onUpdatedHandler(801, { status: "complete" });
    await flushMicrotasks();
    await flushMicrotasks();

    // NUSW_FILL is still sent, just without resume_base64
    expect(mockTabsSendMessage).toHaveBeenCalledWith(
      801,
      expect.objectContaining({
        type: "NUSW_FILL",
        payload: expect.not.objectContaining({ resume_base64: expect.anything() }),
      })
    );
  });
});
