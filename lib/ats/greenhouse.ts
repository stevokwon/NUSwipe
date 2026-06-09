import type { Profile, Job } from "@/lib/types";
import { buildApacPayload } from "@/lib/profile";
import { formatPhone } from "./format-phone";

// Submits an application to a Greenhouse-hosted job board via their public Job Board API.
// Docs: https://developers.greenhouse.io/job-board.html#apply-for-a-job
//
// Returns the Greenhouse application ID on success, or throws on failure.
export async function submitToGreenhouse(
  profile: Profile,
  job: Job
): Promise<string> {
  if (!job.ats_board_token || !job.ats_job_id) {
    throw new Error("Missing Greenhouse board token or job ID");
  }

  if (!profile.resume_url) {
    throw new Error("No resume on file — please upload one in your profile.");
  }

  const apac = buildApacPayload(profile);

  // Greenhouse expects resume as a URL (public link) or base64 content.
  // We use the Supabase public URL directly.
  const payload = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    email: profile.email ?? "",
    phone: formatPhone(profile.phone_country_code, profile.phone_number),
    resume: {
      filename: "resume.pdf",
      url: profile.resume_url,
      content_type: "application/pdf",
    },
    // LinkedIn URL mapped to Greenhouse's social media field
    ...(profile.linkedin_url && {
      social_media_urls: [{ type: "linkedin", value: profile.linkedin_url }],
    }),
    // APAC custom question answers (residency, NS status, university, etc.)
    ...(apac.questionAnswers.length > 0 && { answers: apac.questionAnswers }),
    // Education block — included when at minimum a major is present
    ...(apac.educationAnswers.major && {
      education: [
        {
          school_name: profile.sg_university ?? profile.hk_university ?? "",
          major: apac.educationAnswers.major,
          end_date: apac.educationAnswers.gradDate || null,
          gpa: apac.educationAnswers.gpa,
        },
      ],
    }),
    // Token needed for some boards
    mapped_url_token: job.ats_board_token,
  };

  const url = `https://boards-api.greenhouse.io/v1/boards/${job.ats_board_token}/jobs/${job.ats_job_id}/applications`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Greenhouse submission failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  // Greenhouse returns { id: number, ... }
  return String(data.id ?? "submitted");
}
