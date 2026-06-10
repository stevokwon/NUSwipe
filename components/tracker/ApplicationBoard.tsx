"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ApplicationWithJob, ApplicationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

const COLUMNS: { status: ApplicationStatus; label: string; icon: string; color: string }[] = [
  { status: "pending", label: "Pending", icon: "⏳", color: "border-orange-500/40 bg-orange-950/20" },
  { status: "applied", label: "Applied", icon: "📤", color: "border-blue-500/40 bg-blue-950/20" },
  { status: "interviewing", label: "Interviewing", icon: "🎤", color: "border-yellow-500/40 bg-yellow-950/20" },
  { status: "offer", label: "Offer", icon: "🎉", color: "border-green-500/40 bg-green-950/20" },
  { status: "rejected", label: "Rejected", icon: "❌", color: "border-red-500/40 bg-red-950/20" },
];

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

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const count = applications.filter((a) => a.status === col.status).length;
          return (
            <div
              key={col.status}
              className={`rounded-xl border p-3 text-center ${col.color}`}
            >
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {col.icon} {col.label}
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <p className="text-sm text-slate-400">
          {total} application{total !== 1 ? "s" : ""} · {responseRate}% response rate
        </p>
      )}

      {total === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg font-medium text-slate-400">No applications yet</p>
          <p className="text-sm mt-1">Swipe right on jobs to start applying!</p>
        </div>
      )}

      {/* Pending section — leftmost, shown only when unconfirmed submissions exist */}
      {pendingApps.length > 0 && (
        <section aria-label="pending applications" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            Awaiting your confirmation
          </p>
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
  const col = COLUMNS.find((c) => c.status === app.status) ?? COLUMNS[0];
  const isPending = app.status === "pending";

  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors">
      {/* Company logo */}
      <CompanyLogo 
        company={job?.company ?? "Unknown"} 
        logoUrl={job?.logo_url} 
        className="w-12 h-12" 
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-white text-sm truncate">{job?.role ?? "Unknown role"}</p>
            <p className="text-slate-400 text-xs">{job?.company ?? "—"} · {job?.location ?? "—"}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {(job?.tags ?? []).slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] bg-white/10 text-slate-400 border-white/10"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <p className="text-xs text-slate-500">
            {isPending ? "Opened" : "Applied"}{" "}
            {new Date(app.applied_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
          </p>

          {isPending ? (
            /* Pending actions: re-open the career page + confirm submission */
            <div className="flex items-center gap-2">
              {job?.ats_fallback_url && (
                <a
                  href={job.ats_fallback_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
                >
                  Finish applying
                </a>
              )}
              {onConfirmApplied && (
                <button
                  type="button"
                  onClick={onConfirmApplied}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1 transition-colors"
                >
                  Mark as Applied
                </button>
              )}
            </div>
          ) : (
            /* Status selector for confirmed applications */
            <select
              value={app.status}
              onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
              className="text-xs bg-transparent border border-white/20 text-slate-300 rounded-lg px-2 py-1 cursor-pointer hover:border-purple-500 transition-colors"
            >
              {COLUMNS.filter((c) => c.status !== "pending").map((c) => (
                <option key={c.status} value={c.status} className="bg-slate-900">
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
