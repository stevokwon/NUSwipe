"use client";

import { useState, useRef, KeyboardEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Phone country codes (ISO 3166-1 + dial code) ─────────────────────────────
const PHONE_CODES = [
  { code: "+65", label: "+65 (Singapore)" },
  { code: "+852", label: "+852 (Hong Kong)" },
  { code: "+60", label: "+60 (Malaysia)" },
  { code: "+62", label: "+62 (Indonesia)" },
  { code: "+91", label: "+91 (India)" },
  { code: "+1", label: "+1 (US/Canada)" },
  { code: "+44", label: "+44 (UK)" },
  { code: "+81", label: "+81 (Japan)" },
  { code: "+86", label: "+86 (China)" },
  { code: "+82", label: "+82 (South Korea)" },
  { code: "+66", label: "+66 (Thailand)" },
  { code: "+63", label: "+63 (Philippines)" },
  { code: "+61", label: "+61 (Australia)" },
  { code: "+33", label: "+33 (France)" },
  { code: "+49", label: "+49 (Germany)" },
] as const;

// ── Complete country list (195 UN-recognized countries) ─────────────────────
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
  "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
  "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
  "Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini",
  "Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
  "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
  "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia",
  "Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe",
  "Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore",
  "Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
  "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
] as const;

// ── Step configuration ────────────────────────────────────────────────────────
const STEPS = [
  "Personal Info",
  "Location Context",
  "Academic",
  "Availability",
  "Compensation & Identity",
  "Resume",
] as const;
type Step = 0 | 1 | 2 | 3 | 4 | 5;

// ── Searchable Dropdown (better UX for long lists) ──────────────────────────
function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => 
    options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        value={isOpen ? search : value}
        onChange={(e) => {
          if (!isOpen) setIsOpen(true);
          setSearch(e.target.value);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch("");
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)} // Delay to allow click
        placeholder={placeholder}
        className={className}
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50">
          {filtered.length > 0 ? (
            filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onMouseDown={() => {
                  onValueChange(opt);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

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
    // Personal
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    preferred_name: profile.preferred_name ?? "",
    email: profile.email ?? "",
    phone_country_code: profile.phone_country_code ?? "+65",
    phone_number: profile.phone_number ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    website_url: profile.website_url ?? "",
    // Location
    sg_residency: profile.sg_residency ?? "",
    ns_status: profile.ns_status ?? "",
    sg_university: profile.sg_university ?? "",
    hk_residency: profile.hk_residency ?? "",
    hk_university: profile.hk_university ?? "",
    // Academic
    degree_type: profile.degree_type ?? "",
    major: profile.major ?? "",
    minor: profile.minor ?? "",
    gpa: profile.gpa ?? "",
    grad_month_year: profile.grad_month_year ?? "",
    target_role: profile.target_role ?? "",
    // Availability
    current_city: profile.current_city ?? "",
    availability_date: profile.availability_date ?? "",
    notice_period: profile.notice_period ?? "",
    years_experience: profile.years_experience ?? "",
    // Identity
    nationality: profile.nationality ?? "",
    // Compensation
    expected_salary_sgd: profile.expected_salary_sgd?.toString() ?? "",
    expected_salary_hkd: profile.expected_salary_hkd?.toString() ?? "",
    open_to_negotiation: profile.open_to_negotiation ?? true,
    // EEO
    gender: profile.gender ?? "",
    ethnicity: profile.ethnicity ?? "",
    disability_status: profile.disability_status ?? "",
    veteran_status: profile.veteran_status ?? "",
    // Screening
    referral_source: profile.referral_source ?? "",
    cover_letter_default: profile.cover_letter_default ?? "",
    // Resume
    resume_url: profile.resume_url ?? "",
  });

  // Array fields
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [preferredWorkType, setPreferredWorkType] = useState<string[]>(
    profile.preferred_work_type ?? []
  );
  const [preferredLocation, setPreferredLocation] = useState<string[]>(
    profile.preferred_location ?? []
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  // ── Skills input ───────────────────────────────────────────────────────────
  function addSkillsFromInput(raw: string) {
    const tokens = raw.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (tokens.length === 0) return;
    setSkills((prev) => {
      const next = [...prev];
      for (const t of tokens) if (!next.includes(t)) next.push(t);
      return next;
    });
    setSkillInput("");
  }

  function handleSkillKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addSkillsFromInput(skillInput);
    } else if (e.key === "Backspace" && skillInput.trim() === "" && skills.length > 0) {
      e.preventDefault();
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
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
        error.message.includes("Bucket not found") || error.message.includes("bucket")
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

    const payload = {
      ...form,
      skills,
      preferred_work_type: preferredWorkType,
      preferred_location: preferredLocation,
      expected_salary_sgd: form.expected_salary_sgd ? parseInt(form.expected_salary_sgd) : null,
      expected_salary_hkd: form.expected_salary_hkd ? parseInt(form.expected_salary_hkd) : null,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("candidates")
      .update(payload)
      .eq("id", userId);

    if (error) {
      toast.error("Save failed: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Profile saved!");
    setSaving(false);

    const updated: Profile = {
      ...profile,
      ...form,
      skills,
      preferred_work_type: preferredWorkType,
      preferred_location: preferredLocation,
      expected_salary_sgd: form.expected_salary_sgd ? parseInt(form.expected_salary_sgd) : null,
      expected_salary_hkd: form.expected_salary_hkd ? parseInt(form.expected_salary_hkd) : null,
    };
    if (isProfileComplete(updated)) {
      router.push("/swipe");
    }
  }

  function validateStep(step: Step): boolean {
    if (step === 0) {
      if (!form.first_name || !form.last_name || !form.phone_country_code || !form.phone_number) {
        toast.error("Please fill in all required fields (marked with *).");
        return false;
      }
    }
    if (step === 2) {
      if (!form.major || !form.grad_month_year) {
        toast.error("Please fill in all required fields (marked with *).");
        return false;
      }
    }
    return true;
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between w-full mb-8 relative">
        {/* Connector Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 -z-0" />
        
        {STEPS.map((s, i) => {
          const isCompleted = i < step;
          const isActive = i === step;
          return (
            <div key={s} className="flex flex-col items-center flex-1 relative z-10">
              <button
                onClick={() => {
                  if (i <= step || validateStep(step)) setStep(i as Step);
                }}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all font-semibold text-xs",
                  isCompleted 
                    ? "bg-purple-600 border-purple-600 text-white" 
                    : isActive 
                      ? "bg-slate-950 border-purple-500 text-purple-400" 
                      : "bg-slate-950 border-white/20 text-slate-500 hover:border-white/40"
                )}
              >
                {isCompleted ? "✓" : i + 1}
              </button>
              <span className={cn(
                "text-[10px] mt-2 font-medium whitespace-nowrap", 
                isActive ? "text-white" : "text-slate-500"
              )}>
                {s}
              </span>
            </div>
          );
        })}
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
          <Field label="Preferred Name (optional)">
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
                onValueChange={(v) => update("phone_country_code", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_CODES.map((pc) => (
                    <SelectItem key={pc.code} value={pc.code}>
                      {pc.label}
                    </SelectItem>
                  ))}
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
          <Field label="Portfolio / Website">
            <Input
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              placeholder="github.com/janedoe or janedoe.com"
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
                onValueChange={(v) => update("sg_residency", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Singapore Citizen</SelectItem>
                  <SelectItem value="pr">Permanent Resident</SelectItem>
                  <SelectItem value="ep">Employment Pass / S Pass</SelectItem>
                  <SelectItem value="student_pass">Student Pass</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="National Service Status">
              <Select
                value={form.ns_status}
                onValueChange={(v) => update("ns_status", v || "")}
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
                onValueChange={(v) => update("sg_university", v || "")}
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
                onValueChange={(v) => update("hk_residency", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pr">Permanent Resident</SelectItem>
                  <SelectItem value="iang">IANG Visa Holder</SelectItem>
                  <SelectItem value="Visa Required">Visa Required</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="University (HK)">
              <Select
                value={form.hk_university}
                onValueChange={(v) => update("hk_university", v || "")}
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
          <Row>
            <Field label="Degree Type">
              <Select
                value={form.degree_type}
                onValueChange={(v) => update("degree_type", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bachelor's">Bachelor&apos;s</SelectItem>
                  <SelectItem value="Master's">Master&apos;s</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Major" required>
              <Input
                value={form.major}
                onChange={(e) => update("major", e.target.value)}
                placeholder="e.g. Computer Science"
                className={inputCls}
              />
            </Field>
          </Row>
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
                placeholder="eg. 4.50 / 5.00"
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
          <Field label="Target Role">
            <Input
              value={form.target_role}
              onChange={(e) => update("target_role", e.target.value)}
              placeholder="e.g. Software Engineer"
              className={inputCls}
            />
          </Field>
          <Field label="Skills">
            <div
              className="flex flex-wrap gap-1.5 min-h-[42px] rounded-md border px-3 py-2 text-sm cursor-text bg-white/10 border-white/20 focus-within:border-purple-500"
              onClick={() => document.getElementById("skills-input")?.focus()}
            >
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-600/30 border border-purple-500/40 px-2 py-0.5 text-xs text-purple-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
                    className="text-purple-300 hover:text-white leading-none"
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <textarea
                id="skills-input"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => addSkillsFromInput(skillInput)}
                placeholder={skills.length === 0 ? "e.g. React, Python, SQL" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-white placeholder:text-slate-500 outline-none text-sm resize-none"
                rows={1}
                style={{ overflow: "hidden" }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Type skills separated by commas or newlines. Press Enter to add.</p>
          </Field>
        </fieldset>
      )}

      {/* ── Step 3: Availability ──────────────────────────────────────────── */}
      {step === 3 && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-white">Availability</legend>
          <p className="text-sm text-slate-400">
            Used to auto-answer screening questions like &ldquo;current city&rdquo;, &ldquo;start date&rdquo;, and &ldquo;notice period&rdquo;.
          </p>

          <Row>
            <Field label="Current City">
              <SearchableSelect
                value={form.current_city}
                onValueChange={(v) => update("current_city", v)}
                options={COUNTRIES.map(c => c)}
                placeholder="Search city/country..."
                className={inputCls}
              />
            </Field>
            <Field label="Notice Period">
              <Select
                value={form.notice_period}
                onValueChange={(v) => update("notice_period", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                  <SelectItem value="2 weeks">2 weeks</SelectItem>
                  <SelectItem value="1 month">1 month</SelectItem>
                  <SelectItem value="3 months">3 months</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Row>

          <Row>
            <Field label="Earliest Start Date">
              <Input
                type="date"
                value={form.availability_date}
                onChange={(e) => update("availability_date", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Years of Experience">
              <Select
                value={form.years_experience}
                onValueChange={(v) => update("years_experience", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (student / no experience)</SelectItem>
                  <SelectItem value="<1">Less than 1 year</SelectItem>
                  <SelectItem value="1-2">1–2 years</SelectItem>
                  <SelectItem value="3-5">3–5 years</SelectItem>
                  <SelectItem value="5+">5+ years</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Row>

          <Field label="Preferred Work Type">
            <ToggleChips
              options={["Full-time", "Internship", "Part-time", "Contract"]}
              selected={preferredWorkType}
              onToggle={(item) => toggleArrayItem(preferredWorkType, setPreferredWorkType, item)}
            />
          </Field>

          <Field label="Preferred Location">
            <ToggleChips
              options={["Singapore", "Hong Kong", "Remote", "Open to all"]}
              selected={preferredLocation}
              onToggle={(item) => toggleArrayItem(preferredLocation, setPreferredLocation, item)}
            />
          </Field>
        </fieldset>
      )}

      {/* ── Step 4: Compensation & Identity ──────────────────────────────── */}
      {step === 4 && (
        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold text-white">Compensation & Identity</legend>

          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <p className="text-sm font-medium text-slate-300">Compensation</p>
            <Row>
              <Field label="Expected Salary (SGD/mo)">
                <Input
                  type="number"
                  value={form.expected_salary_sgd}
                  onChange={(e) => update("expected_salary_sgd", e.target.value)}
                  placeholder="3500"
                  min="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Expected Salary (HKD/mo)">
                <Input
                  type="number"
                  value={form.expected_salary_hkd}
                  onChange={(e) => update("expected_salary_hkd", e.target.value)}
                  placeholder="12000"
                  min="0"
                  className={inputCls}
                />
              </Field>
            </Row>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.open_to_negotiation}
                onChange={(e) => update("open_to_negotiation", e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm text-slate-300">Open to negotiation</span>
            </label>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <p className="text-sm font-medium text-slate-300">
              Identity{" "}
              <span className="text-xs font-normal text-slate-500">
                (optional—for EEO autofill)
              </span>
            </p>
            <Field label="Nationality">
              <Select
                value={form.nationality}
                onValueChange={(v) => update("nationality", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select country…" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Row>
              <Field label="Gender">
                <Select
                  value={form.gender}
                  onValueChange={(v) => update("gender", v || "")}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ethnicity">
                <Select
                  value={form.ethnicity}
                  onValueChange={(v) => update("ethnicity", v || "")}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asian">Asian</SelectItem>
                    <SelectItem value="White / Caucasian">White / Caucasian</SelectItem>
                    <SelectItem value="Hispanic / Latino">Hispanic / Latino</SelectItem>
                    <SelectItem value="Black / African American">Black / African American</SelectItem>
                    <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </Row>
            <Row>
              <Field label="Disability Status">
                <Select
                  value={form.disability_status}
                  onValueChange={(v) => update("disability_status", v || "")}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No disability</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Veteran Status">
                <Select
                  value={form.veteran_status}
                  onValueChange={(v) => update("veteran_status", v || "")}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not a veteran">Not a veteran</SelectItem>
                    <SelectItem value="Veteran">Veteran</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </Row>
            <Field label="How did you hear about us?">
              <Select
                value={form.referral_source}
                onValueChange={(v) => update("referral_source", v || "")}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUSwipe">NUSwipe</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="University career fair">University career fair</SelectItem>
                  <SelectItem value="Company website">Company website</SelectItem>
                  <SelectItem value="Friend / referral">Friend / referral</SelectItem>
                  <SelectItem value="Job board">Job board (Indeed, Glassdoor, etc.)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </fieldset>
      )}

      {/* ── Step 5: Resume ────────────────────────────────────────────────── */}
      {step === 5 && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-white">Resume</legend>
          <p className="text-sm text-slate-400">
            Upload your resume — it will be attached to every application when you swipe right.{" "}
            <span className="text-slate-500">
              (Optional to access Swipe, required for Greenhouse/Lever submissions.)
            </span>
          </p>

          <div
            className="w-full max-w-md mx-auto border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
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
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
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

          <Field label="Default Cover Letter Paragraph">
            <Textarea
              value={form.cover_letter_default}
              onChange={(e) => update("cover_letter_default", e.target.value)}
              placeholder="I am a Computer Science student at NUS passionate about building products that solve real problems. I'm excited to bring my skills in React and Python to…"
              rows={4}
              maxLength={600}
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-slate-500 mt-1">
              Used as a fallback when applications ask for a cover letter. Keep it to ~2–3 sentences.{" "}
              {form.cover_letter_default.length}/600
            </p>
          </Field>
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
            onClick={() => {
              if (validateStep(step)) setStep((s) => (s + 1) as Step);
            }}
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

function ToggleChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            selected.includes(opt)
              ? "bg-purple-600/40 border-purple-500 text-purple-200"
              : "bg-white/5 border-white/20 text-slate-400 hover:border-white/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}