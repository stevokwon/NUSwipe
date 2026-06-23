"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ApplicationWithJob, ApplicationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/lib/types";

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: string }
> = {
  pending: { label: "Needs confirmation", tone: "border-amber-500/20 bg-amber-500/10 text-amber-200" },
  applied: { label: "Applied", tone: "border-sky-500/20 bg-sky-500/10 text-sky-200" },
  interviewing: { label: "Interviewing", tone: "border-violet-500/20 bg-violet-500/10 text-violet-200" },
  offer: { label: "Offer", tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" },
  rejected: { label: "Rejected", tone: "border-rose-500/20 bg-rose-500/10 text-rose-200" },
};

function getOriginalJobUrl(job: Job | undefined): string | null {
  if (!job) return null;

  if (job.ats_type === "greenhouse" && job.ats_board_token && job.ats_job_id) {
    return `https://boards.greenhouse.io/${job.ats_board_token}/jobs/${job.ats_job_id}`;
  }

  if (job.ats_type === "lever" && job.ats_board_token && job.ats_job_id) {
    return `https://jobs.lever.co/${job.ats_board_token}/${job.ats_job_id}`;
  }

  return job.ats_fallback_url;
}

// Exported for unit testing. Pending apps are excluded from both numerator and
// denominator — they are unconfirmed submissions (URL-fallback job opened in new tab) and
// should not inflate the total or depress the response rate.
export function computeResponseRate(applications: ApplicationWithJob[]): number {
  const confirmed = applications.filter((a) => a.status !== "pending");
  if (confirmed.length === 0) return 0;
  return Math.round(
    (confirmed.filter((a) => a.status !== "applied").length / confirmed.length) * 100
  );
}

interface Props {
  initialApplications: ApplicationWithJob[];
}

export function ApplicationBoard({ initialApplications }: Props) {
  const [applications, setApplications] = useState(initialApplications);

  async function updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      toast.error("Failed to update status");
      // Revert
      setApplications(initialApplications);
    }
  }

  const pendingApps = applications.filter((a) => a.status === "pending");
  const confirmedApps = applications.filter((a) => a.status !== "pending");
  const total = applications.length;
  const responseRate = computeResponseRate(applications);
  const activeCount = applications.filter((a) => a.status === "applied" || a.status === "interviewing").length;
  const offerCount = applications.filter((a) => a.status === "offer").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total" value={total} />
        <Metric label="Needs review" value={pendingApps.length} />
        <Metric label="Active" value={activeCount} />
        <Metric label="Offers" value={offerCount} />
      </div>

      {total > 0 && (
        <p className="text-sm text-slate-500">
          {total} application{total !== 1 ? "s" : ""} · {responseRate}% response rate
        </p>
      )}

      {total === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-lg font-semibold text-white">No applications yet</p>
          <p className="mt-2 text-sm text-slate-400">Swipe right on a role to start building your tracker.</p>
        </div>
      )}

      {/* Pending section — leftmost, shown only when unconfirmed submissions exist */}
      {pendingApps.length > 0 && (
        <section aria-label="pending applications" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Needs your confirmation</p>
          {pendingApps.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={(status) => updateStatus(app.id, status)}
              onConfirmApplied={() => updateStatus(app.id, "applied")}
            />
          ))}
        </section>
      )}

      {/* Confirmed application cards — sorted by date descending */}
      {confirmedApps.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">All applications</p>
          {confirmedApps.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={(status) => updateStatus(app.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function ApplicationCard({
  application: app,
  onStatusChange,
  onConfirmApplied,
}: {
  application: ApplicationWithJob;
  onStatusChange: (status: ApplicationStatus) => void;
  onConfirmApplied?: () => void;
}) {
  const job = app.jobs;
  const meta = STATUS_META[app.status];
  const isPending = app.status === "pending";
  const originalJobUrl = getOriginalJobUrl(job);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-sm transition-colors hover:border-white/15">
      <div className="flex items-start gap-4">
        <CompanyLogo company={job?.company ?? "Unknown"} logoUrl={job?.logo_url} className="h-12 w-12" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{job?.role ?? "Unknown role"}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {job?.company ?? "—"} · {job?.location ?? "—"}
              </p>
            </div>

            <Badge variant="secondary" className={`border px-2.5 py-1 text-xs ${meta.tone}`}>
              {meta.label}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(job?.tags ?? []).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="border-white/10 bg-white/5 text-[10px] text-slate-400">
                {tag}
              </Badge>
            ))}
          </div>

          {originalJobUrl && (
            <div className="mt-3">
              <a
                href={originalJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline"
              >
                View original job page
              </a>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {isPending ? "Opened" : "Applied"}{" "}
              {new Date(app.applied_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            </p>

            {isPending ? (
              <div className="flex flex-wrap items-center gap-3">
                {job?.ats_fallback_url && (
                  <a
                    href={job.ats_fallback_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-300 underline-offset-4 hover:underline hover:text-white"
                  >
                    Finish applying
                  </a>
                )}
                {onConfirmApplied && (
                  <button
                    type="button"
                    onClick={onConfirmApplied}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
                  >
                    Mark as applied
                  </button>
                )}
              </div>
            ) : (
              <Select value={app.status} onValueChange={(val) => onStatusChange(val as ApplicationStatus)}>
                <SelectTrigger className="h-8 min-w-[150px] bg-white/5 text-xs text-slate-200 border-white/10 hover:border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950 text-white">
                  {Object.entries(STATUS_META)
                    .filter(([status]) => status !== "pending")
                    .map(([status, value]) => (
                      <SelectItem key={status} value={status}>
                        {value.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
