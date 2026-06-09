// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Job } from "@/lib/types";

afterEach(cleanup);

const stubJob: Job = {
  id: "00000000-0000-0000-0000-000000000001",
  company: "Google",
  role: "SWE Intern",
  location: "Singapore",
  division: null,
  description: null,
  visa_sponsorship: false,
  salary_range: null,
  ats_type: "url",
  ats_board_token: null,
  ats_job_id: null,
  ats_fallback_url: "https://careers.google.com",
  logo_url: null,
  tags: [],
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("SwipeStack states", () => {
  it("shows loading skeleton when isLoading is true", () => {
    render(<SwipeStack initialJobs={[]} isLoading />);
    expect(screen.getByTestId("swipe-loading")).not.toBeNull();
  });

  it("shows empty state when not loading and jobs list is empty", () => {
    render(<SwipeStack initialJobs={[]} />);
    expect(screen.getByTestId("swipe-empty")).not.toBeNull();
  });

  it("shows card stack when jobs are present", () => {
    render(<SwipeStack initialJobs={[stubJob]} />);
    expect(screen.getByTestId("swipe-stack")).not.toBeNull();
  });
});
