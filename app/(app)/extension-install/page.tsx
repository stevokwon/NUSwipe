export default function ExtensionInstallPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <div className="text-5xl">⚡</div>
      <h1 className="text-2xl font-bold text-white">Install the NUSwipe Extension</h1>
      <p className="text-slate-400 max-w-sm text-sm">
        The extension lets you apply to jobs without leaving NUSwipe — it fills
        and submits Greenhouse and Lever forms silently in the background.
      </p>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 text-left space-y-4 text-sm text-slate-300">
        <div className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">1</span>
          <p>Download the extension zip below and unzip it.</p>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">2</span>
          <p>
            Open Chrome and go to{" "}
            <code className="bg-white/10 px-1 rounded text-purple-300">chrome://extensions</code>
          </p>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">3</span>
          <p>Enable <strong className="text-white">Developer mode</strong> (top-right toggle).</p>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">4</span>
          <p>
            Click <strong className="text-white">Load unpacked</strong> and select the unzipped{" "}
            <code className="bg-white/10 px-1 rounded text-purple-300">dist/</code> folder.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">5</span>
          <p>Return to the swipe page and apply to a job — it will submit automatically.</p>
        </div>
      </div>

      <a
        href="/extension.zip"
        className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
      >
        Download Extension
      </a>

      <p className="text-xs text-slate-600">
        For the pilot, distribution is via unpacked extension (no Chrome Web Store required).
      </p>
    </div>
  );
}
