"use client";

import { use, useEffect, useState } from "react";
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
import type { Job } from "@/lib/types";

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [errors, setErrors] = useState<JobPostingFormErrors>({});
  const [formData, setFormData] = useState<JobPostingFormData>(
    emptyJobPostingFormData
  );

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/employer/login");
        return;
      }

      setUserId(user.id);

      const { data: jobData, error } = await supabase
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

      const currentJob = jobData as Job;
      setJob(currentJob);
      setFormData({
        company: currentJob.company,
        role: currentJob.role,
        location: currentJob.location,
        division: currentJob.division || "",
        salary_range: currentJob.salary_range || "",
        description: currentJob.description || "",
        visa_sponsorship: currentJob.visa_sponsorship,
        ats_type: currentJob.ats_type,
        ats_board_token: currentJob.ats_board_token || "",
        ats_job_id: currentJob.ats_job_id || "",
        ats_fallback_url: currentJob.ats_fallback_url || "",
        logo_url:
          currentJob.logo_url && currentJob.logo_url.startsWith("https://img.logokit.com/")
            ? ""
            : currentJob.logo_url || "",
        tagsInput: currentJob.tags.join(", "),
      });
      setLoading(false);
    }

    fetchData();
  }, [id, router, supabase]);

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

    if (!userId) {
      toast.error("You must be logged in to edit a job posting.");
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
      };

      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update job posting");
      }

      toast.success("Job updated successfully!");
      router.push("/employer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePause() {
    if (!job) return;
    const nextActive = !job.active;
    
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update job status");
      }

      toast.success(`Job ${nextActive ? "activated" : "paused"} successfully`);
      router.push("/employer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update job status");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this job posting? This will also delete all candidate applications associated with it.")) return;

    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete job posting");
      }

      toast.success("Job posting deleted");
      router.push("/employer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job posting");
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
      title="Edit Job Posting"
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      submitting={submitting}
      formData={formData}
      errors={errors}
      isActive={job?.active}
      onBack={() => router.push("/employer/dashboard")}
      onChange={updateFormData}
      onSubmit={handleSubmit}
      onPause={handleTogglePause}
      onDelete={handleDelete}
    />
  );
}
