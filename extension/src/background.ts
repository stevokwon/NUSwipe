// Background service worker — orchestrates tab management + ATS submission flow

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

// Map from background tabId → { nuswTabId, nuswOrigin, extensionToken, jobId }
const pendingTabs = new Map<number, { nuswTabId: number; nuswOrigin: string; extensionToken: string; jobId: string }>();

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB
const CHUNK_SIZE = 0x8000; // 32 KB — avoids stack overflow on spread

async function fetchResumeBase64(url: string): Promise<{ base64: string; filename: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    if (buf.byteLength > MAX_RESUME_BYTES) return null;
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    const base64 = btoa(binary);
    const filename = url.split("/").pop()?.split("?")[0] ?? "resume.pdf";
    return { base64, filename };
  } catch {
    return null;
  }
}

// When the ATS tab finishes loading, retrieve the stored payload and send NUSW_FILL
// so the content script knows to start filling the form.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  if (!pendingTabs.has(tabId)) return;

  chrome.storage.session.get(`payload_${tabId}`, async (result) => {
    const payload = result[`payload_${tabId}`] as SubmitPayload | undefined;
    if (!payload) {
      // Session payload missing (eviction, extension reload, or race) — clean up
      // to prevent the ATS tab and pendingTabs entry from hanging indefinitely.
      pendingTabs.delete(tabId);
      chrome.tabs.remove(tabId);
      return;
    }

    const resume = payload.profile.resume_url
      ? await fetchResumeBase64(payload.profile.resume_url)
      : null;

    chrome.tabs.sendMessage(tabId, {
      type: "NUSW_FILL",
      payload: {
        ...payload.profile,
        ...(resume ? { resume_base64: resume.base64, resume_filename: resume.filename } : {}),
      },
      jobId: payload.jobId,
      extensionToken: payload.extensionToken,
    });
  });
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const msg = message as Record<string, unknown>;

  if (msg.type === "NUSW_SUBMIT") {
    const payload = msg as unknown as SubmitPayload;
    const nuswTabId = sender.tab?.id;
    if (!nuswTabId) return;

    // Derive the confirm URL from the sender's origin so this works on both
    // localhost and the production domain without a build-time env var.
    const nuswOrigin = sender.origin ?? sender.url?.replace(/\/[^/]*$/, "") ?? "";

    chrome.tabs
      .create({ url: payload.jobUrl, active: false })
      .then((tab) => {
        if (!tab.id) return;
        pendingTabs.set(tab.id, {
          nuswTabId,
          nuswOrigin,
          extensionToken: payload.extensionToken,
          jobId: payload.jobId,
        });
        // Store payload keyed by tab id so the onUpdated handler can retrieve it
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
      fetch(`${pending.nuswOrigin}/api/apply/confirm`, {
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
