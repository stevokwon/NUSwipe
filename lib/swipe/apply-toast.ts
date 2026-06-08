// Pure helper — determines the correct sonner toast variant and message for
// a completed /api/apply response. Extracted from SwipeStack to stay testable
// in node env (no DOM, no React rendering required).

export type ApplyApiResult =
  | { redirect: string }
  | { success: true; submissionId: string };

export type ApplyOutcome = "direct" | "redirect";

export interface ApplyToastSpec {
  variant: "success" | "info";
  message: string;
  /** Used by SwipeStack to decide whether to show the match overlay. */
  outcome: ApplyOutcome;
}

export function resolveApplyToast(
  data: ApplyApiResult,
  company: string
): ApplyToastSpec {
  if ("redirect" in data && data.redirect) {
    return {
      variant: "info",
      message: `Opening ${company} in a new tab \u2014 saved to tracker!`,
      outcome: "redirect",
    };
  }
  return {
    variant: "success",
    message: `Applied to ${company} \u2713`,
    outcome: "direct",
  };
}
