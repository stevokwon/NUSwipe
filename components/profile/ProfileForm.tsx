"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// ── Step configuration ────────────────────────────────────────────────────────
const STEPS = ["Personal Info", "Location Context", "Academic", "Resume"] as const;
type Step = 0 | 1 | 2 | 3;

interface Props {
  profile: Profile;
  userId: string;
}

export function ProfileForm({ profile, userId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state — pre-fill with existing profile data
  const [form, setForm] = useState({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    preferred_name: profile.preferred_name ?? "",
    phone_country_code: profile.phone_country_code ?? "+65",
    phone_number: profile.phone_number ?? "",
    sg_residency: profile.sg_residency ?? "",
    ns_status: profile.ns_status ?? "",
    sg_university: profile.sg_university ?? "",
    hk_residency: profile.hk_residency ?? "",
    hk_university: profile.hk_university ?? "",
    major: profile.major ?? "",
    minor: profile.minor ?? "",
    gpa: profile.gpa ?? "",
    grad_month_year: profile.grad_month_year ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    resume_url: profile.resume_url ?? "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Resume upload ──────────────────────────────────────────────────────────
  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5MB");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/resume-${Date.now()}.pdf`;

    const { error } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true });

    if (error) {
      const hint =
        error.message.includes("Bucket not found") ||
        error.message.includes("bucket")
          ? ' — create a public bucket named "resumes" in Supabase Storage first'
          : "";
      toast.error("Upload failed: " + error.message + hint);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
    update("resume_url", urlData.publicUrl);
    toast.success("Resume uploaded!");
    setUploading(false);
  }

  // ── Save profile ───────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("candidates")
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      toast.error("Save failed: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Profile saved!");
    setSaving(false);

    // If profile is now complete, navigate to swipe
    const updated = { ...profile, ...form };
    if (isProfileComplete(updated as Profile)) {
      router.push("/swipe");
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i as Step)}
              className={`transition-colors ${
                i === step ? "text-purple-400 font-medium" : "hover:text-slate-200"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-1.5 bg-white/10" />
      </div>

      {/* ── Step 0: Personal Info ─────────────────────────────────────────── */}
      {step === 0 && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-white">Personal Info</legend>
          <Row>
            <Field label="First Name" required>
              <Input
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="Jane"
                className={inputCls}
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Doe"
                className={inputCls}
              />
            </Field>
          </Row>
          <Field label="Preferred Name">
            <Input
              value={form.preferred_name}
              onChange={(e) => update("preferred_name", e.target.value)}
              placeholder="Jane (if different)"
              className={inputCls}
            />
          </Field>
          <Row>
            <Field label="Country Code" required>
              <Select
                value={form.phone_country_code}
                onValueChange={(v: string | null) => update("phone_country_code", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+65">+65 (SG)</SelectItem>
                  <SelectItem value="+852">+852 (HK)</SelectItem>
                  <SelectItem value="+60">+60 (MY)</SelectItem>
                  <SelectItem value="+62">+62 (ID)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone Number" required>
              <Input
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value)}
                placeholder="9123 4567"
                className={inputCls}
              />
            </Field>
          </Row>
          <Field label="LinkedIn URL">
            <Input
              value={form.linkedin_url}
              onChange={(e) => update("linkedin_url", e.target.value)}
              placeholder="linkedin.com/in/janedoe"
              className={inputCls}
            />
          </Field>
        </fieldset>
      )}

      {/* ── Step 1: Location Context ──────────────────────────────────────── */}
      {step === 1 && (
        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold text-white">Location Context</legend>

          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <p className="text-sm font-medium text-slate-300">🇸🇬 Singapore</p>
            <Field label="Residency Status">
              <Select
                value={form.sg_residency}
                onValueChange={(v: string | null) => update("sg_residency", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Citizen">Singapore Citizen</SelectItem>
                  <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                  <SelectItem value="Employment Pass Required">Employment Pass Required</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="National Service Status">
              <Select
                value={form.ns_status}
                onValueChange={(v: string | null) => update("ns_status", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Exemption">Exemption</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="University (SG)">
              <Select
                value={form.sg_university}
                onValueChange={(v: string | null) => update("sg_university", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUS">National University of Singapore (NUS)</SelectItem>
                  <SelectItem value="NTU">Nanyang Technological University (NTU)</SelectItem>
                  <SelectItem value="SMU">Singapore Management University (SMU)</SelectItem>
                  <SelectItem value="SUTD">Singapore University of Technology and Design (SUTD)</SelectItem>
                  <SelectItem value="SIT">Singapore Institute of Technology (SIT)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <p className="text-sm font-medium text-slate-300">🇭🇰 Hong Kong</p>
            <Field label="Residency Status">
              <Select
                value={form.hk_residency}
                onValueChange={(v: string | null) => update("hk_residency", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                  <SelectItem value="IANG Visa Holder">IANG Visa Holder</SelectItem>
                  <SelectItem value="Visa Required">Visa Required</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="University (HK)">
              <Select
                value={form.hk_university}
                onValueChange={(v: string | null) => update("hk_university", v ?? "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HKU">University of Hong Kong (HKU)</SelectItem>
                  <SelectItem value="HKUST">HKUST</SelectItem>
                  <SelectItem value="CUHK">Chinese University of Hong Kong (CUHK)</SelectItem>
                  <SelectItem value="PolyU">Hong Kong Polytechnic University (PolyU)</SelectItem>
                  <SelectItem value="CityU">City University of Hong Kong (CityU)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </fieldset>
      )}

      {/* ── Step 2: Academic ──────────────────────────────────────────────── */}
      {step === 2 && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-white">Academic Details</legend>
          <Field label="Major" required>
            <Input
              value={form.major}
              onChange={(e) => update("major", e.target.value)}
              placeholder="Computer Science"
              className={inputCls}
            />
          </Field>
          <Field label="Minor / Second Major">
            <Input
              value={form.minor}
              onChange={(e) => update("minor", e.target.value)}
              placeholder="Finance (optional)"
              className={inputCls}
            />
          </Field>
          <Row>
            <Field label="GPA / CAP">
              <Input
                value={form.gpa}
                onChange={(e) => update("gpa", e.target.value)}
                placeholder="4.50 / 5.00"
                className={inputCls}
              />
            </Field>
            <Field label="Graduation (Month Year)" required>
              <Input
                value={form.grad_month_year}
                onChange={(e) => update("grad_month_year", e.target.value)}
                placeholder="May 2026"
                className={inputCls}
              />
            </Field>
          </Row>
        </fieldset>
      )}

      {/* ── Step 3: Resume ────────────────────────────────────────────────── */}
      {step === 3 && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-white">Resume</legend>
          <p className="text-sm text-slate-400">
            Upload your resume — it will be attached to every application when you swipe right.{" "}
            <span className="text-slate-500">
              (Optional to access Swipe, required for Greenhouse/Lever submissions.)
            </span>
          </p>

          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {form.resume_url ? (
              <div className="space-y-2">
                <div className="text-4xl">✅</div>
                <p className="text-sm text-slate-300">Resume uploaded</p>
                <p className="text-xs text-slate-500 truncate">{form.resume_url}</p>
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">{uploading ? "⏳" : "📄"}</div>
                <p className="text-sm text-slate-300">
                  {uploading ? "Uploading…" : "Click to upload PDF"}
                </p>
                <p className="text-xs text-slate-500">Max 5MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleResumeUpload}
              disabled={uploading}
            />
          </div>
        </fieldset>
      )}

      {/* ── Navigation buttons ────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
          >
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {saving ? "Saving…" : "Save & Start Swiping"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const inputCls =
  "bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-purple-500";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-200 text-sm">
        {label}
        {required && <span className="text-purple-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
