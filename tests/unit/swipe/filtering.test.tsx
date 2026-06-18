// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Job } from "@/lib/types";

afterEach(cleanup);

const internshipJob: Job = {
  id: "intern-1",
  company: "Test Co",
  role: "Intern",
  location: "Singapore",
  division: null,
  description: null,
  visa_sponsorship: false,
  salary_range: null,
  ats_type: "url",
  ats_board_token: null,
  ats_job_id: null,
  ats_fallback_url: "https://test.com",
  logo_url: null,
  tags: ["Internship"],
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const fulltimeJob: Job = {
  id: "ft-1",
  company: "Test Co",
  role: "Engineer",
  location: "Singapore",
  division: null,
  description: null,
  visa_sponsorship: false,
  salary_range: null,
  ats_type: "url",
  ats_board_token: null,
  ats_job_id: null,
  ats_fallback_url: "https://test.com",
  logo_url: null,
  tags: ["Full-time"],
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("SwipeStack Filtering", () => {
  it("keeps filter pills visible when no jobs match", () => {
    // Start with only full-time jobs
    render(<SwipeStack initialJobs={[fulltimeJob]} />);
    
    // Select "Internships" filter (index 1)
    const internFilter = screen.getByText("Internships");
    fireEvent.click(internFilter);
    
    // Should show "No matches" message
    expect(screen.getByText("No matches for these filters")).not.toBeNull();
    
    // Filter pills should still be visible
    expect(screen.getByText("All Roles")).not.toBeNull();
    expect(screen.getByText("Full-time")).not.toBeNull();
    expect(screen.getByText("SG Only")).not.toBeNull();
  });

  it("allows clearing filters by clicking 'All Roles'", () => {
    render(<SwipeStack initialJobs={[fulltimeJob]} />);
    
    // Click "Internships" to get empty state
    fireEvent.click(screen.getByText("Internships"));
    expect(screen.queryByText("Engineer")).toBeNull();
    
    // Click "All Roles" (index 0) to clear
    fireEvent.click(screen.getByText("All Roles"));
    
    // Should show the full-time job again
    expect(screen.getByText("Engineer")).not.toBeNull();
  });
});
