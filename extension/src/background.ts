// Background service worker — orchestrates tab management + ATS submission flow

const NUSW_ORIGIN = "http://localhost:3000"; // overridden in production by env

interface SubmitPayload {
  type: "NUSW_SUBMIT";
  jobUrl: string;
  jobId: string;
  extensionToken: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    linkedin_url: string | null;
    resume_url: string;
    skills: string[];
  };
}

interface SubmitResult {
  type: "SUBMIT_RESULT";
  success: boolean;
  jobId: string;
  extensionToken: string;
}

// Map from background tabId → { nuswTabId, extensionToken, jobId }
const pendingTabs = new Map<number, { nuswTabId: number; extensionToken: string; jobId: string }>();

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const msg = message as Record<string, unknown>;

  if (msg.type === "NUSW_SUBMIT") {
    const payload = msg as unknown as SubmitPayload;
    const nuswTabId = sender.tab?.id;
    if (!nuswTabId) return;

    chrome.tabs
      .create({ url: payload.jobUrl, active: false })
      .then((tab) => {
        if (!tab.id) return;
        pendingTabs.set(tab.id, {
          nuswTabId,
          extensionToken: payload.extensionToken,
          jobId: payload.jobId,
        });
        // Store payload for the content script to retrieve
        chrome.storage.session.set({ [`payload_${tab.id}`]: payload });
      });

    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "SUBMIT_RESULT") {
    const result = msg as unknown as SubmitResult;
    const bgTabId = sender.tab?.id;
    if (!bgTabId) return;

    const pending = pendingTabs.get(bgTabId);
    if (!pending) return;

    pendingTabs.delete(bgTabId);

    if (result.success) {
      fetch(`${NUSW_ORIGIN}/api/apply/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionToken: pending.extensionToken }),
      }).catch(console.error);
    }

    chrome.tabs.remove(bgTabId);

    chrome.tabs.sendMessage(pending.nuswTabId, {
      type: "SUBMIT_CONFIRMED",
      jobId: pending.jobId,
      success: result.success,
    });

    sendResponse({ ok: true });
    return true;
  }
});
