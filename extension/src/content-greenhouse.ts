// Content script injected into Greenhouse application pages (boards.greenhouse.io)
// Receives profile payload from background, fills and submits the form

import { fillGreenhouseForm, submitGreenhouseForm } from "./fillers/greenhouse";
import type { ApplyPayload } from "./fillers/greenhouse";

function waitForForm(timeout = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector("#first_name")) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector("#first_name")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Greenhouse form not found within timeout"));
    }, timeout);
  });
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as Record<string, unknown>;
  if (msg.type !== "NUSW_FILL") return;

  const payload = msg.payload as ApplyPayload;

  waitForForm()
    .then(() => {
      fillGreenhouseForm(payload);
      return submitGreenhouseForm();
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

  return true; // keep channel open for async response
});
