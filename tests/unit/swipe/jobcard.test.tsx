// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

afterEach(cleanup);
import { JobCard } from "@/components/swipe/JobCard";
import type { Job } from "@/lib/types";

const baseJob: Job = {
  id: "00000000-0000-0000-0000-000000000001",
  company: "Goldman Sachs",
  role: "Software Engineer Intern",
  location: "Singapore",
  division: "Engineering",
  description: "Build great things.",
  visa_sponsorship: true,
  salary_range: "SGD 5,000/mo",
  ats_type: "greenhouse",
  ats_board_token: "goldmansachs",
  ats_job_id: "12345",
  ats_fallback_url: null,
  logo_url: null,
  tags: ["fintech", "intern"],
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("JobCard", () => {
  it("renders company name", () => {
    render(<JobCard job={baseJob} />);
    const el = screen.getByTestId("job-company");
    expect(el.textContent).toContain("Goldman Sachs");
  });

  it("renders role title", () => {
    render(<JobCard job={baseJob} />);
    const el = screen.getByTestId("job-role");
    expect(el.textContent).toContain("Software Engineer Intern");
  });

  it("renders location pill", () => {
    render(<JobCard job={baseJob} />);
    const el = screen.getByTestId("pill-location");
    expect(el.textContent).toContain("Singapore");
  });

  it("renders salary_range pill when salary_range is present", () => {
    render(<JobCard job={baseJob} />);
    const el = screen.getByTestId("pill-salary");
    expect(el.textContent).toContain("SGD 5,000/mo");
  });

  it("omits salary pill when salary_range is null", () => {
    render(<JobCard job={{ ...baseJob, salary_range: null }} />);
    // salary testid must not be present
    expect(screen.queryByTestId("pill-salary")).toBeNull();
  });

  it("renders visa sponsorship pill when visa_sponsorship is true", () => {
    render(<JobCard job={baseJob} />);
    const el = screen.getByTestId("pill-visa");
    expect(el).not.toBeNull();
  });

  it("logo fallback shows two-letter initials for a two-word company", () => {
    render(<JobCard job={{ ...baseJob, logo_url: null }} />);
    const el = screen.getByTestId("logo-initials");
    expect(el.textContent).toBe("GS");
  });

  it("does not render a match score", () => {
    render(<JobCard job={baseJob} />);
    // The fake matchScore badge rendered "XX% match" — it must be gone
    expect(screen.queryByText(/match/i)).toBeNull();
  });
});
