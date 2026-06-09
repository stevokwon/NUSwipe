// Shared phone formatter used by all ATS submission handlers.
// Strips whitespace from the number and applies the country code,
// defaulting to +65 (Singapore) when country code is absent.
export function formatPhone(
  countryCode: string | null,
  number: string | null
): string {
  return `${countryCode ?? "+65"}${(number ?? "").replace(/\s/g, "")}`;
}
