"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, Users, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { JobActionsMenu } from "@/components/employer/JobActionsMenu";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

export default function EmployerJobsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [showInactiveJobs, setShowInactiveJobs] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  function toggleJobExpansion(jobId: string) {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  async function loadData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/employer/login");
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("posted_by", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData as Job[]);

      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, status, job_id")
        .in("job_id", (jobsData as Job[]).map(j => j.id));

      if (appsError) console.error("Apps fetch error:", appsError);
      else setApplications(appsData as Application[]);

    } catch (err: any) {
      toast.error(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function togglePauseJob(job: Job) {
    try {
      const { error } = await (supabase as any)
        .from("jobs")
        .update({ active: !job.active })
        .eq("id", job.id);
      if (error) throw error;
      toast.success(`Job ${job.active ? 'paused' : 'resumed'} successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update job status");
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
    try {
      const { error } = await (supabase as any)
        .from("jobs")
        .delete()
        .eq("id", jobId);
      if (error) throw error;
      toast.success("Job deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job");
    }
  }

  const applicantCounts = applications.reduce((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Openings</h1>
          <p className="text-slate-400 mt-1">Manage and track your active job listings.</p>
        </div>
        <Button onClick={() => router.push("/employer/jobs/new")} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6 h-11 rounded-xl shadow-lg shadow-indigo-500/20">
          <Plus className="h-5 w-5" /> Post New Job
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-semibold text-lg">Active Listings ({jobs.filter(j => j.active).length})</h2>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactiveJobs}
              onChange={(e) => setShowInactiveJobs(e.target.checked)}
              className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <Label htmlFor="showInactive" className="text-sm text-slate-300 cursor-pointer select-none">
              Show Inactive
            </Label>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-dashed border-white/10 rounded-3xl">
            <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-slate-300 text-lg">No Job Openings Yet</p>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
              Get started by creating your first job posting and reach qualified candidates.
            </p>
            <Button onClick={() => router.push("/employer/jobs/new")} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-8">
              Create First Posting
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {jobs
              .filter((job) => showInactiveJobs || job.active)
              .map((job) => {
                const count = applicantCounts[job.id] || 0;
                return (
                  <div key={job.id} className="group">
                    <Card 
                      className={`relative h-full text-white flex flex-col justify-between transition-all duration-300 border overflow-hidden ${
                        job.active 
                          ? "bg-slate-900/40 border-white/5 hover:border-indigo-500/30 hover:bg-slate-900/60 shadow-xl hover:shadow-indigo-500/5" 
                          : "bg-rose-950/10 border-rose-500/20 opacity-80"
                      }`}
                    >
                      <div className="absolute top-4 right-4 z-10">
                        <JobActionsMenu 
                          jobId={job.id} 
                          active={job.active} 
                          onEdit={() => router.push(`/employer/jobs/${job.id}/edit`)} 
                          onTogglePause={() => togglePauseJob(job)} 
                          onDelete={() => deleteJob(job.id)} 
                          onManageApplicants={() => router.push(`/employer/applicants/${job.id}`)}
                        />
                      </div>
                      <CardHeader className="pb-4">
                        <div className="flex items-start gap-4">
                          <CompanyLogo 
                            company={job.company} 
                            logoUrl={job.logo_url} 
                            className="h-12 w-12 rounded-xl" 
                          />
                          <div className="min-w-0 pr-8">
                            <div className="flex items-start gap-2 flex-wrap">
                              <CardTitle className="text-xl font-bold leading-tight break-words">{job.role}</CardTitle>
                              <Badge className={cn(
                                "text-[10px] px-2 py-0 transition-colors shrink-0 mt-1",
                                job.active 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              )}>
                                {job.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-sm font-medium mt-1">
                              {job.location === "SG" ? "🇸🇬 Singapore" : job.location === "HK" ? "🇭🇰 Hong Kong" : job.location}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">{count} Applicants</span>
                          </div>
                          {job.salary_range && (
                            <p className="text-sm text-slate-300 font-semibold">{job.salary_range}</p>
                          )}
                        </div>

                        {job.description && (
                          <div className="space-y-2">
                            <p className={cn(
                              "text-xs text-slate-400 leading-relaxed whitespace-pre-wrap transition-all duration-300",
                              expandedJobs.has(job.id) ? "" : "line-clamp-2"
                            )}>
                              {job.description}
                            </p>
                            <button
                              onClick={() => toggleJobExpansion(job.id)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                              {expandedJobs.has(job.id) ? "▲ Less" : "▼ More"}
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {job.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-white/5 text-slate-400 text-[10px] border-white/5">
                              {tag}
                            </Badge>
                          ))}
                          {job.tags.length > 4 && (
                            <Badge variant="secondary" className="bg-white/5 text-slate-500 text-[10px] border-white/5">
                              +{job.tags.length - 4} more
                            </Badge>
                          )}
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                          <div className="flex flex-col gap-1">
                            <span>Integration: <b className="text-slate-400 uppercase">{job.ats_type}</b></span>
                            <span>Visa: <b className="text-slate-400">{job.visa_sponsorship ? "Sponsored" : "No"}</b></span>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5">Spots</div>
                            <div className="text-sm font-bold text-indigo-400">{job.filled_spots} <span className="text-slate-600 font-normal">/ {job.total_spots}</span></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
