import { formatStoreDisplayName } from "../api/api";

// Hardcoded monthly walk-in totals per store for specified periods.
// Key = normalized store name, Value = { "YYYY-MM": count }
export const HARDCODED_WALKINS = {
  "SG Calicut": { "2025-08": 198 },
  "SG Chavakkad": { "2025-08": 250 },
  "SG Edappal": { "2025-08": 304 },
  "SG Edappally": { "2025-08": 541 },
  "SG Kottakkal": { "2025-08": 128 },
  "SG Kottayam": { "2025-08": 247 },
  "SG Manjeri": { "2025-08": 112 },
  "SG Palakkad": { "2025-08": 234 },
  "SG Perinthalmanna": { "2025-08": 333 },
  "SG Perumbavoor": { "2025-08": 307 },
  "SG Thrissur": { "2025-08": 175 },
  "SG Trivandrum": { "2025-08": 282 },
  "SG Vadakara": { "2025-08": 67 },
  "Z Edappal": { "2025-08": 160 },
  "Z Edappally": { "2025-08": 630 },
  "Z Kottakkal": { "2025-08": 121 },
  "Z Perinthalmanna": { "2025-08": 214 },
  "SG MG Road": { "2025-08": 0 },
  "SG Kannur": { "2025-08": 290 },
  "SG Kalpetta": { "2025-08": 100 },
};

/**
 * Normalizes store name into canonical format
 */
export const normalizeStoreKey = (rawName) => {
  if (!rawName) return "";
  let formatted = formatStoreDisplayName(rawName);
  if (/trissur/i.test(rawName)) formatted = "SG Thrissur";
  if (/mg\s*road/i.test(rawName)) formatted = "SG MG Road";
  if (/perinthalmana/i.test(rawName)) formatted = formatted.replace(/Perinthalmana/i, "Perinthalmanna");
  return formatted;
};

/**
 * Returns hardcoded walkin count for store and date range if available, or undefined.
 */
export const getHardcodedWalkin = (rawName, startDateStr, endDateStr) => {
  if (!startDateStr) return undefined;
  
  const dateObj = new Date(startDateStr);
  if (isNaN(dateObj.getTime())) return undefined;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}-${month}`;

  const normKey = normalizeStoreKey(rawName);
  if (HARDCODED_WALKINS[normKey] && HARDCODED_WALKINS[normKey][monthKey] !== undefined) {
    return HARDCODED_WALKINS[normKey][monthKey];
  }

  const directFmt = formatStoreDisplayName(rawName);
  if (HARDCODED_WALKINS[directFmt] && HARDCODED_WALKINS[directFmt][monthKey] !== undefined) {
    return HARDCODED_WALKINS[directFmt][monthKey];
  }

  return undefined;
};
