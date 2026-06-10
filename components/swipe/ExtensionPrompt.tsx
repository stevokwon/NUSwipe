"use client";

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "nusw_ext_prompt_dismissed";

export function ExtensionPrompt(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss(): void {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <div className="flex items-center gap-2">
        <span className="text-base">⚡</span>
        <span>
          <span className="font-semibold">Enable one-tap auto-submit</span> — install the NUSwipe
          extension to apply without leaving this page.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <a
          href="/extension-install"
          className="font-medium underline underline-offset-2 hover:text-blue-900"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-blue-500 hover:text-blue-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
