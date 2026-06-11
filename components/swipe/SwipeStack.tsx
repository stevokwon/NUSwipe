"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Job } from "@/lib/types";
import type { ScoreResult } from "@/lib/scoring/rule-based";
import { JobCard } from "./JobCard";

const SWIPE_THRESHOLD = 100;
const FILTERS = ["All Roles", "Internships", "Full-time", "SG Only", "Visa ✓"] as const;

interface Props {
  initialJobs: Job[];
  isLoading?: boolean;
  scores?: Record<string, ScoreResult>;
}

export function SwipeStack({ initialJobs, isLoading = false, scores }: Props) {
  const [jobs]          = useState<Job[]>(initialJobs);
  const [current, setCurrent]   = useState(0);
  const [drag, setDrag]         = useState({ x: 0, y: 0, active: false });
  const [appliedCount, setAppliedCount] = useState(0);
  const [lastAction, setLastAction]     = useState<{ job: Job; dir: "left" | "right" } | null>(null);
  const [showMatch, setShowMatch]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<number>>(new Set());
  const [minScore, setMinScore]           = useState(0);
  const [expanded, setExpanded]         = useState(false);

  const cardRef  = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });

  // Keep a ref to triggerSwipe so the keyboard handler never goes stale
  const triggerRef = useRef<(dir: "left" | "right") => void>(() => {});

  // ── Filter logic ─────────────────────────────────────────────────────────────

  function toggleFilter(index: number): void {
    if (index === 0) {
      setActiveFilters(new Set());
      return;
    }
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const individualCount = FILTERS.length - 1;
      if (next.size === individualCount) {
        return new Set();
      }
      return next;
    });
  }

  const filteredJobs: Job[] = jobs.filter((job) => {
    if (minScore > 0 && (scores?.[job.id]?.score ?? 0) < minScore) return false;
    if (activeFilters.has(1)) {
      if (!job.tags.some((t) => t.toLowerCase().includes("internship"))) return false;
    }
    if (activeFilters.has(2)) {
      if (job.tags.some((t) => t.toLowerCase().includes("internship"))) return false;
    }
    if (activeFilters.has(3)) {
      if (!job.location.toLowerCase().match(/\bsg\b|singapore/)) return false;
    }
    if (activeFilters.has(4)) {
      if (!job.visa_sponsorship) return false;
    }
    return true;
  });

  const topJob  = filteredJobs[current]     ?? null;
  const nextJob = filteredJobs[current + 1] ?? null;
  const done    = current >= filteredJobs.length;

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent) {
    if (expanded || submitting || !topJob) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
    cardRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag((d) => ({
      ...d,
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    }));
  }

  function onPointerUp() {
    if (!drag.active) return;
    if (drag.x > SWIPE_THRESHOLD)       triggerRef.current("right");
    else if (drag.x < -SWIPE_THRESHOLD) triggerRef.current("left");
    else setDrag({ x: 0, y: 0, active: false });
  }

  // ── Swipe logic ──────────────────────────────────────────────────────────────

  async function triggerSwipe(dir: "left" | "right") {
    if (!topJob || submitting) return;
    const job = topJob;

    setLastAction({ job, dir });
    setDrag({ x: 0, y: 0, active: false });
    setExpanded(false);
    setCurrent((c) => c + 1);

    if (dir === "right") {
      setAppliedCount((c) => c + 1);
      toast.success(`Applied to ${job.company} ✓`);   // optimistic, immediate
      setShowMatch(true);
      setTimeout(() => setShowMatch(false), 1800);
      submitApplication(job);                          // fire-and-forget (no await)
    } else {
      await recordSkip(job);
    }
  }

  // Keep triggerRef current every render
  triggerRef.current = triggerSwipe;

  async function submitApplication(job: Job): Promise<void> {
    setSubmitting(true);
    try {
      const res  = await fetch("/api/apply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Application failed");
        return;
      }

      // URL-fallback job: open the external form in a new tab so the user can
      // complete it manually. The application row is already created as 'pending'.
      if (data.redirect) {
        window.open(data.redirect as string, "_blank", "noopener,noreferrer");
        return;
      }

      if (data.extensionToken) {
        window.postMessage(
          {
            type: "NUSW_SUBMIT",
            jobUrl: (data.jobUrl ?? job.ats_fallback_url) as string,
            jobId: job.id,
            extensionToken: data.extensionToken as string,
            profile: data.profile,
          },
          "*"
        );
      }

      if (data.visaWarning) {
        toast.warning(data.visaWarning);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function recordSkip(job: Job) {
    await fetch("/api/applications", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jobId: job.id }),
    });
  }

  function handleUndo() {
    if (!lastAction) return;
    setCurrent((c) => c - 1);
    if (lastAction.dir === "right") setAppliedCount((c) => c - 1);
    setLastAction(null);
    setExpanded(false);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") triggerRef.current("right");
      if (e.key === "ArrowLeft")  triggerRef.current("left");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset current index when filters change to avoid out-of-bounds
  useEffect(() => {
    setCurrent(0);
  }, [activeFilters, minScore]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const rotation  = drag.x * 0.08;
  const remaining = Math.max(0, filteredJobs.length - current);
  const progress  = filteredJobs.length > 0 ? (current / filteredJobs.length) * 100 : 0;

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        data-testid="swipe-loading"
        className="w-full max-w-[440px] mx-auto animate-pulse rounded-3xl border border-white/10 p-5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        {/* Logo + title skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
          </div>
        </div>
        {/* Pills skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-white/10 rounded-full w-20" />
          <div className="h-6 bg-white/10 rounded-full w-24" />
        </div>
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-5/6" />
          <div className="h-3 bg-white/10 rounded w-4/6" />
        </div>
      </div>
    );
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (done || filteredJobs.length === 0) {
    return (
      <div
        data-testid="swipe-empty"
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">You're all caught up!</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Applied to {appliedCount} role{appliedCount !== 1 ? "s" : ""} today.
          Check your tracker to follow up.
        </p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div data-testid="swipe-stack" className="flex flex-col w-full max-w-[440px] mx-auto">

      {/* Stats row */}
      <div className="flex items-center justify-end gap-4 px-1 pb-3">
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Applied</p>
          <p className="text-xl font-bold text-purple-400">{appliedCount}</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Remaining</p>
          <p className="text-xl font-bold text-slate-200">{remaining}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTERS.map((f, i) => {
          const isActive = i === 0
            ? activeFilters.size === 0
            : activeFilters.has(i);

          return (
            <button
              key={f}
              onClick={() => toggleFilter(i)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                isActive
                  ? "bg-purple-600/40 border-purple-400/60 text-purple-200"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Match score filter */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Min. Match</span>
          <span className={`text-sm font-bold tabular-nums ${minScore === 0 ? "text-slate-500" : minScore >= 70 ? "text-emerald-400" : minScore >= 40 ? "text-yellow-400" : "text-slate-300"}`}>
            {minScore === 0 ? "Any" : `${minScore}%+`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${minScore}%, rgba(255,255,255,0.1) ${minScore}%)`,
          }}
        />
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
          <span>Any</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full">
        {/* Background peek card */}
        {nextJob && (
          <div
            className="absolute inset-x-0 top-0 rounded-3xl bg-white/[0.04] border border-white/[0.07]"
            style={{
              transform: "scale(0.93) translateY(18px)",
              zIndex: 0,
              height: "100%",
              minHeight: 300,
            }}
          />
        )}

        {/* Top card with drag */}
        <div
          ref={cardRef}
          className="relative w-full"
          style={{
            zIndex: 2,
            cursor: drag.active ? "grabbing" : "grab",
            touchAction: "none",
            transition: drag.active ? "none" : "transform 0.3s cubic-bezier(.4,0,.2,1)",
            transform: drag.active
              ? `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rotation}deg)`
              : "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <JobCard
            job={topJob!}
            dragX={drag.x}
            expanded={expanded}
            onToggleExpand={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            score={scores?.[topJob!.id]?.score}
            reasons={scores?.[topJob!.id]?.reasons}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-5 pt-6 pb-2 relative">
        {/* Skip */}
        <button
          onClick={() => triggerSwipe("left")}
          disabled={submitting}
          aria-label="Skip"
          className="w-14 h-14 rounded-full flex items-center justify-center border border-red-500/40 bg-white/5 shadow-lg hover:bg-red-950/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Super-like (coming soon) */}
        <button
          disabled
          aria-label="Save for later (coming soon)"
          title="Coming soon"
          className="w-12 h-12 rounded-full flex items-center justify-center border border-yellow-400/25 bg-white/5 opacity-40 cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Apply */}
        <button
          onClick={() => triggerSwipe("right")}
          disabled={submitting}
          aria-label="Apply"
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #7c3aed, #9d46f5)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Undo */}
        {lastAction && (
          <button
            onClick={handleUndo}
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all text-sm"
            aria-label="Undo last swipe"
            title="Undo"
          >
            ↩
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[11px] text-slate-600 pt-1 pb-4">
        ← skip &nbsp;·&nbsp; → apply &nbsp;·&nbsp; or drag the card
      </p>

      {/* Match toast */}
      {showMatch && lastAction?.dir === "right" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="text-center rounded-2xl px-10 py-6 border border-white/20"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.92), rgba(157,70,245,0.92))",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(124,58,237,0.5)",
              animation: "matchPop 1.8s ease forwards",
            }}
          >
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-xl font-bold text-white mb-1">Application Sent!</div>
            <div className="text-sm text-white/70">
              Applied to <strong>{lastAction.job.company}</strong>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes matchPop {
          0%   { transform: scale(0.6);    opacity: 0; }
          20%  { transform: scale(1.05);   opacity: 1; }
          30%  { transform: scale(1);      opacity: 1; }
          80%  { transform: scale(1);      opacity: 1; }
          100% { transform: scale(0.8);    opacity: 0; }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7c3aed;
          border: 2px solid #a78bfa;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(124,58,237,0.6);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7c3aed;
          border: 2px solid #a78bfa;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(124,58,237,0.6);
        }
      `}</style>
    </div>
  );
}
