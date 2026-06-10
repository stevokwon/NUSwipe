"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, Profile, Application, AtsType, Employer, Candidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Briefcase, Users, FileText, CheckCircle, Clock, ExternalLink, Plus, Trash2, Edit3, X, Save, RefreshCw } from "lucide-react";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

interface ApplicationWithCandidate extends Application {
  jobs: Job;
  candidates: Candidate;
}

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employerProfile, setEmployerProfile] = useState<Employer | null>(null);

  // Core Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([]);

  // Navigation / Filter State
  const [activeTab, setActiveTab] = useState<"jobs" | "applicants">("jobs");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

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
        console.error("Jobs fetch error object:", JSON.stringify(jobsError, null, 2));
        console.error("Jobs fetch error message:", jobsError.message);
        throw new Error(jobsError.message || "Failed to fetch jobs");
      }
      setJobs(jobsData as Job[]);

      // Fetch applications (Inner join on jobs to filter by employer)
      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select(`
          *,
          jobs:job_id!inner(*),
          candidates:user_id(*)
        `)
        .eq("jobs.posted_by", user.id);

      if (appsError) {
        console.error("Applications fetch error:", appsError);
        throw new Error(appsError.message);
      }
      setApplications(appsData as unknown as ApplicationWithCandidate[]);
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

  // Toggle job active state
  async function toggleJobActive(job: Job) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("jobs")
        .update({ active: !job.active })
        .eq("id", job.id)
        .eq("posted_by", currentUser.id);

      if (error) throw error;
      toast.success(`Job marked as ${!job.active ? "Active" : "Inactive"}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle job status");
    }
  }

  // Delete Job Posting
  async function deleteJob(id: string) {
    if (!confirm("Are you sure you want to delete this job posting? This will also delete all candidate applications associated with it.")) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("jobs")
        .delete()
        .eq("id", id)
        .eq("posted_by", currentUser.id);

      if (error) throw error;
      toast.success("Job posting deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job posting");
    }
  }

  // Update candidate application status
  async function updateApplicationStatus(appId: string, status: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;
      toast.success(`Application status updated to ${status}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update application status");
    }
  }

  // Update application notes
  async function saveApplicationNotes(appId: string, notes: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("applications")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;
      toast.success("Notes saved successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes");
    }
  }

  // Helper stats computation
  const activeJobsCount = jobs.filter((j) => j.active).length;
  const totalApplicants = applications.length;
  const pendingReviews = applications.filter((a) => a.status === "applied" || a.status === "pending").length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offersMade = applications.filter((a) => a.status === "offer").length;

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const jobMatch = selectedJobFilter === "all" || app.job_id === selectedJobFilter;
    const statusMatch = selectedStatusFilter === "all" || app.status === selectedStatusFilter;
    return jobMatch && statusMatch;
  });

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
              <CardTitle className="text-xs font-medium text-slate-400">Total Swipes</CardTitle>
              <Users className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplicants}</div>
              <p className="text-[10px] text-slate-400 mt-1">candidates applied</p>
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

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 gap-4">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`pb-2.5 font-semibold text-sm transition-colors border-b-2 px-1 ${
              activeTab === "jobs"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Job Listings ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("applicants")}
            className={`pb-2.5 font-semibold text-sm transition-colors border-b-2 px-1 ${
              activeTab === "applicants"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Candidates & Applications ({totalApplicants})
          </button>
        </div>

        {/* Tab 1: Job Listings */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
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
                {jobs.map((job) => (
                  <Card key={job.id} className="bg-slate-900/50 border-white/10 text-white flex flex-col justify-between hover:border-white/20 transition-all">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                      <div>
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
                      <CompanyLogo company={job.company} logoUrl={job.logo_url} />
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      {job.salary_range && (
                        <p className="text-sm text-indigo-300 font-medium">💰 {job.salary_range}</p>
                      )}
                      {job.description && (
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{job.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {job.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-white/5 text-slate-300 text-[10px] hover:bg-white/10">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>ATS Type: <b className="text-indigo-400">{job.ats_type}</b></span>
                        <span>Visa Sponsor: <b>{job.visa_sponsorship ? "Yes" : "No"}</b></span>
                      </div>
                    </CardContent>
                    <div className="bg-white/5 px-4 py-3 flex items-center justify-between rounded-b-xl border-t border-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleJobActive(job)}
                        className={`text-xs ${job.active ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/20" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"}`}
                      >
                        {job.active ? "Pause Listing" : "Activate"}
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/employer/jobs/${job.id}/edit`)} className="text-indigo-400 hover:text-indigo-300 hover:bg-white/5">
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteJob(job.id)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Candidates & Applications */}
        {activeTab === "applicants" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/30 p-4 border border-white/10 rounded-xl">
              <div className="flex-1 space-y-1">
                <Label className="text-slate-400 text-xs">Filter by Job Opening</Label>
                <Select value={selectedJobFilter} onValueChange={(val) => setSelectedJobFilter(val || "all")}>
                  <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                    <SelectValue placeholder="All Jobs" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">All Job Openings</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48 space-y-1">
                <Label className="text-slate-400 text-xs">Filter by Status</Label>
                <Select value={selectedStatusFilter} onValueChange={(val) => setSelectedStatusFilter(val || "all")}>
                  <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="interviewing">Interviewing</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Applications List */}
            {filteredApps.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-dashed border-white/10 rounded-2xl">
                <Users className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-300">No Matching Candidates</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  We couldn't find any candidate applications that match the selected filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApps.map((app) => {
                  const candidate = app.candidates;
                  const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email || "Graduate Profile";
                  const gpaText = candidate.gpa ? `GPA: ${candidate.gpa}` : "GPA: N/A";
                  const university = candidate.sg_university || candidate.hk_university || "APAC Graduate";
                  const resumeName = candidate.resume_url ? "View Resume" : "No Resume Uploaded";

                  return (
                    <Card key={app.id} className="bg-slate-900/50 border-white/10 text-white hover:border-white/20 transition-all p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Candidate Basic Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-white">{candidateName}</h3>
                            <Badge className="bg-indigo-950 text-indigo-300 border border-indigo-900/50 text-[10px]">
                              Applied for: {app.jobs?.role}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs text-slate-400">
                            <div>🎓 <span className="text-slate-300 font-medium">{university}</span></div>
                            <div>🔬 Major: <span className="text-slate-300">{candidate.major || "Not specified"}</span></div>
                            <div>📊 GPA: <span className="text-slate-300">{candidate.gpa || "N/A"}</span></div>
                            <div>📅 Grad Date: <span className="text-slate-300">{candidate.grad_month_year || "N/A"}</span></div>
                            <div>✉️ Email: <a href={`mailto:${candidate.email}`} className="text-indigo-400 hover:underline">{candidate.email}</a></div>
                            <div>📞 Phone: <span className="text-slate-300">{candidate.phone_country_code || ""} {candidate.phone_number || "N/A"}</span></div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            {candidate.resume_url && (
                              <a
                                href={candidate.resume_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/40"
                              >
                                📄 View Resume <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {candidate.linkedin_url && (
                              <a
                                href={candidate.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium hover:underline bg-sky-950/30 px-2.5 py-1 rounded-lg border border-sky-900/40"
                              >
                                🔗 LinkedIn <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Status update & Internal Notes */}
                        <div className="w-full lg:w-72 space-y-3 border-t lg:border-t-0 lg:border-l border-white/10 pt-3 lg:pt-0 lg:pl-5 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <Label className="text-slate-400 text-xs">Application Status</Label>
                            <Select
                              value={app.status}
                              onValueChange={(val) => updateApplicationStatus(app.id, val || "applied")}
                            >
                              <SelectTrigger className="bg-slate-900 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="interviewing">Interviewing</SelectItem>
                                <SelectItem value="offer">Offer</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Notes */}
                          <div className="space-y-1.5">
                            <Label className="text-slate-400 text-xs">Internal Notes</Label>
                            <NotesField appId={app.id} initialNotes={app.notes || ""} onSave={saveApplicationNotes} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-component to manage individual note updates cleanly with local state
interface NotesFieldProps {
  appId: string;
  initialNotes: string;
  onSave: (appId: string, notes: string) => Promise<void>;
}

function NotesField({ appId, initialNotes, onSave }: NotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setDirty(false);
  }, [initialNotes]);

  async function handleSave() {
    setSaving(true);
    await onSave(appId, notes);
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="flex gap-2">
      <Input
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        placeholder="Add interview feedback, notes..."
        className="bg-slate-900 border-white/10 text-white text-xs h-8 flex-1 placeholder:text-slate-500"
      />
      {dirty && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-2 flex items-center justify-center"
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}
