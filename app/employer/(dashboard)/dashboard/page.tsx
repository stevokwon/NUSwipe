"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, Employer, Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, Users, FileText, CheckCircle, Clock, RefreshCw, TrendingUp, ArrowRight } from "lucide-react";

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [employerProfile, setEmployerProfile] = useState<Employer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  async function loadData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/employer/login");
        return;
      }

      const [employerRes, jobsRes] = await Promise.all([
        supabase.from("employers").select("*").eq("id", user.id).single(),
        supabase.from("jobs").select("*").eq("posted_by", user.id)
      ]);

      if (employerRes.error) throw employerRes.error;
      setEmployerProfile(employerRes.data as unknown as Employer);
      setJobs(jobsRes.data as Job[]);

      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, status, job_id, applied_at")
        .in("job_id", (jobsRes.data as Job[]).map(j => j.id))
        .order('applied_at', { ascending: false });

      if (appsError) console.error("Apps error:", appsError);
      else setApplications(appsData as Application[]);

    } catch (err: any) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeJobsCount = jobs.filter((j) => j.active).length;
  const pendingReviews = applications.filter((a) => a.status === "applied" || a.status === "pending").length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offersMade = applications.filter((a) => a.status === "offer").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {employerProfile?.contact_name || "Recruiter"}</h1>
          <p className="text-slate-400 mt-1">
            Here's what's happening with <span className="text-indigo-400 font-medium">{employerProfile?.company_name}</span> today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Jobs" value={activeJobsCount} subValue={`out of ${jobs.length}`} icon={Briefcase} color="indigo" />
        <StatCard title="Pending Review" value={pendingReviews} subValue="Action needed" icon={Clock} color="amber" />
        <StatCard title="Shortlisted" value={interviewingCount} subValue="Interview stage" icon={FileText} color="sky" />
        <StatCard title="Total Hires" value={offersMade} subValue="Success rate" icon={CheckCircle} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions / Recent Activity Placeholder */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-white/5 shadow-2xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Recent Applications</CardTitle>
              <p className="text-xs text-slate-500 mt-1">The latest graduates who applied to your roles.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No applications yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {app.status[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Application #{app.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-slate-500">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase bg-white/5 text-slate-400">
                      {app.status}
                    </Badge>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 text-xs font-bold gap-2 cursor-pointer"
                  onClick={() => router.push("/employer/jobs")}
                >
                  View all in Jobs <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Quick Tips / Updates */}
        <div className="space-y-6">
          <Card className="bg-indigo-600/10 border-indigo-500/20 shadow-xl overflow-hidden relative">
             <div className="absolute -top-4 -right-4 h-24 w-24 bg-indigo-500/20 rounded-full blur-3xl" />
             <CardHeader>
               <CardTitle className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                 <TrendingUp className="h-4 w-4" /> Hiring Tip
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-indigo-100/80 leading-relaxed">
                 Jobs with detailed technology tags get 40% more matches. Make sure to list all relevant skills in your postings!
               </p>
             </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-white/5 shadow-xl">
             <CardHeader>
               <CardTitle className="text-sm font-bold">System Status</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-slate-400">Greenhouse Sync</span>
                 <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px]">Stable</Badge>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-slate-400">Lever Sync</span>
                 <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px]">Stable</Badge>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, color }: any) {
  const colors: any = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  };

  return (
    <Card className="bg-slate-900/40 border-white/5 shadow-xl hover:bg-slate-900/60 transition-colors group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
        <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-white">{value}</div>
        <p className="text-[10px] text-slate-500 mt-1 font-medium">{subValue}</p>
      </CardContent>
    </Card>
  );
}
