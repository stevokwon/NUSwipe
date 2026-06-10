"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Job, AtsType, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Tag, 
  FileText, 
  Settings, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  Building2,
  Image as ImageIcon,
  Check,
  RefreshCw
} from "lucide-react";

const STEPS = [
  { id: "identity", title: "Identity", icon: Building2 },
  { id: "logistics", title: "Logistics", icon: MapPin },
  { id: "content", title: "Content", icon: FileText },
  { id: "integration", title: "Integration", icon: Settings },
  { id: "review", title: "Review", icon: CheckCircle },
];

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<Job | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "SG",
    division: "",
    salary_range: "",
    description: "",
    visa_sponsorship: false,
    ats_type: "url" as AtsType,
    ats_board_token: "",
    ats_job_id: "",
    ats_fallback_url: "",
    logo_url: "",
    tagsInput: "",
  });

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/employer/login");
        return;
      }
      setUser(user);

      // Fetch Job
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: jobData, error } = await (supabase as any)
        .from("jobs")
        .select("*")
        .eq("id", id)
        .eq("posted_by", user.id)
        .single();

      if (error || !jobData) {
        toast.error("Job not found or unauthorized");
        router.push("/employer/dashboard");
        return;
      }

      setJob(jobData as Job);
      setFormData({
        company: jobData.company,
        role: jobData.role,
        location: jobData.location,
        division: jobData.division || "",
        salary_range: jobData.salary_range || "",
        description: jobData.description || "",
        visa_sponsorship: jobData.visa_sponsorship,
        ats_type: jobData.ats_type,
        ats_board_token: jobData.ats_board_token || "",
        ats_job_id: jobData.ats_job_id || "",
        ats_fallback_url: jobData.ats_fallback_url || "",
        logo_url: jobData.logo_url || "",
        tagsInput: jobData.tags.join(", "),
      });
      setLoading(false);
    }
    fetchData();
  }, [id, router, supabase]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const tags = formData.tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = {
        company: formData.company,
        role: formData.role,
        location: formData.location,
        division: formData.division || null,
        salary_range: formData.salary_range || null,
        description: formData.description || null,
        visa_sponsorship: formData.visa_sponsorship,
        ats_type: formData.ats_type,
        ats_board_token: formData.ats_type !== "url" ? formData.ats_board_token : null,
        ats_job_id: formData.ats_type !== "url" ? formData.ats_job_id : null,
        ats_fallback_url: formData.ats_fallback_url || null,
        logo_url: formData.logo_url || null,
        tags,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("jobs")
        .update(payload)
        .eq("id", id)
        .eq("posted_by", user.id);

      if (error) throw error;

      toast.success("Job updated successfully!");
      router.push("/employer/dashboard");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Edit Job Posting</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <div className="flex -space-x-1">
              {STEPS.map((step, idx) => (
                <div 
                  key={step.id}
                  className={`h-1.5 w-8 rounded-full ${idx <= currentStep ? "bg-indigo-500" : "bg-slate-800"}`}
                />
              ))}
            </div>
            <span className="ml-2">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        {/* Step Indicator */}
        <div className="mb-12">
          <div className="relative flex justify-between">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
            <motion.div 
              className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 z-0"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />

            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={{
                      scale: isCurrent ? 1.2 : 1,
                      backgroundColor: isActive ? "#6366f1" : "#1e293b",
                    }}
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-4 ${
                      isCurrent ? "border-indigo-400/50" : "border-slate-950"
                    }`}
                  >
                    {idx < currentStep ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-500"}`} />
                    )}
                  </motion.div>
                  <span className={`absolute -bottom-7 text-[10px] font-medium whitespace-nowrap ${
                    isCurrent ? "text-indigo-400" : isActive ? "text-slate-300" : "text-slate-500"
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="mt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm"
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Job Identity</h2>
                    <p className="text-slate-400 text-sm">Update company and role information.</p>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                          value={formData.company}
                          onChange={(e) => updateFormData("company", e.target.value)}
                          className="bg-slate-950/50 border-white/10 pl-10 focus:border-indigo-500/50 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Job Title / Role</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                          value={formData.role}
                          onChange={(e) => updateFormData("role", e.target.value)}
                          className="bg-slate-950/50 border-white/10 pl-10 focus:border-indigo-500/50 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Division / Department</Label>
                        <Input 
                          value={formData.division}
                          onChange={(e) => updateFormData("division", e.target.value)}
                          className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Company Logo URL</Label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input 
                            value={formData.logo_url}
                            onChange={(e) => updateFormData("logo_url", e.target.value)}
                            className="bg-slate-950/50 border-white/10 pl-10 focus:border-indigo-500/50 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Logistics & Tags</h2>
                    <p className="text-slate-400 text-sm">Adjust location and keywords.</p>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Primary Location</Label>
                        <Select 
                          value={formData.location} 
                          onValueChange={(val) => updateFormData("location", val)}
                        >
                          <SelectTrigger className="bg-slate-950/50 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                            <SelectItem value="HK">🇭🇰 Hong Kong</SelectItem>
                            <SelectItem value="SG / HK">🇸🇬 SG / 🇭🇰 HK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Salary Range (Optional)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input 
                            value={formData.salary_range}
                            onChange={(e) => updateFormData("salary_range", e.target.value)}
                            className="bg-slate-950/50 border-white/10 pl-10 focus:border-indigo-500/50 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Skills & Tags</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                          value={formData.tagsInput}
                          onChange={(e) => updateFormData("tagsInput", e.target.value)}
                          className="bg-slate-950/50 border-white/10 pl-10 focus:border-indigo-500/50 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="visa-toggle" className="text-sm font-bold cursor-pointer">Visa Sponsorship</Label>
                        <p className="text-xs text-slate-400">Can you sponsor visas for international graduates?</p>
                      </div>
                      <button
                        id="visa-toggle"
                        type="button"
                        onClick={() => updateFormData("visa_sponsorship", !formData.visa_sponsorship)}
                        className={`h-6 w-11 rounded-full transition-colors relative ${
                          formData.visa_sponsorship ? "bg-indigo-500" : "bg-slate-700"
                        }`}
                      >
                        <motion.div 
                          animate={{ x: formData.visa_sponsorship ? 22 : 2 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Job Description</h2>
                    <p className="text-slate-400 text-sm">Refine the job content.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Description</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      rows={12}
                      className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50 resize-none leading-relaxed text-white"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Application Integration</h2>
                    <p className="text-slate-400 text-sm">Choose how candidates apply.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(["url", "greenhouse", "lever"] as AtsType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateFormData("ats_type", type)}
                          className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                            formData.ats_type === type 
                            ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500" 
                            : "bg-slate-950/50 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            formData.ats_type === type ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                          }`}>
                            {type === "url" ? <Globe className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold capitalize">{type}</p>
                            <p className="text-[10px] text-slate-500">
                              {type === "url" ? "Standard web link" : `${type} API sync`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {formData.ats_type === "url" ? (
                      <div className="space-y-2">
                        <Label className="text-slate-300">External Application URL</Label>
                        <Input 
                          value={formData.ats_fallback_url}
                          onChange={(e) => updateFormData("ats_fallback_url", e.target.value)}
                          className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-white"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-slate-300">
                            {formData.ats_type === "greenhouse" ? "Board Token" : "Account Name"}
                          </Label>
                          <Input 
                            value={formData.ats_board_token}
                            onChange={(e) => updateFormData("ats_board_token", e.target.value)}
                            className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Job ID</Label>
                          <Input 
                            value={formData.ats_job_id}
                            onChange={(e) => updateFormData("ats_job_id", e.target.value)}
                            className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Final Review</h2>
                    <p className="text-slate-400 text-sm">Review changes before saving.</p>
                  </div>

                  <div className="bg-slate-950/80 rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 flex items-start gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="h-8 w-8 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{formData.role}</h3>
                        <p className="text-indigo-400 font-medium">{formData.company}</p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <RefreshCw className="h-3 w-3" /> Last updated: {new Date(job?.created_at || "").toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Integration: {formData.ats_type}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0 || submitting}
              className="text-slate-400 hover:text-white"
            >
              {currentStep > 0 && "Back"}
            </Button>

            <div className="flex gap-4">
              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={nextStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-2xl"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-12 rounded-2xl"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
