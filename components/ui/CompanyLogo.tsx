"use client";

import { useState, useEffect } from "react";
import { getCompanyLogoCandidates } from "@/lib/utils";

interface CompanyLogoProps {
  company: string;
  logoUrl?: string | null;
  className?: string;
  size?: number;
}

/** Two-letter initials from company name (e.g. "Goldman Sachs" → "GS", "Google" → "G") */
function initials(company: string): string {
  return company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function CompanyLogo({ company, logoUrl, className = "h-14 w-14", size = 256 }: CompanyLogoProps) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    const urls = getCompanyLogoCandidates(company, logoUrl, size);
    setCandidates(urls);
    setCurrentIndex(0);
    setFailedAll(urls.length === 0);
  }, [company, logoUrl, size]);

  const currentUrl = candidates[currentIndex];

  const handleError = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFailedAll(true);
    }
  };

  return (
    <div className={`rounded-2xl border border-white/20 bg-white p-0 flex items-center justify-center shadow-lg overflow-hidden shrink-0 ${className}`}>
      {!failedAll && currentUrl ? (
        <img 
          src={currentUrl} 
          alt={`${company} logo`} 
          className="w-full h-full object-contain scale-[1.05]"
          onError={handleError}
        />
      ) : (
        <span className="font-bold text-slate-400 text-xl tracking-tighter">
          {initials(company)}
        </span>
      )}
    </div>
  );
}
