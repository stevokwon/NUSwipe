import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns an array of candidate company logo URLs.
 * Try them in order.
 */
export function getCompanyLogoCandidates(company: string, customLogoUrl?: string | null, size: number = 256): string[] {
  const candidates: string[] = [];
  if (customLogoUrl) candidates.push(customLogoUrl);

  const logoKitToken = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
  const brandName = company.trim();

  // Known hard-to-guess domains
  const knownDomains: Record<string, string> = {
    "procter & gamble": "pg.com",
    "p&g": "pg.com",
    "jpmorgan chase": "jpmorganchase.com",
    "j.p. morgan": "jpmorgan.com",
    "goldman sachs": "goldmansachs.com",
  };

  const normalizedBrand = brandName.toLowerCase();
  if (knownDomains[normalizedBrand]) {
    const domain = knownDomains[normalizedBrand];
    candidates.push(`https://img.logokit.com/${domain}?token=${logoKitToken}&size=${size}&fallback=404`);
  }

  // Strategy 1: If it looks like a domain, use it directly
  const isDomain = brandName.includes(".") && !brandName.includes(" ");
  if (isDomain) {
    candidates.push(`https://img.logokit.com/${brandName}?token=${logoKitToken}&size=${size}&fallback=404`);
    return candidates;
  }

  // Strategy 2: Cleaned versions
  const baseClean = brandName
    .replace(/\s+(Inc|Ltd|Corp|Co|Limited|Corporation|Company)\.?$/i, "")
    .replace(/[^a-zA-Z0-9 ]/g, "");

  // Version A: First word only (e.g. "McKinsey & Company" -> "mckinsey.com")
  const firstWord = baseClean.split(" ")[0].toLowerCase();
  if (firstWord && firstWord.length > 2) {
    candidates.push(`https://img.logokit.com/${firstWord}.com?token=${logoKitToken}&size=${size}&fallback=404`);
  }

  // Version B: All words joined (e.g. "Procter & Gamble" -> "proctergamble.com")
  const allWordsJoined = baseClean.replace(/\s+/g, "").toLowerCase();
  if (allWordsJoined && allWordsJoined !== firstWord) {
    candidates.push(`https://img.logokit.com/${allWordsJoined}.com?token=${logoKitToken}&size=${size}&fallback=404`);
  }

  return Array.from(new Set(candidates)); // Unique URLs only
}

/**
 * Compatibility wrapper for getCompanyLogo
 */
export function getCompanyLogo(company: string, customLogoUrl?: string | null, size: number = 256): string {
  return getCompanyLogoCandidates(company, customLogoUrl, size)[0];
}
