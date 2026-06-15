"use client";

import { useState } from "react";
import type { Job, Candidate, Application } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Microscope, BarChart3, Calendar, Mail, Phone, FileText, ExternalLink } from "lucide-react";

interface ApplicationWithCandidate extends Application {
  jobs: Job;
  candidates: Candidate;
}

interface Props {
  application: ApplicationWithCandidate;
  dragX?: number;
}

export function ApplicantSwipeCard({ application, dragX = 0 }: Props) {
  const shortlistOpacity = Math.min(1, Math.max(0, dragX / 80));
  const rejectOpacity    = Math.min(1, Math.max(0, -dragX / 80));

  const candidate = application.candidates;
  const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email || "Graduate Profile";
  const university = candidate.sg_university || candidate.hk_university || "APAC Graduate";

  return (
    <div
      className="relative w-full rounded-3xl border border-white/10 select-none overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}
    >
      {/* ── Shortlist stamp ─────────────────────────────────────────────────────── */}
      {shortlistOpacity > 0.05 && (
        <div
          className="absolute top-7 left-5 font-black text-2xl tracking-widest uppercase px-3 py-1 rounded-xl border-[3px] border-emerald-400 text-emerald-400 pointer-events-none z-10"
          style={{ transform: "rotate(-15deg)", opacity: shortlistOpacity }}
        >
          Shortlist ✓
        </div>
      )}

      {/* ── Reject stamp ──────────────────────────────────────────────────────── */}
      {rejectOpacity > 0.05 && (
        <div
          className="absolute top-7 right-5 font-black text-2xl tracking-widest uppercase px-3 py-1 rounded-xl border-[3px] border-rose-400 text-rose-400 pointer-events-none z-10"
          style={{ transform: "rotate(15deg)", opacity: rejectOpacity }}
        >
          Reject ✕
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{candidateName}</h3>
            <Badge className="bg-indigo-950 text-indigo-300 border border-indigo-900/50 text-[10px]">
              Applied for: {application.jobs?.role}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="font-medium">{university}</span>
          </div>
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Major: {candidate.major || "Not specified"}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>GPA: {candidate.gpa || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Grad Date: {candidate.grad_month_year || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
            <a href={`mailto:${candidate.email}`} className="text-indigo-400 hover:underline truncate">
              {candidate.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>{candidate.phone_country_code || ""} {candidate.phone_number || "N/A"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {candidate.resume_url && (
            <a
              href={candidate.resume_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 font-semibold hover:bg-emerald-950/50 transition-colors"
            >
              <FileText className="h-4 w-4" /> View Resume <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-sky-950/30 text-sky-400 border border-sky-900/40 font-semibold hover:bg-sky-950/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
