import xss from "xss";

/**
 * Strips potentially dangerous characters and HTML tags from input.
 * @param input The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
  if (!input) return "";
  return xss(input.trim(), {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });
};

/**
 * Parses a year filter string into structured data for database queries.
 * Supports:
 * - Single years: "2025"
 * - Lists: "2023, 2024"
 * - Ranges: "2020-2022"
 * - Validation: Years must be 4 digits between 2000-2100.
 * @param input Raw input string
 * @returns Object containing individual years and date ranges
 */
export const parseYearFilter = (
  input: string,
): { years: number[]; ranges: { start: number; end: number }[] } => {
  const MIN_VALID_YEAR = 2000;
  const MAX_VALID_YEAR = 2100;
  const MAX_YEARS_TO_EXPLODE = 5;

  const sanitized = sanitizeString(input);
  if (!sanitized) return { years: [], ranges: [] };

  const parts = sanitized.split(",").map((p) => p.trim());
  const years: Set<number> = new Set();
  const ranges: { start: number; end: number }[] = [];

  parts.forEach((part) => {
    // Check for range (e.g., "2020-2022")
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (
        !isNaN(start) &&
        !isNaN(end) &&
        start <= end &&
        start >= MIN_VALID_YEAR &&
        end <= MAX_VALID_YEAR
      ) {
        // Optimization: For small ranges, just explode into years to keep query simple
        if (end - start <= MAX_YEARS_TO_EXPLODE) {
          for (let y = start; y <= end; y++) {
            years.add(y);
          }
        } else {
          ranges.push({ start, end });
        }
      }
    } else {
      // Single year
      const year = parseInt(part, 10);
      if (!isNaN(year) && year >= MIN_VALID_YEAR && year <= MAX_VALID_YEAR) {
        years.add(year);
      }
    }
  });

  return {
    years: Array.from(years).sort((a, b) => a - b),
    ranges,
  };
};
