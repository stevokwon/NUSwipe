"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Job, Candidate, Application } from "@/lib/types";
import { ApplicantSwipeCard } from "./ApplicantSwipeCard";

interface ApplicationWithCandidate extends Application {
  jobs: Job;
  candidates: Candidate;
}

const SWIPE_THRESHOLD = 100;

interface Props {
  applications: ApplicationWithCandidate[];
  onStatusUpdate: (appId: string, status: string) => Promise<void>;
}

export function ApplicantSwipeStack({ applications: initialApps, onStatusUpdate }: Props) {
  const [apps, setApps] = useState<ApplicationWithCandidate[]>(initialApps);
  const [current, setCurrent] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [lastAction, setLastAction] = useState<{ app: ApplicationWithCandidate; dir: "left" | "right" } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const triggerRef = useRef<(dir: "left" | "right") => void>(() => {});

  useEffect(() => {
    setApps(initialApps);
    setCurrent(0);
  }, [initialApps]);

  const topApp = apps[current] ?? null;
  const nextApp = apps[current + 1] ?? null;
  const done = current >= apps.length;

  function onPointerDown(e: React.PointerEvent) {
    if (done || !topApp) return;
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
    if (drag.x > SWIPE_THRESHOLD) triggerRef.current("right");
    else if (drag.x < -SWIPE_THRESHOLD) triggerRef.current("left");
    else setDrag({ x: 0, y: 0, active: false });
  }

  async function triggerSwipe(dir: "left" | "right") {
    if (!topApp) return;
    const app = topApp;

    setLastAction({ app, dir });
    setDrag({ x: 0, y: 0, active: false });
    setCurrent((c) => c + 1);

    if (dir === "right") {
      toast.success(`Shortlisted ${app.candidates.first_name || 'candidate'} ✓`);
      await onStatusUpdate(app.id, "interviewing");
    } else {
      toast.error(`Rejected ${app.candidates.first_name || 'candidate'} ✕`);
      await onStatusUpdate(app.id, "rejected");
    }
  }

  triggerRef.current = triggerSwipe;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") triggerRef.current("right");
      if (e.key === "ArrowLeft") triggerRef.current("left");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rotation = drag.x * 0.08;
  const remaining = Math.max(0, apps.length - current);

  if (done || apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center bg-slate-900/30 border border-dashed border-white/10 rounded-2xl">
        <div className="text-6xl">🙌</div>
        <h2 className="text-2xl font-bold text-white">No more applicants to review</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          You've reached the end of the stack.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[400px] mx-auto space-y-6">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Reviewing Applicants ({remaining} remaining)
        </p>
      </div>

      <div className="relative w-full aspect-[3/4] min-h-[500px]">
        {nextApp && (
          <div
            className="absolute inset-x-0 top-0 rounded-3xl bg-white/[0.04] border border-white/[0.07]"
            style={{
              transform: "scale(0.95) translateY(15px)",
              zIndex: 0,
              height: "100%",
            }}
          />
        )}

        <div
          ref={cardRef}
          className="relative w-full h-full"
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
          <ApplicantSwipeCard application={topApp!} dragX={drag.x} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => triggerRef.current("left")}
          className="w-16 h-16 rounded-full flex items-center justify-center border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
        >
          <span className="text-2xl text-rose-500">✕</span>
        </button>
        <button
          onClick={() => triggerRef.current("right")}
          className="w-16 h-16 rounded-full flex items-center justify-center border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
        >
          <span className="text-2xl text-emerald-500">✓</span>
        </button>
      </div>
      
      <p className="text-center text-[11px] text-slate-600">
        ← reject &nbsp;·&nbsp; → shortlist &nbsp;·&nbsp; or drag the card
      </p>
    </div>
  );
}
