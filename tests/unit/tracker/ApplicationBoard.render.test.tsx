// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { ApplicationWithJob } from "../../../lib/types";
import { ApplicationBoard } from "../../../components/tracker/ApplicationBoard";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeApp(
  status: ApplicationWithJob["status"],
  ats_fallback_url: string | null = "https://careers.example.com/job/1"
): ApplicationWithJob {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    job_id: "job-1",
    status,
    ats_submission_id: null,
    notes: null,
    applied_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    jobs: {
      id: "job-1",
      company: "Grab",
      role: "Software Engineer",
      location: "Singapore",
      division: null,
      description: null,
      visa_sponsorship: false,
      salary_range: null,
      ats_type: "url",
      ats_board_token: null,
      ats_job_id: null,
      ats_fallback_url,
      logo_url: null,
      tags: [],
      active: true,
      created_at: "2025-01-01T00:00:00Z",
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ApplicationBoard — pending column", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Test 1: pending section renders when pending rows exist
  it("renders the pending section when at least one application is pending", () => {
    render(<ApplicationBoard initialApplications={[makeApp("pending")]} />);
    expect(
      screen.queryByRole("region", { name: /pending applications/i })
    ).not.toBeNull();
  });

  // Test 2: pending section NOT rendered when no pending rows
  it("does not render the pending section when no applications are pending", () => {
    render(<ApplicationBoard initialApplications={[makeApp("applied")]} />);
    expect(
      screen.queryByRole("region", { name: /pending applications/i })
    ).toBeNull();
  });

  // Test 3: "Finish applying" link points to ats_fallback_url
  it('renders a "Finish applying" link that points to the job ats_fallback_url', () => {
    const url = "https://careers.grab.com/apply/swe-123";
    render(<ApplicationBoard initialApplications={[makeApp("pending", url)]} />);
    const link = screen.queryByRole("link", { name: /finish applying/i });
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(url);
  });

  // Test 4: "Mark as Applied" sends PATCH with status applied
  it('clicking "Mark as Applied" sends PATCH /api/applications with status applied', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<ApplicationBoard initialApplications={[makeApp("pending")]} />);

    const btn = screen.queryByRole("button", { name: /mark as applied/i });
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/applications",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"status":"applied"'),
        })
      );
    });
  });
});
