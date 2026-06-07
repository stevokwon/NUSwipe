interface Props {
  onSkip: () => void;
  onApply: () => void;
  disabled?: boolean;
}

export function SwipeButtons({ onSkip, onApply, disabled }: Props) {
  return (
    <div className="flex items-center justify-center gap-8 py-4">
      {/* Skip button */}
      <button
        onClick={onSkip}
        disabled={disabled}
        aria-label="Skip job"
        className="w-16 h-16 rounded-full bg-slate-800 border-2 border-red-500/60 text-red-400 text-2xl shadow-lg hover:bg-red-950 hover:border-red-500 hover:scale-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ✕
      </button>

      {/* Apply button */}
      <button
        onClick={onApply}
        disabled={disabled}
        aria-label="Apply to job"
        className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white text-3xl shadow-xl hover:scale-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ♥
      </button>
    </div>
  );
}
