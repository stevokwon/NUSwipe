// ============================================================
// Database types (mirrors the Supabase schema)
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: Candidate;
        Insert: Partial<Omit<Candidate, "id" | "created_at">> & { id: string; email: string };
        Update: Partial<Candidate>;
        Relationships: [];
      };
      employers: {
        Row: Employer;
        Insert: Omit<Employer, "created_at" | "updated_at">;
        Update: Partial<Employer>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Job, "id" | "created_at">>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id" | "applied_at" | "updated_at"> & { id?: string; extension_token?: string | null };
        Update: Partial<Pick<Application, "status" | "notes" | "ats_submission_id" | "extension_token">> & { updated_at?: string };
        Relationships: [];
      };
      skipped_jobs: {
        Row: { user_id: string; job_id: string; skipped_at: string };
        Insert: { user_id: string; job_id: string; skipped_at?: string };
        Update: { user_id?: string; job_id?: string; skipped_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ============================================================
// Application-layer types
// ============================================================

export interface Candidate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  // Singapore
  sg_residency: string | null;
  ns_status: string | null;
  sg_university: string | null;
  // Hong Kong
  hk_residency: string | null;
  hk_university: string | null;
  // Academic
  major: string | null;
  minor: string | null;
  gpa: string | null;
  grad_month_year: string | null;
  // Documents
  resume_url: string | null;
  linkedin_url: string | null;
  // Sprint 3
  skills: string[];
  target_role: string | null;
  created_at: string;
  updated_at: string;
}

export type Profile = Candidate; // Alias for backward compatibility while refactoring

export interface Employer {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type AtsType = "greenhouse" | "lever" | "url";

export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  division: string | null;
  description: string | null;
  visa_sponsorship: boolean;
  salary_range: string | null;
  ats_type: AtsType;
  ats_board_token: string | null;
  ats_job_id: string | null;
  ats_fallback_url: string | null;
  logo_url: string | null;
  tags: string[];
  active: boolean;
  total_spots: number;
  filled_spots: number;
  posted_by: string | null;
  created_at: string;
}

// APPLICATION_STATUS_VALUES is the runtime source of truth — the type is
// derived from it so the two can never diverge.
export const APPLICATION_STATUS_VALUES = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
  // 'pending' = URL-fallback job opened in new tab; user has not yet confirmed
  // submission.  Stays 'pending' until the user manually moves it to 'applied'.
  "pending",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number];

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  ats_submission_id: string | null;
  extension_token: string | null;
  notes: string | null;
  applied_at: string;
  updated_at: string;
}

// Application joined with job details (used in tracker)
export interface ApplicationWithJob extends Application {
  jobs: Job;
}

// Profile completeness check (used to gate the swipe page)
export function isProfileComplete(profile: Profile): boolean {
  // resume_url is strongly encouraged but not required to access swipe —
  // the apply API will reject Greenhouse/Lever submissions without it.
  return !!(
    profile.first_name &&
    profile.last_name &&
    profile.email &&
    profile.major &&
    profile.grad_month_year
  );
}
