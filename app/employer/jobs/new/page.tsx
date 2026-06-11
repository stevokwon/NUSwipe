"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  JobPostingForm,
  emptyJobPostingFormData,
  parseJobTags,
  validateJobPostingForm,
  type JobPostingFormData,
  type JobPostingFormErrors,
} from "@/components/employer/JobPostingForm";

export default function NewJobPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<JobPostingFormErrors>({});
  const [formData, setFormData] = useState<JobPostingFormData>(
    emptyJobPostingFormData
  );

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/employer/login");
        return;
      }

      setUserId(user.id);

      const { data: employer, error: employerError } = await supabase
        .from("employers")
        .select("company_name")
        .eq("id", user.id)
        .single();

      if (employerError) {
        console.error("Error fetching employer:", employerError);
      } else if (employer) {
        const typedEmployer = employer as { company_name: string };
        setFormData((prev) => ({
          ...prev,
          company: typedEmployer.company_name || "",
        }));
      }

      setLoading(false);
    }

    checkAuth();
  }, [router, supabase]);

  function updateFormData<K extends keyof JobPostingFormData>(
    field: K,
    value: JobPostingFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof JobPostingFormErrors];
        return next;
      });
    }
  }

  async function handleSubmit() {
    const validationErrors = validateJobPostingForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields.");
      setTimeout(() => {
        document
          .querySelector("[data-error='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        company: formData.company,
        role: formData.role,
        location: formData.location,
        division: formData.division || null,
        salary_range: formData.salary_range || null,
        description: formData.description || null,
        visa_sponsorship: formData.visa_sponsorship,
        ats_type: formData.ats_type,
        ats_board_token:
          formData.ats_type !== "url" ? formData.ats_board_token : null,
        ats_job_id: formData.ats_type !== "url" ? formData.ats_job_id : null,
        ats_fallback_url: formData.ats_fallback_url || null,
        logo_url: formData.logo_url || null,
        tags: parseJobTags(formData.tagsInput),
        posted_by: userId,
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <JobPostingForm
      title="Post New Job"
      submitLabel="Publish Job Opening"
      submittingLabel="Publishing..."
      submitting={submitting}
      formData={formData}
      errors={errors}
      onBack={() => router.push("/employer/dashboard")}
      onChange={updateFormData}
      onSubmit={handleSubmit}
    />
  );
}
