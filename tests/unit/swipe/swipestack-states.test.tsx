// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Job } from "@/lib/types";

afterEach(cleanup);
afterEach(() => {
  vi.restoreAllMocks();
});

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
  total_spots: 1,
  filled_spots: 0,
  posted_by: null,
  created_at: "2026-01-01T00:00:00Z",
};

const secondJob: Job = {
  ...stubJob,
  id: "00000000-0000-0000-0000-000000000002",
  company: "Meta",
  role: "Frontend Engineer",
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

  it("saves a job on double tap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) }));

    render(<SwipeStack initialJobs={[stubJob]} />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card as Element, { clientX: 10, clientY: 10 });
    fireEvent.pointerDown(card as Element, { clientX: 12, clientY: 12 });
    fireEvent.pointerUp(card as Element, { clientX: 12, clientY: 12 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/saved-jobs", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("saves a job from the Jobs tab with the star button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) }));

    render(<SwipeStack initialJobs={[stubJob]} />);

    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/saved-jobs", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("skips a job on left swipe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) }));

    render(<SwipeStack initialJobs={[stubJob]} />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(card as Element, { clientX: 40, clientY: 102 });
    fireEvent.pointerUp(card as Element, { clientX: 40, clientY: 102 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/applications", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("applies to a job on right swipe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      })
    );

    render(<SwipeStack initialJobs={[stubJob]} />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 40, clientY: 100 });
    fireEvent.pointerMove(card as Element, { clientX: 220, clientY: 98 });
    fireEvent.pointerUp(card as Element, { clientX: 220, clientY: 98 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/apply", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("moves a saved job to applications on right swipe from saved mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob]} savedJobsMode />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 40, clientY: 100 });
    fireEvent.pointerMove(card as Element, { clientX: 220, clientY: 98 });
    fireEvent.pointerUp(card as Element, { clientX: 220, clientY: 98 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/apply", expect.objectContaining({
        method: "POST",
      }));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/saved-jobs", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("moves a saved job to skipped jobs on left swipe from saved mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob]} savedJobsMode />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 220, clientY: 100 });
    fireEvent.pointerMove(card as Element, { clientX: 40, clientY: 98 });
    fireEvent.pointerUp(card as Element, { clientX: 40, clientY: 98 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/applications", expect.objectContaining({
        method: "POST",
      }));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/saved-jobs", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("moves a skipped job to applications on right swipe from skipped mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob]} skippedJobsMode />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 40, clientY: 100 });
    fireEvent.pointerMove(card as Element, { clientX: 220, clientY: 98 });
    fireEvent.pointerUp(card as Element, { clientX: 220, clientY: 98 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/apply", expect.objectContaining({
        method: "POST",
      }));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/skipped-jobs", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("moves a skipped job to saved jobs on double tap from skipped mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob]} skippedJobsMode />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerDown(card as Element, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card as Element, { clientX: 10, clientY: 10 });
    fireEvent.pointerDown(card as Element, { clientX: 12, clientY: 12 });
    fireEvent.pointerUp(card as Element, { clientX: 12, clientY: 12 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/saved-jobs", expect.objectContaining({
        method: "POST",
      }));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/skipped-jobs", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("moves a skipped job to saved jobs with the star button from skipped mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob]} skippedJobsMode />);

    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/saved-jobs", expect.objectContaining({
        method: "POST",
      }));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/skipped-jobs", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("cycles to the next saved job when pressing the star button from saved mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SwipeStack initialJobs={[stubJob, secondJob]} savedJobsMode />);

    expect(screen.getByTestId("job-company").textContent).toContain("Google");

    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    expect(screen.getByTestId("job-company").textContent).toContain("Meta");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not save or apply on hover movement alone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) }));

    render(<SwipeStack initialJobs={[stubJob]} />);

    const card = screen.getByTestId("job-company").closest("div[class*='relative']");
    expect(card).not.toBeNull();

    fireEvent.pointerMove(card as Element, { clientX: 250, clientY: 120 });

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
