// APAC field mapper — converts Profile APAC fields into ATS question/answer
// arrays that Greenhouse and Lever accept as custom question responses.
//
// PRIVACY (AGENTS.md §9): This module MAY include sensitive field values in
// its OUTPUT (that is its job — mapping them for submission).  It must NEVER
// include those values in logger calls.  Field name only, never the value.

import type { Profile } from "@/lib/types";
import { logger } from "@/lib/logger";

// ── Known enum values for validation ─────────────────────────────────────────

const KNOWN_SG_RESIDENCY = [
  "Citizen",
  "Permanent Resident",
  "Employment Pass Required",
  "Not Applicable",
] as const;

const KNOWN_NS_STATUS = [
  "Completed",
  "Exemption",
  "Not Applicable",
] as const;

const KNOWN_HK_RESIDENCY = [
  "Permanent Resident",
  "IANG Visa Holder",
  "Visa Required",
  "Not Applicable",
] as const;

// ── Output types ──────────────────────────────────────────────────────────────

export type QuestionAnswer = {
  question: string;
  answer: string;
};

export type ApacPayload = {
  /** Free-form Q&A pairs — map to ATS custom question fields. */
  questionAnswers: QuestionAnswer[];
  /** Structured education block — map to ATS education section. */
  educationAnswers: {
    major: string;
    gradDate: string;
    gpa: string | null;
  };
};

// ── Mapper ────────────────────────────────────────────────────────────────────

export function buildApacPayload(profile: Profile): ApacPayload {
  const questionAnswers: QuestionAnswer[] = [];

  // ── Singapore: residency status ─────────────────────────────────────────
  if (profile.sg_residency && profile.sg_residency !== "Not Applicable") {
    if (!(KNOWN_SG_RESIDENCY as readonly string[]).includes(profile.sg_residency)) {
      // Unknown value — log field name only, never the value (AGENTS.md §9)
      logger.warn(
        { field: "sg_residency" },
        "Unrecognised sg_residency value — included in payload as-is"
      );
    }
    questionAnswers.push({
      question: "Singapore Residency Status",
      answer: profile.sg_residency,
    });
  }

  // ── Singapore: national service ─────────────────────────────────────────
  if (profile.ns_status && profile.ns_status !== "Not Applicable") {
    if (!(KNOWN_NS_STATUS as readonly string[]).includes(profile.ns_status)) {
      logger.warn(
        { field: "ns_status" },
        "Unrecognised ns_status value — included in payload as-is"
      );
    }
    questionAnswers.push({
      question: "National Service Status",
      answer: profile.ns_status,
    });
  }

  // ── Hong Kong: residency status ─────────────────────────────────────────
  if (profile.hk_residency && profile.hk_residency !== "Not Applicable") {
    if (!(KNOWN_HK_RESIDENCY as readonly string[]).includes(profile.hk_residency)) {
      logger.warn(
        { field: "hk_residency" },
        "Unrecognised hk_residency value — included in payload as-is"
      );
    }
    questionAnswers.push({
      question: "Hong Kong Residency Status",
      answer: profile.hk_residency,
    });
  }

  // ── University ──────────────────────────────────────────────────────────
  // SG university takes precedence; HK university used as fallback.
  const university = profile.sg_university ?? profile.hk_university;
  if (university) {
    questionAnswers.push({ question: "University", answer: university });
  }

  // ── Minor / second major ────────────────────────────────────────────────
  if (profile.minor) {
    questionAnswers.push({
      question: "Minor / Second Major",
      answer: profile.minor,
    });
  }

  return {
    questionAnswers,
    educationAnswers: {
      major: profile.major ?? "",
      gradDate: profile.grad_month_year ?? "",
      gpa: profile.gpa ?? null,
    },
  };
}
