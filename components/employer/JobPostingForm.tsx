"use client";

import type { ReactNode } from "react";
import type { AtsType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export type JobPostingFormData = {
  company: string;
  role: string;
  location: string;
  division: string;
  salary_range: string;
  description: string;
  visa_sponsorship: boolean;
  ats_type: AtsType;
  ats_board_token: string;
  ats_job_id: string;
  ats_fallback_url: string;
  logo_url: string;
  tagsInput: string;
};

export type JobPostingFormErrors = Partial<
  Record<"company" | "role" | "description" | "ats_fallback_url", string>
>;

type JobPostingFormProps = {
  title: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  formData: JobPostingFormData;
  errors: JobPostingFormErrors;
  onBack: () => void;
  onChange: <K extends keyof JobPostingFormData>(
    field: K,
    value: JobPostingFormData[K]
  ) => void;
  onSubmit: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  isActive?: boolean;
};

export const emptyJobPostingFormData: JobPostingFormData = {
  company: "",
  role: "",
  location: "SG",
  division: "",
  salary_range: "",
  description: "",
  visa_sponsorship: false,
  ats_type: "url",
  ats_board_token: "",
  ats_job_id: "",
  ats_fallback_url: "",
  logo_url: "",
  tagsInput: "",
};

export function validateJobPostingForm(
  formData: JobPostingFormData
): JobPostingFormErrors {
  const errors: JobPostingFormErrors = {};

  if (!formData.company.trim()) errors.company = "Company name is required.";
  if (!formData.role.trim()) errors.role = "Job title is required.";
  if (!formData.description.trim()) errors.description = "Description is required.";
  if (formData.ats_type === "url" && !formData.ats_fallback_url.trim()) {
    errors.ats_fallback_url = "Application URL is required.";
  }

  return errors;
}

export function parseJobTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function JobPostingForm({
  title,
  submitLabel,
  submittingLabel,
  submitting,
  formData,
  errors,
  onBack,
  onChange,
  onSubmit,
  onPause,
  onDelete,
  isActive = true,
}: JobPostingFormProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-6">
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm space-y-8">
          <div className="grid gap-5">
            <FieldRow>
              <Field label="Company Name" required error={errors.company}>
                <IconInput
                  icon={<Building2 />}
                  value={formData.company}
                  onChange={(value) => onChange("company", value)}
                  placeholder="e.g. Stripe"
                  error={!!errors.company}
                />
              </Field>
              <Field label="Job Title / Role" required error={errors.role}>
                <IconInput
                  icon={<Briefcase />}
                  value={formData.role}
                  onChange={(value) => onChange("role", value)}
                  placeholder="e.g. Software Engineer (Full-Stack)"
                  error={!!errors.role}
                />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Division / Department">
                <Input
                  value={formData.division}
                  onChange={(event) => onChange("division", event.target.value)}
                  placeholder="e.g. Engineering"
                  className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                />
              </Field>
              <Field label="Company Logo URL">
                <IconInput
                  icon={<ImageIcon />}
                  value={formData.logo_url}
                  onChange={(value) => onChange("logo_url", value)}
                  placeholder="https://..."
                />
              </Field>
            </FieldRow>
          </div>

          <div className="border-t border-white/5" />

          <div className="grid gap-5">
            <FieldRow>
              <Field label="Primary Location">
                <Select
                  value={formData.location}
                  onValueChange={(value) => onChange("location", value)}
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
              </Field>
              <Field label="Salary Range (Optional)">
                <IconInput
                  icon={<DollarSign />}
                  value={formData.salary_range}
                  onChange={(value) => onChange("salary_range", value)}
                  placeholder="e.g. $5k - $8k / month"
                />
              </Field>
            </FieldRow>

            <Field label="Skills & Tags">
              <IconInput
                icon={<Tag />}
                value={formData.tagsInput}
                onChange={(value) => onChange("tagsInput", value)}
                placeholder="React, TypeScript, Fintech, Remote... (comma separated)"
              />
            </Field>

            <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="visa-toggle" className="text-sm font-bold cursor-pointer">
                  Visa Sponsorship
                </Label>
                <p className="text-xs text-slate-400">
                  Can you sponsor visas for international graduates?
                </p>
              </div>
              <button
                id="visa-toggle"
                type="button"
                onClick={() => onChange("visa_sponsorship", !formData.visa_sponsorship)}
                className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${
                  formData.visa_sponsorship ? "bg-indigo-500" : "bg-slate-700"
                }`}
              >
                <span
                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{
                    transform: formData.visa_sponsorship
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-white/5" />

          <div className="space-y-2" data-error={!!errors.description}>
            <Label className={errors.description ? "text-red-400" : "text-slate-300"}>
              Description
              <span className={errors.description ? "text-red-400" : "text-indigo-400"}>
                *
              </span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={(event) => onChange("description", event.target.value)}
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

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["url", "greenhouse", "lever"] as AtsType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange("ats_type", type)}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                    formData.ats_type === type
                      ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                      : "bg-slate-950/50 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      formData.ats_type === type
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {type === "url" ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
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
                  onChange={(event) => onChange("ats_fallback_url", event.target.value)}
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
                <Field
                  label={
                    formData.ats_type === "greenhouse" ? "Board Token" : "Account Name"
                  }
                >
                  <Input
                    value={formData.ats_board_token}
                    onChange={(event) => onChange("ats_board_token", event.target.value)}
                    placeholder={
                      formData.ats_type === "greenhouse"
                        ? "e.g. stripe"
                        : "e.g. lever-demo"
                    }
                    className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                  />
                </Field>
                <Field label="Job ID">
                  <Input
                    value={formData.ats_job_id}
                    onChange={(event) => onChange("ats_job_id", event.target.value)}
                    placeholder="e.g. 4829392"
                    className="bg-slate-950/50 border-white/10 focus:border-indigo-500/50"
                  />
                </Field>
              </FieldRow>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Review</h2>
              <p className="text-slate-400 text-xs">
                How your listing will appear to candidates.
              </p>
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
                <p className="text-indigo-400 font-medium">
                  {formData.company || "Company Name"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {formData.location}
                  </span>
                  {formData.salary_range && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> {formData.salary_range}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />{" "}
                    {formData.division || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {parseJobTags(formData.tagsInput).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-sm text-slate-400 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {formData.description || "No description provided."}
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full animate-pulse ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-xs text-slate-500">
                    {isActive ? 'Ready to go live' : 'Listing is currently paused'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Integration: {formData.ats_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onDelete && (
              <Button
                variant="ghost"
                onClick={onDelete}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex-1 sm:flex-initial"
              >
                Delete Listing
              </Button>
            )}
            {onPause && (
              <Button
                variant="outline"
                onClick={onPause}
                className="border-white/10 text-white hover:bg-white/5 flex-1 sm:flex-initial"
              >
                {isActive ? "Pause Listing" : "Activate Listing"}
              </Button>
            )}
          </div>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-12 rounded-2xl w-full sm:w-auto shadow-lg shadow-indigo-500/20"
          >
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </main>
    </div>
  );
}

function FieldRow({ children }: { children: ReactNode }) {
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
  children: ReactNode;
}) {
  return (
    <div className="space-y-2" data-error={!!error}>
      <Label className={error ? "text-red-400" : "text-slate-300"}>
        {label}
        {required && (
          <span className={`ml-0.5 ${error ? "text-red-400" : "text-indigo-400"}`}>
            *
          </span>
        )}
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
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <span
        className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 [&>svg]:h-4 [&>svg]:w-4 ${
          error ? "text-red-400/60" : "text-slate-500"
        }`}
      >
        {icon}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
