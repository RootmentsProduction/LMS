/** Normalize HomeProgress API payload to a branch array. */
export function normalizeBranchProgress(responseData) {
  const raw = responseData?.data;
  const rows = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];

  // Branches hidden from all views (legacy duplicates)
  const hiddenBranches = new Set([
    "office",
    "production",
    "warehouse",
    "suitor guy kochi",
    "grooms kochi",
    "sg kochi",
    "suitor guy calicut",
    "grooms calicut",
    "sg calicut",
  ]);

  return rows
    .map((row) => {
      const branchName = String(row?.branchName || row?.branch || "").trim();

      // Normalise brand prefixes → short codes used in the chart
      const normalizedBranchName = /^grooms\s+/i.test(branchName)
        ? branchName.replace(/^grooms\s+/i, "SG ")
        : /^suitor\s+guy\s+/i.test(branchName)
          ? branchName.replace(/^suitor\s+guy\s+/i, "SG ")
          : /^zorrucci\s+/i.test(branchName)
            ? branchName.replace(/^zorrucci\s+/i, "ZR ")
            : /^zorucci\s+/i.test(branchName)
              ? branchName.replace(/^zorucci\s+/i, "ZR ")
              : branchName;

      // Location part with a short brand prefix for the X-axis tick label
      // SG branches → plain location name, ZR branches → "Z-<location>"
      const locationOnly = normalizedBranchName.replace(/^(SG|ZR)\s+/i, "").trim();
      const shortBranchName = /^ZR\s+/i.test(normalizedBranchName)
        ? `Z-${locationOnly}`
        : locationOnly;

      return {
        ...row,
        branchName: normalizedBranchName,
        branch: normalizedBranchName,
        shortBranchName,
      };
    })
    .filter((row) => {
      const name = String(row?.branchName || row?.branch || "").toLowerCase().trim();
      return name && !hiddenBranches.has(name);
    })
    // SG branches first, ZR (Zorucci) branches last
    .sort((a, b) => {
      const aIsZR = String(a?.branchName || "").toUpperCase().startsWith("ZR ");
      const bIsZR = String(b?.branchName || "").toUpperCase().startsWith("ZR ");
      if (aIsZR === bIsZR) return 0;
      return aIsZR ? 1 : -1;
    });
}

/** Last 7 calendar days (oldest first). */
export function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export function dateKey(raw) {
  if (!raw) return null;
  const parts = String(raw).split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return String(raw).split('T')[0];
}

/** Derive training/assessment counts from HomeProgress percentage fields. */
export function countFromPercent(percent, total) {
  if (!total) return 0;
  return Math.round(((percent || 0) / 100) * total);
}
