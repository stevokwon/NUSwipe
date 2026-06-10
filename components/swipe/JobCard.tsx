"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";
import { getCompanyLogo } from "@/lib/utils";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

interface Props {
  job: Job;
  dragX?: number;
  expanded?: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
}

/** Two-letter initials from company name (e.g. "Goldman Sachs" → "GS", "Google" → "G") */
function initials(company: string): string {
  return company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Deterministic match % derived from job ID — consistent across renders */
function matchScore(id: string): number {
  const n = parseInt(id.replace(/-/g, "").slice(-6), 16);
  return 75 + (n % 23);
}

export function JobCard({ job, dragX = 0, expanded = false, onToggleExpand }: Props) {
  const applyOpacity = Math.min(1, Math.max(0, dragX / 80));
  const skipOpacity  = Math.min(1, Math.max(0, -dragX / 80));
  const match        = matchScore(job.id);

  const matchColor =
    match >= 90 ? "#4ade80" : match >= 85 ? "#c084fc" : "#e2e8f0";
  const matchBg =
    match >= 90
      ? "rgba(74,222,128,0.15)"
      : match >= 85
      ? "rgba(192,132,252,0.2)"
      : "rgba(255,255,255,0.08)";
  const matchBorder =
    match >= 90
      ? "rgba(74,222,128,0.3)"
      : match >= 85
      ? "rgba(192,132,252,0.35)"
      : "rgba(255,255,255,0.1)";

  return (
    <div
      className="relative w-full rounded-3xl border border-white/10 select-none overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}
    >
      {/* ── Apply stamp ─────────────────────────────────────────────────────── */}
      {applyOpacity > 0.05 && (
        <div
          className="absolute top-7 left-5 font-black text-2xl tracking-widest uppercase px-3 py-1 rounded-xl border-[3px] border-green-400 text-green-400 pointer-events-none z-10"
          style={{ transform: "rotate(-15deg)", opacity: applyOpacity }}
        >
          Apply ✓
        </div>
      )}

      {/* ── Skip stamp ──────────────────────────────────────────────────────── */}
      {skipOpacity > 0.05 && (
        <div
          className="absolute top-7 right-5 font-black text-2xl tracking-widest uppercase px-3 py-1 rounded-xl border-[3px] border-red-400 text-red-400 pointer-events-none z-10"
          style={{ transform: "rotate(15deg)", opacity: skipOpacity }}
        >
          Skip ✕
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="p-5">
        {/* Header row: logo + company/role + match */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo 
              company={job.company} 
              logoUrl={job.logo_url} 
              className="h-14 w-14"
            />
            <div className="min-w-0">
              <p data-testid="job-company" className="text-xs text-slate-400 font-medium truncate">
                {job.company}
              </p>
              <h2 data-testid="job-role" className="text-[15px] font-bold text-white leading-snug">
                {job.role}
              </h2>
            </div>
          </div>

          {/* Match badge */}
          <div
            className="shrink-0 rounded-xl px-2.5 py-1 text-center"
            style={{ background: matchBg, border: `1px solid ${matchBorder}` }}
          >
            <div className="text-base font-bold" style={{ color: matchColor }}>
              {match}%
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
              match
            </div>
          </div>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.division && <Pill>{job.division}</Pill>}
          <Pill testId="pill-location">📍 {job.location}</Pill>
          {job.salary_range && <Pill testId="pill-salary">💰 {job.salary_range}</Pill>}
          {job.visa_sponsorship && <Pill testId="pill-visa">✅ Visa</Pill>}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-sm text-slate-300/80 leading-relaxed mb-4 line-clamp-3">
            {job.description}
          </p>
        )}

        {/* Tech tags */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(124,58,237,0.2)",
                  border: "1px solid rgba(192,132,252,0.25)",
                  color: "#c084fc",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        {onToggleExpand && (
          <button
            className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-300 transition-colors"
            onClick={onToggleExpand}
          >
            {expanded ? "▲ Less details" : "▼ More details"}
          </button>
        )}
      </div>

      {/* ── Expanded section ────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-white/[0.07] px-5 py-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Full Description
          </p>
          <p className="text-sm text-slate-300/70 leading-relaxed">{job.description}</p>
          {job.ats_fallback_url && (
            <a
              href={job.ats_fallback_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block text-xs text-purple-400 hover:underline"
            >
              View original posting →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.08] border border-white/10 text-slate-300"
    >
      {children}
    </span>
  );
}
