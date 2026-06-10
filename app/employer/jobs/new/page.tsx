"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AtsType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Tag,
  Settings,
  ArrowLeft,
  Globe,
  Building2,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";

type Errors = Partial<Record<"company" | "role" | "description" | "ats_fallback_url", string>>;

export default function NewJobPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errors, setErrors] = useState<Errors>({});

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
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/employer/login");
        return;
      }
      setUser(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: employer } = await (supabase as any)
        .from("employers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (employer) {
        setFormData(prev => ({ ...prev, company: employer.company_name || "" }));
      }
      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field as soon as the user types
    if (field in errors) {
      setErrors(prev => { const next = { ...prev }; delete next[field as keyof Errors]; return next; });
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!formData.company.trim()) e.company = "Company name is required.";
    if (!formData.role.trim()) e.role = "Job title is required.";
    if (!formData.description.trim()) e.description = "Description is required.";
    if (formData.ats_type === "url" && !formData.ats_fallback_url.trim())
      e.ats_fallback_url = "Application URL is required.";
    return e;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields.");
      // Scroll to the first error
      setTimeout(() => {
        document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

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
        posted_by: user.id,
        active: true,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to post job");
      }

      toast.success("Job posted successfully!");
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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/employer/dashboard")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Post a New Opening</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-6">

        {/* ── All Fields in one card ── */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm space-y-8">

          {/* Identity */}
          <div className="grid gap-5">
            <FieldRow>
              <Field label="Company Name" required error={errors.company}>
                <IconInput
                  icon={<Building2 />}
                  value={formData.company}
                  onChange={v => updateFormData("company", v)}
                  placeholder="e.g. Stripe"
                  error={!!errors.company}
                />
              </Field>
              <Field label="Job Title / Role" required error={errors.role}>
                <IconInput
                  icon={<Briefcase />}
                  value={formData.role}
                  onChange={v => updateFormData("role", v)}
                  placeholder="e.g. Software Engineer (Full-Stack)"
                  error={!!errors.role}
                />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Division / Department">
                <Input
                  value={formData.division}
                  onChange={e => updateFormData("division", e.target.value)}
                  placeholder="e.g. Engineering"
                  className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                />
              </Field>
              <Field label="Company Logo URL">
                <IconInput
                  icon={<ImageIcon />}
                  value={formData.logo_url}
                  onChange={v => updateFormData("logo_url", v)}
                  placeholder="https://..."
                />
              </Field>
            </FieldRow>
          </div>

          <div className="border-t border-white/5" />

          {/* Logistics */}
          <div className="grid gap-5">
            <FieldRow>
              <Field label="Primary Location">
                <Select value={formData.location} onValueChange={val => updateFormData("location", val)}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                    <SelectItem value="HK">🇭🇰 Hong Kong</SelectItem>
                    <SelectItem value="SG / HK">🇸🇬 SG / 🇭🇰 HK</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Salary Range (Optional)">
                <IconInput
                  icon={<DollarSign />}
                  value={formData.salary_range}
                  onChange={v => updateFormData("salary_range", v)}
                  placeholder="e.g. $5k – $8k / month"
                />
              </Field>
            </FieldRow>

            <Field label="Skills & Tags">
              <IconInput
                icon={<Tag />}
                value={formData.tagsInput}
                onChange={v => updateFormData("tagsInput", v)}
                placeholder="React, TypeScript, Fintech, Remote... (comma separated)"
              />
            </Field>

            <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
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
                className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${formData.visa_sponsorship ? "bg-indigo-500" : "bg-slate-700"}`}
              >
                <span
                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: formData.visa_sponsorship ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Description */}
          <div className="space-y-2" data-error={!!errors.description}>
            <Label className={errors.description ? "text-red-400" : "text-slate-300"}>
              Description <span className={errors.description ? "text-red-400" : "text-indigo-400"}>*</span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={e => updateFormData("description", e.target.value)}
              placeholder="Share details about the role, tech stack, and what makes your team special..."
              rows={10}
              className={`bg-slate-950/50 focus:border-indigo-500/50 resize-none leading-relaxed text-white transition-colors ${
                errors.description
                  ? "border-red-500/60 bg-red-500/5 placeholder:text-red-400/40"
                  : "border-white/10"
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1">{errors.description}</p>
            )}
          </div>

          <div className="border-t border-white/5" />

          {/* Integration */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["url", "greenhouse", "lever"] as AtsType[]).map(type => (
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
              <Field label="External Application URL" required error={errors.ats_fallback_url}>
                <Input
                  value={formData.ats_fallback_url}
                  onChange={e => updateFormData("ats_fallback_url", e.target.value)}
                  placeholder="https://company.com/careers/jobs/123"
                  className={`bg-slate-950/50 focus:border-indigo-500/50 transition-colors ${
                    errors.ats_fallback_url
                      ? "border-red-500/60 bg-red-500/5 placeholder:text-red-400/40"
                      : "border-white/10"
                  }`}
                />
              </Field>
            ) : (
              <FieldRow>
                <Field label={formData.ats_type === "greenhouse" ? "Board Token" : "Account Name"}>
                  <Input
                    value={formData.ats_board_token}
                    onChange={e => updateFormData("ats_board_token", e.target.value)}
                    placeholder={formData.ats_type === "greenhouse" ? "e.g. stripe" : "e.g. lever-demo"}
                    className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                  />
                </Field>
                <Field label="Job ID">
                  <Input
                    value={formData.ats_job_id}
                    onChange={e => updateFormData("ats_job_id", e.target.value)}
                    placeholder="e.g. 4829392"
                    className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                  />
                </Field>
              </FieldRow>
            )}
          </div>
        </div>

        {/* ── Review Card ── */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Review</h2>
              <p className="text-slate-400 text-xs">How your listing will appear to candidates.</p>
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 flex items-start gap-4">
              <CompanyLogo
                company={formData.company || "Company"}
                logoUrl={formData.logo_url}
                className="h-16 w-16"
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold">{formData.role || "Job Title"}</h3>
                <p className="text-indigo-400 font-medium">{formData.company || "Company Name"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {formData.location}</span>
                  {formData.salary_range && (
                    <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> {formData.salary_range}</span>
                  )}
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {formData.division || "N/A"}</span>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tagsInput.split(",").map((tag, i) =>
                  tag.trim() && (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400">
                      {tag.trim()}
                    </span>
                  )
                )}
              </div>
              <div className="text-sm text-slate-400 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {formData.description || "No description provided."}
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-500">Ready to go live</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Integration: {formData.ats_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex justify-end pt-2 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-12 rounded-2xl"
          >
            {submitting ? "Publishing..." : "Publish Job Opening"}
          </Button>
        </div>
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2" data-error={!!error}>
      <Label className={error ? "text-red-400" : "text-slate-300"}>
        {label}
        {required && <span className={`ml-0.5 ${error ? "text-red-400" : "text-indigo-400"}`}>*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
  error,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 [&>svg]:h-4 [&>svg]:w-4 ${error ? "text-red-400/60" : "text-slate-500"}`}>
        {icon}
      </span>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-slate-950/50 pl-10 focus:border-indigo-500/50 transition-colors ${
          error
            ? "border-red-500/60 bg-red-500/5 placeholder:text-red-400/40"
            : "border-white/10"
        }`}
      />
    </div>
  );
}