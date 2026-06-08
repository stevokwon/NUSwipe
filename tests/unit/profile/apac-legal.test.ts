import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile, Job } from '../../../lib/types';

vi.mock('../../../lib/logger', () => ({
  logger: { warn: vi.fn() },
}));

import { checkVisaCompatibility } from '../../../lib/profile/apac-legal';
import { logger } from '../../../lib/logger';

const mockLogger = vi.mocked(logger);

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseProfile: Profile = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  preferred_name: null,
  email: 'test@example.com',
  phone_country_code: null,
  phone_number: null,
  sg_residency: null,
  ns_status: null,
  sg_university: null,
  hk_residency: null,
  hk_university: null,
  major: 'Computer Science',
  minor: null,
  gpa: null,
  grad_month_year: '2025-05',
  resume_url: null,
  linkedin_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const noSponsorJob: Pick<Job, 'visa_sponsorship'> = { visa_sponsorship: false };
const sponsorJob: Pick<Job, 'visa_sponsorship'> = { visa_sponsorship: true };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('checkVisaCompatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: SG Citizen + visa_sponsorship false → compatible
  it('returns compatible for SG citizen when job does not sponsor', () => {
    // "Citizen" is the exact ProfileForm.tsx Select value stored in the DB
    const profile: Profile = { ...baseProfile, sg_residency: 'Citizen' };
    const result = checkVisaCompatibility(profile, noSponsorJob);
    expect(result.compatible).toBe(true);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  // Case 2: any profile + visa_sponsorship true → compatible (bypass)
  it('returns compatible for any residency when job sponsors visas', () => {
    const profile: Profile = { ...baseProfile, sg_residency: 'Employment Pass Required' };
    const result = checkVisaCompatibility(profile, sponsorJob);
    expect(result.compatible).toBe(true);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  // Case 3: EP Required + visa_sponsorship false → incompatible, SG reason + field
  it('returns incompatible with SG reason and field when EP required and job does not sponsor', () => {
    // "Employment Pass Required" is the exact value ProfileForm.tsx stores in the DB
    const profile: Profile = { ...baseProfile, sg_residency: 'Employment Pass Required' };
    const result = checkVisaCompatibility(profile, noSponsorJob);
    expect(result.compatible).toBe(false);
    if (!result.compatible) {
      expect(result.reason).toMatch(/SG/i);
      expect(result.field).toBe('sg_residency');
    }
    // field name logged, not the value
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'sg_residency' }),
      expect.any(String),
    );
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.anything() }),
      expect.any(String),
    );
  });

  // Case 4: HK Visa Required + visa_sponsorship false → incompatible, HK reason + field
  it('returns incompatible with HK reason and field when HK visa required and job does not sponsor', () => {
    // "Visa Required" is the exact value ProfileForm.tsx stores in the DB
    const profile: Profile = { ...baseProfile, hk_residency: 'Visa Required' };
    const result = checkVisaCompatibility(profile, noSponsorJob);
    expect(result.compatible).toBe(false);
    if (!result.compatible) {
      expect(result.reason).toMatch(/HK/i);
      expect(result.field).toBe('hk_residency');
    }
    // field name logged, not the value
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'hk_residency' }),
      expect.any(String),
    );
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.anything() }),
      expect.any(String),
    );
  });

  // Case 5: null residency + visa_sponsorship false → compatible (benefit of doubt)
  it('returns compatible when both residency fields are null (benefit of doubt)', () => {
    const profile: Profile = { ...baseProfile, sg_residency: null, hk_residency: null };
    const result = checkVisaCompatibility(profile, noSponsorJob);
    expect(result.compatible).toBe(true);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  // Case 6: NS status never blocks
  it('returns compatible regardless of ns_status value', () => {
    const profile: Profile = { ...baseProfile, sg_residency: 'Citizen', ns_status: 'Completed' };
    const result = checkVisaCompatibility(profile, noSponsorJob);
    expect(result.compatible).toBe(true);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
