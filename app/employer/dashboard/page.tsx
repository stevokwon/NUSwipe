"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, Employer, Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, Users, FileText, CheckCircle, Clock, Plus, RefreshCw } from "lucide-react";
import { JobActionsMenu } from "@/components/employer/JobActionsMenu";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employerProfile, setEmployerProfile] = useState<Employer | null>(null);

  // Core Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // UI State
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

  // Load dashboard data
  async function loadData() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth error:", authError);
        router.push("/employer/login");
        return;
      }
      setCurrentUser(user);

      // Fetch employer profile
      const { data: employerData, error: employerError } = await supabase
        .from("employers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (employerError) {
        console.warn("Employer fetch error:", employerError.message);
        toast.error("Employer profile not found.");
        return;
      } else {
        setEmployerProfile(employerData as unknown as Employer);
      }

      // Fetch employer's jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("posted_by", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) {
        throw new Error(jobsError.message || "Failed to fetch jobs");
      }
      setJobs(jobsData as Job[]);

      // Fetch applications counts (lite fetch for stats)
      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, status, job_id")
        .in("job_id", (jobsData as Job[]).map(j => j.id));

      if (appsError) {
        console.error("Applications fetch error:", appsError);
      } else {
        setApplications(appsData as Application[]);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load dashboard data";
      toast.error(errorMessage);
      console.error("Dashboard load failure:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    startTransition(() => {
      router.push("/employer/login");
      router.refresh();
    });
  }

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

  // Helper stats computation
  const activeJobsCount = jobs.filter((j) => j.active).length;
  const totalApplicants = applications.length;
  const pendingReviews = applications.filter((a) => a.status === "applied" || a.status === "pending").length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offersMade = applications.filter((a) => a.status === "offer").length;

  // Map to store applicant counts per job
  const applicantCounts = applications.reduce((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Loading Employer Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <span className="font-bold text-lg tracking-tight">NUSwipe Employer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Recruiter Profile</p>
              <p className="text-sm font-semibold text-indigo-300">{employerProfile?.company_name || "Company"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 hover:bg-white/10">
              Sign out
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Manage openings for <span className="text-indigo-400 font-medium">{employerProfile?.company_name}</span> and find your next hires.
            </p>
          </div>
          <Button onClick={() => router.push("/employer/jobs/new")} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" /> Post New Job
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobsCount}</div>
              <p className="text-[10px] text-slate-400 mt-1">out of {jobs.length} total</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Total Applicants</CardTitle>
              <Users className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplicants}</div>
              <p className="text-[10px] text-slate-400 mt-1">across all jobs</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{pendingReviews}</div>
              <p className="text-[10px] text-slate-400 mt-1">awaiting response</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Shortlisted</CardTitle>
              <FileText className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-400">{interviewingCount}</div>
              <p className="text-[10px] text-slate-400 mt-1">interview stage</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Offers Extended</CardTitle>
              <CheckCircle className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-400">{offersMade}</div>
              <p className="text-[10px] text-slate-400 mt-1">highly matching grads</p>
            </CardContent>
          </Card>
        </div>

        {/* Listings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <h2 className="font-semibold text-sm text-white">Manage Job Openings ({jobs.length})</h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactiveJobs}
                onChange={(e) => setShowInactiveJobs(e.target.checked)}
                className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Label htmlFor="showInactive" className="text-sm text-slate-400 cursor-pointer">
                Show Inactive Jobs
              </Label>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 border border-dashed border-white/10 rounded-2xl">
              <Briefcase className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">No Job Openings Yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                You haven't posted any job openings. Post a new opening to start matching with candidates!
              </p>
              <Button onClick={() => router.push("/employer/jobs/new")} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Create First Posting
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {jobs
                .filter((job) => showInactiveJobs || job.active)
                .map((job) => {
                  const count = applicantCounts[job.id] || 0;
                  return (
                    <div key={job.id} className="group text-left">
                      <Card 
                        className={`relative h-full text-white flex flex-col justify-between transition-all border ${
                          job.active 
                            ? "bg-slate-900/50 border-white/10 group-hover:border-white/20" 
                            : "bg-rose-950/20 border-rose-500/30 opacity-90 group-hover:bg-rose-950/30"
                        }`}
                      >
                        <div className="absolute bottom-2 right-2 z-10">
                          <JobActionsMenu 
                            jobId={job.id} 
                            active={job.active} 
                            onEdit={() => router.push(`/employer/jobs/${job.id}/edit`)} 
                            onTogglePause={() => togglePauseJob(job)} 
                            onDelete={() => deleteJob(job.id)} 
                            onManageApplicants={() => router.push(`/employer/applicants/${job.id}`)}
                          />
                        </div>
                        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg font-bold">{job.role}</CardTitle>
                              <Badge className={job.active ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 text-[10px]" : "bg-slate-800 text-slate-400 text-[10px]"}>
                                {job.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs mt-1">
                              {job.division ? `${job.division} · ` : ""} {job.location === "SG" ? "🇸🇬 Singapore" : job.location === "HK" ? "🇭🇰 Hong Kong" : "🇸🇬 SG / 🇭🇰 HK"}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <CompanyLogo company={job.company} logoUrl={job.logo_url} />
                            <div className="flex items-center gap-1 text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              <Users className="h-3 w-3" />
                              {count} {count === 1 ? 'Applicant' : 'Applicants'}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-6">
                          {job.salary_range && (
                            <p className="text-sm text-indigo-300 font-medium">💰 {job.salary_range}</p>
                          )}
                          {job.description && (
                            <div className="space-y-2">
                              <p className={`text-xs text-slate-400 leading-relaxed transition-all duration-300 whitespace-pre-wrap ${expandedJobs.has(job.id) ? "" : "line-clamp-3"}`}>
                                {job.description}
                              </p>
                              <button
                                onClick={() => toggleJobExpansion(job.id)}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                {expandedJobs.has(job.id) ? "▲ Show less" : "▼ Read full description"}
                              </button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {job.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="bg-white/5 text-slate-300 text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400">
                            <span>ATS Type: <b className="text-indigo-400">{job.ats_type}</b></span>
                            <span className="flex items-center gap-1">
                              Spots: <b>{job.filled_spots} / {job.total_spots}</b>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Visa Sponsor: <b>{job.visa_sponsorship ? "Yes" : "No"}</b></span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
