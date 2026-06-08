import { describe, it, expect } from 'vitest';
import type { ApplicationWithJob } from '../../../lib/types';
import { computeResponseRate } from '../../../components/tracker/ApplicationBoard';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeApp(status: ApplicationWithJob['status']): ApplicationWithJob {
  return {
    id: crypto.randomUUID(),
    user_id: 'user-1',
    job_id: 'job-1',
    status,
    ats_submission_id: null,
    notes: null,
    applied_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    jobs: {
      id: 'job-1',
      company: 'Grab',
      role: 'SWE',
      location: 'Singapore',
      division: null,
      description: null,
      visa_sponsorship: false,
      salary_range: null,
      ats_type: 'lever',
      ats_board_token: 'grab',
      ats_job_id: 'uuid',
      ats_fallback_url: null,
      logo_url: null,
      tags: [],
      active: true,
      created_at: '2025-01-01T00:00:00Z',
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeResponseRate', () => {
  // Case 1: empty list → 0
  it('returns 0 when there are no applications', () => {
    expect(computeResponseRate([])).toBe(0);
  });

  // Case 2: only pending apps — excluded from denominator → 0
  it('returns 0 when all applications are pending (unconfirmed submissions)', () => {
    const apps = [makeApp('pending'), makeApp('pending')];
    expect(computeResponseRate(apps)).toBe(0);
  });

  // Case 3: mix without pending — standard rate
  it('computes rate correctly from confirmed applications only', () => {
    const apps = [makeApp('applied'), makeApp('interviewing')];
    // 1 non-applied out of 2 confirmed = 50%
    expect(computeResponseRate(apps)).toBe(50);
  });

  // Case 4: pending apps excluded from denominator, not just numerator
  it('excludes pending from denominator so they do not dilute the rate', () => {
    const apps = [makeApp('applied'), makeApp('pending'), makeApp('interviewing')];
    // confirmed = [applied, interviewing] → 1 non-applied / 2 = 50%
    // (wrong result if pending counted in denom: 1/3 = 33%)
    expect(computeResponseRate(apps)).toBe(50);
  });
});
