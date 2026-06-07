import type { Profile, Job } from "@/lib/types";

// Submits an application to a Lever job posting via their public apply endpoint.
// Lever's apply endpoint: POST https://jobs.lever.co/{company}/apply/{postingId}
// It accepts multipart/form-data.
//
// Returns a submission confirmation string on success, or throws on failure.
export async function submitToLever(
  profile: Profile,
  job: Job
): Promise<string> {
  if (!job.ats_board_token || !job.ats_job_id) {
    throw new Error("Missing Lever company slug or posting ID");
  }

  if (!profile.resume_url) {
    throw new Error("No resume on file — please upload one in your profile.");
  }

  // Fetch the resume PDF from Supabase Storage to include as a file
  const resumeRes = await fetch(profile.resume_url);
  if (!resumeRes.ok) {
    throw new Error("Failed to fetch resume for submission");
  }
  const resumeBlob = await resumeRes.blob();

  const form = new FormData();
  form.append("name", `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim());
  form.append("email", profile.email ?? "");
  form.append("phone", formatPhone(profile.phone_country_code, profile.phone_number));

  if (profile.linkedin_url) {
    form.append("urls[LinkedIn]", profile.linkedin_url);
  }

  form.append("resume", resumeBlob, "resume.pdf");

  // ats_board_token = company slug (e.g. "grab"), ats_job_id = posting UUID
  const url = `https://jobs.lever.co/${job.ats_board_token}/apply/${job.ats_job_id}`;

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Lever submission failed (${res.status}): ${body}`);
  }

  return "lever-submitted";
}

function formatPhone(
  countryCode: string | null,
  number: string | null
): string {
  return `${countryCode ?? "+65"}${(number ?? "").replace(/\s/g, "")}`;
}
