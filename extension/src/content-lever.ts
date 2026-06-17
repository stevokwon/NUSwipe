// Content script injected into Lever application pages (jobs.lever.co)
// Receives profile payload from background, fills and submits the form

import { fillLeverForm, submitLeverForm } from "./fillers/lever";
import type { ApplyPayload } from "./fillers/lever";

function waitForForm(timeout = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(".application-field")) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(".application-field")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Lever form not found within timeout"));
    }, timeout);
  });
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as Record<string, unknown>;
  if (msg.type !== "NUSW_FILL") return;

  const payload = msg.payload as ApplyPayload;

  console.log("[NUSwipe lever] NUSW_FILL received, url:", location.href, "waiting for .application-field...");

  waitForForm()
    .then(async () => {
      const allFields = document.querySelectorAll("[class*='application'], [class*='field'], [class*='form']");
      console.log("[NUSwipe lever] form found! Fields on page:", allFields.length, "filling...");
      console.log("[NUSwipe lever] first 5 field classes:", Array.from(allFields).slice(0,5).map(el => el.className));
      fillLeverForm(payload);
      // Wait for: typeahead/dropdowns (Phase 2 retries at 0.6s) + Lever's async resume upload.
      // Resume upload can take 3-5s on slow connections — give it 8s total.
      console.log("[NUSwipe lever] fields filled, waiting 8s for dropdowns + resume upload...");
      await new Promise((r) => setTimeout(r, 8000));
      console.log("[NUSwipe lever] attempting submit...");
      const submitBtn = document.querySelector("button[type='submit'][data-qa='btn-submit-application']");
      console.log("[NUSwipe lever] submit button found:", !!submitBtn, submitBtn?.textContent);
      return submitLeverForm();
    })
    .then((success) => {
      console.log("[NUSwipe lever] submitLeverForm result:", success);
      chrome.runtime.sendMessage({
        type: "SUBMIT_RESULT",
        success,
        jobId: msg.jobId,
        extensionToken: msg.extensionToken,
      });
      sendResponse({ ok: true });
    })
    .catch((err: Error) => {
      console.error("[NUSwipe lever] error:", err.message);
      chrome.runtime.sendMessage({
        type: "SUBMIT_RESULT",
        success: false,
        jobId: msg.jobId,
        extensionToken: msg.extensionToken,
      });
      sendResponse({ ok: false, error: err.message });
    });

  return true;
});
