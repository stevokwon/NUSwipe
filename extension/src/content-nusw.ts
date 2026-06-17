// Content script injected into the NUSwipe page (localhost:3000 / nuswipe.com)
// Bridges window.postMessage from the React app to the extension background worker

console.log("[NUSwipe content] script loaded on", location.href);

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as Record<string, unknown>;
  if (data?.type !== "NUSW_SUBMIT") return;

  console.log("[NUSwipe content] NUSW_SUBMIT received, relaying to background...");

  try {
    chrome.runtime.sendMessage(data, (response: unknown) => {
      if (chrome.runtime.lastError) {
        console.error("[NUSwipe content] sendMessage error:", chrome.runtime.lastError.message);
      } else {
        console.log("[NUSwipe content] background ACK:", response);
        window.postMessage({ type: "NUSW_SUBMIT_ACK", ok: (response as Record<string, unknown>)?.ok }, "*");
      }
    });
  } catch (err) {
    // Extension was reloaded while this page was open — context is invalid.
    // User needs to refresh the page to get a fresh content script.
    console.warn("[NUSwipe content] extension context invalidated — please refresh the page");
    window.postMessage({ type: "NUSW_EXTENSION_STALE" }, "*");
  }
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as Record<string, unknown>;
  if (msg.type === "SUBMIT_CONFIRMED") {
    console.log("[NUSwipe content] SUBMIT_CONFIRMED received, relaying to page");
    window.postMessage(msg, "*");
  }
});
