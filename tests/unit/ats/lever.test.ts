import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile, Job } from '../../../lib/types';
import type { ApacPayload } from '../../../lib/profile/apac-mapper';

vi.mock('../../../lib/profile/apac-mapper', () => ({
  buildApacPayload: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { submitToLever } from '../../../lib/ats/lever';
import { buildApacPayload } from '../../../lib/profile/apac-mapper';

const mockBuildApacPayload = vi.mocked(buildApacPayload);

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseProfile: Profile = {
  id: 'user-1',
  first_name: 'Wei',
  last_name: 'Tan',
  preferred_name: null,
  email: 'wei@example.com',
  phone_country_code: '+65',
  phone_number: '91234567',
  role: 'candidate',
  sg_residency: 'Citizen',
  ns_status: 'Completed',
  sg_university: 'NUS',
  hk_residency: null,
  hk_university: null,
  major: 'Computer Science',
  minor: null,
  gpa: '4.5',
  grad_month_year: '2025-05',
  resume_url: 'https://storage.example.com/resume.pdf',
  linkedin_url: 'https://linkedin.com/in/weitan',
  skills: [],
  target_role: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const baseJob: Job = {
  id: 'job-1',
  company: 'Grab',
  role: 'Software Engineer',
  location: 'Singapore',
  division: null,
  description: null,
  visa_sponsorship: false,
  salary_range: null,
  ats_type: 'lever',
  ats_board_token: 'grab',
  ats_job_id: 'abc-uuid-123',
  ats_fallback_url: null,
  logo_url: null,
  tags: [],
  active: true,
  created_at: '2025-01-01T00:00:00Z',
};

const fullApacPayload: ApacPayload = {
  questionAnswers: [
    { question: 'Singapore Residency Status', answer: 'Citizen' },
    { question: 'National Service Status', answer: 'Completed' },
    { question: 'University', answer: 'NUS' },
  ],
  educationAnswers: { major: 'Computer Science', gradDate: '2025-05', gpa: '4.5' },
};

const emptyApacPayload: ApacPayload = {
  questionAnswers: [],
  educationAnswers: { major: 'Computer Science', gradDate: '2025-05', gpa: null },
};

function mockSuccessfulFetches(): void {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })),
    } as unknown as Response)
    .mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(''),
    } as unknown as Response);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('submitToLever', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: Happy path — APAC fields appear in FormData
  it('includes APAC Q&A and education fields in the Lever payload', async () => {
    mockSuccessfulFetches();
    mockBuildApacPayload.mockReturnValue(fullApacPayload);

    const result = await submitToLever(baseProfile, baseJob);

    expect(result).toBe('lever-submitted');
    expect(mockBuildApacPayload).toHaveBeenCalledWith(baseProfile);

    const form = mockFetch.mock.calls[1][1].body as FormData;
    expect(form.get('cards[education][field_of_study]')).toBe('Computer Science');
    expect(form.get('cards[education][end_date]')).toBe('2025-05');
    expect(form.get('cards[education][gpa]')).toBe('4.5');
    expect(form.get('customQuestions[0][question]')).toBe('Singapore Residency Status');
    expect(form.get('customQuestions[0][answer]')).toBe('Citizen');
    expect(form.get('customQuestions[1][question]')).toBe('National Service Status');
    expect(form.get('customQuestions[1][answer]')).toBe('Completed');
    expect(form.get('customQuestions[2][question]')).toBe('University');
    expect(form.get('customQuestions[2][answer]')).toBe('NUS');
  });

  // Case 2: Empty questionAnswers — should submit without error
  it('submits successfully when APAC payload has no question answers', async () => {
    mockSuccessfulFetches();
    mockBuildApacPayload.mockReturnValue(emptyApacPayload);

    const result = await submitToLever(baseProfile, baseJob);

    expect(result).toBe('lever-submitted');
    const form = mockFetch.mock.calls[1][1].body as FormData;
    expect(form.get('customQuestions[0][question]')).toBeNull();
  });

  // Case 3: gpa null — gpa field omitted from form
  it('omits cards[education][gpa] when gpa is null', async () => {
    mockSuccessfulFetches();
    mockBuildApacPayload.mockReturnValue(emptyApacPayload); // gpa: null

    await submitToLever(baseProfile, baseJob);

    const form = mockFetch.mock.calls[1][1].body as FormData;
    expect(form.get('cards[education][gpa]')).toBeNull();
  });

  // Case 4: Missing resume_url — throws before any fetch
  it('throws when profile has no resume_url', async () => {
    const profile: Profile = { ...baseProfile, resume_url: null };

    await expect(submitToLever(profile, baseJob)).rejects.toThrow(
      'No resume on file',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Case 5: Lever API returns non-ok — throws with status
  it('throws when Lever API returns a non-ok response', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: () => Promise.resolve('Unprocessable Entity'),
      } as unknown as Response);
    mockBuildApacPayload.mockReturnValue(fullApacPayload);

    await expect(submitToLever(baseProfile, baseJob)).rejects.toThrow(
      'Lever submission failed (422)',
    );
  });
});
