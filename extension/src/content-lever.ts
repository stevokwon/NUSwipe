// Content script injected into Lever application pages (jobs.lever.co)
// Receives profile payload from background, fills and submits the form

import { fillLeverForm, submitLeverForm } from "./fillers/lever";
import type { ApplyPayload } from "./fillers/lever";

function waitForForm(timeout = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(".application-name input")) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(".application-name input")) {
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

  waitForForm()
    .then(() => {
      fillLeverForm(payload);
      return submitLeverForm();
    })
    .then((success) => {
      chrome.runtime.sendMessage({
        type: "SUBMIT_RESULT",
        success,
        jobId: msg.jobId,
        extensionToken: msg.extensionToken,
      });
      sendResponse({ ok: true });
    })
    .catch((err: Error) => {
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
