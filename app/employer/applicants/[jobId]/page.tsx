"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, Application, Employer, Candidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Users, ExternalLink, RefreshCw, Save } from "lucide-react";

interface ApplicationWithCandidate extends Application {
  jobs: Job;
  candidates: Candidate;
}

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

export default function JobApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Load page data
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

      // Fetch the specific job
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("posted_by", user.id)
        .single();

      if (jobError || !jobData) {
        console.error("Job fetch error:", jobError);
        toast.error("Job not found or access denied.");
        router.push("/employer/dashboard");
        return;
      }
      setJob(jobData as Job);

      // Fetch applications for this specific job
      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select(`
          *,
          jobs:job_id (
            id,
            role,
            company,
            location,
            division,
            salary_range,
            description,
            tags,
            ats_type,
            filled_spots,
            total_spots,
            visa_sponsorship,
            logo_url,
            active,
            posted_by
          ),
          candidates:user_id (
            id,
            email,
            first_name,
            last_name,
            phone_number,
            phone_country_code,
            major,
            gpa,
            sg_university,
            hk_university,
            grad_month_year,
            resume_url,
            linkedin_url
          )
        `)
        .eq("job_id", jobId)
        .order("applied_at", { ascending: false });

      if (appsError) {
        console.error("Applications fetch error:", JSON.stringify(appsError));
        throw new Error("Failed to fetch applications");
      }
      
      if (!appsData) {
        setApplications([]);
      } else {
        setApplications(appsData as unknown as ApplicationWithCandidate[]);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load applicants";
      toast.error(errorMessage);
      console.error("Page load failure:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [jobId]);

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

  // Helper stats
  const totalApplicants = applications.length;
  const pendingReviews = applications.filter((a) => a.status === "applied" || a.status === "pending").length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offersMade = applications.filter((a) => a.status === "offer").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const statusMatch = selectedStatusFilter === "all" || app.status === selectedStatusFilter;
    return statusMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Loading Applicants...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <p className="text-slate-400 text-sm">Job not found</p>
          <Button onClick={() => router.push("/employer/dashboard")} className="bg-indigo-600 hover:bg-indigo-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/employer/dashboard")}
              className="h-10 w-10 text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs text-slate-400">Job Applicants for</p>
              <p className="text-sm font-semibold text-indigo-300">{job.role}</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Total Applicants</p>
            <p className="text-sm font-bold text-emerald-400">{totalApplicants}</p>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Job Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold">{job.role}</h1>
            <p className="text-slate-400 mt-2">
              <span className="text-indigo-400 font-medium">{job.location === "SG" ? "🇸🇬 Singapore" : job.location === "HK" ? "🇭🇰 Hong Kong" : "Multiple Locations"}</span>
              {job.division && <span className="ml-2">· {job.division}</span>}
              {job.salary_range && <span className="ml-2">· {job.salary_range}</span>}
            </p>
          </div>
          <Badge className={job.active ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/30" : "bg-slate-800 text-slate-400"}>
            {job.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Total Applicants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplicants}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{pendingReviews}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Interviewing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-400">{interviewingCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-400">{offersMade}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/30 p-4 border border-white/10 rounded-xl">
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
          <div className="flex-1" />
          <div className="text-right text-xs text-slate-400 pt-6">
            Showing <span className="text-white font-semibold">{filteredApps.length}</span> of <span className="text-white font-semibold">{totalApplicants}</span> applicants
          </div>
        </div>

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-white/10 rounded-2xl">
            <Users className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">No Matching Applicants</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              We couldn't find any applicants matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => {
              const candidate = app.candidates;
              const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email || "Graduate Profile";
              const university = candidate.sg_university || candidate.hk_university || "APAC Graduate";

              return (
                <Card key={app.id} className="bg-slate-900/50 border-white/10 text-white hover:border-white/20 transition-all p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Candidate Basic Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{candidateName}</h3>
                        <Badge className="bg-indigo-950 text-indigo-300 border border-indigo-900/50 text-[10px]">
                          Application ID: {app.id.slice(0, 8)}
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
      </main>
    </div>
  );
}