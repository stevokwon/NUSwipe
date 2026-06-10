// Content script injected into the NUSwipe page (localhost:3000 / nuswipe.com)
// Bridges window.postMessage from the React app to the extension background worker

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as Record<string, unknown>;
  if (data?.type !== "NUSW_SUBMIT") return;

  chrome.runtime.sendMessage(data, (response: unknown) => {
    if (chrome.runtime.lastError) {
      console.error("[NUSwipe ext] sendMessage error:", chrome.runtime.lastError.message);
    } else {
      window.postMessage({ type: "NUSW_SUBMIT_ACK", ok: (response as Record<string, unknown>)?.ok }, "*");
    }
  });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as Record<string, unknown>;
  if (msg.type === "SUBMIT_CONFIRMED") {
    window.postMessage(msg, "*");
  }
});
