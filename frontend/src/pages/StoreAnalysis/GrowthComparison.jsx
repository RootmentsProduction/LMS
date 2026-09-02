import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import { FiSearch, FiDownload } from "react-icons/fi";
import baseUrl, { formatStoreDisplayName } from "../../api/api";
import { getHardcodedWalkin } from "../../utils/hardcodedWalkins";

const CACHE_TTL_MS = 2 * 60 * 1000;

// Shared performance cache (same as StoreInsights/HomeBar to reuse cross-page results)
const getPerformanceCached = async (locId, startDate, endDate) => {
  const cacheKey = `perf_${locId}_${startDate}_${endDate}`;
  if (!window.__performanceCache) window.__performanceCache = {};
  
  const cached = window.__performanceCache[cacheKey];
  if (cached) {
    if (cached.data && (Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS)) {
      return cached.data;
    }
    if (cached.promise) {
      return cached.promise;
    }
  }

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
      const res = await fetch("https://rentalapi.rootments.live/api/Reports/GetPerformanceStaffReportWithCancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          DateFrom: startDate,
          DateTo: endDate,
          BookingNo: "",
          LocationID: locId,
          UserID: "7777"
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.dataSet?.data) ? json.dataSet.data : [];
        window.__performanceCache[cacheKey] = {
          data,
          timestamp: Date.now()
        };
        return data;
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn(`Error fetching performance for loc ${locId}:`, err);
      }
      delete window.__performanceCache[cacheKey];
    }
    return [];
  })();
  window.__performanceCache[cacheKey] = { promise, timestamp: Date.now() };
  return promise;
};

// Concurrency limiter — same pattern as StoreInsights
const runWithConcurrencyLimit = async (tasks, limit) => {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
};

const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

function canonFixes(s) {
  return s
    .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
    .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")
    .replace(/\bmanjeri\b/g, "manjery")
    .replace(/\bperinthalmana\b/g, "perinthalmanna")
    .replace(/\bkottakal\b/g, "kottakkal")
    .replace(/\bkalpeta\b/g, "kalpetta")
    .replace(/\bzoruc+i\b/g, "zorucci");
}

function norm(s) {
  const x = String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return canonFixes(x);
}

function locationKey(name) {
  return norm(name)
    .split(" ")
    .filter((t) => t && !BRAND_TOKENS.has(t))
    .join(" ");
}

function displayBranchName(name) {
  return formatStoreDisplayName(name);
}

function isHiddenBranch(name) {
  const normalized = norm(name);
  // Non-sales branches: hide from all report views
  const nonSalesBranches = ["office", "production", "warehouse"];
  if (nonSalesBranches.includes(normalized)) return true;
  // Any test store
  if (normalized.startsWith("test ") || normalized.startsWith("test")) {
    const afterTest = normalized.replace(/^test\s*/, "").trim();
    if (afterTest.length > 0) return true;
  }
  return (
    normalized === norm("Suitor Guy Kochi") ||
    normalized === norm("GROOMS Kochi") ||
    normalized === norm("Grooms Kochi") ||
    normalized === norm("Suitor Guy Calicut") ||
    normalized === norm("GROOMS Calicut") ||
    normalized === norm("Grooms Calicut")
  );
}

// Local date string formatting (YYYY-MM-DD) avoiding timezone shift errors
const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CURRENT_MONTH_LONG = new Date().toLocaleString("en-US", { month: "long" });
const CURRENT_MONTH_SHORT = new Date().toLocaleString("en-US", { month: "short" });
const CURRENT_YEAR = new Date().getFullYear();

const parseWeekDays = (val) => {
  if (!val || val === "Select Days") return { start: null, end: null };
  const digits = String(val).match(/\d+/g);
  if (digits && digits.length >= 2) {
    const start = parseInt(digits[0], 10);
    const end = parseInt(digits[1], 10);
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }
  return { start: null, end: null };
};

const getDaysInMonth = (monthName, year = CURRENT_YEAR) => {
  const months = {
    January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
    July: 31, August: 31, September: 30, October: 31, November: 30, December: 31
  };
  if (monthName === "February") {
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
      return 29;
    }
    return 28;
  }
  return months[monthName] || 30;
};

function normalizeForMatch(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^sg/, "g")
    .replace(/^dapper/, "dappr");
}

const getAutoWeekDates = (monthName = CURRENT_MONTH_LONG, year = CURRENT_YEAR) => {
  const daysInMonth = getDaysInMonth(monthName, year);
  const mShort = monthName.substring(0, 3);
  return {
    1: `01 - 07 ${mShort}`,
    2: `08 - 14 ${mShort}`,
    3: `15 - 21 ${mShort}`,
    4: `22 - ${String(daysInMonth).padStart(2, "0")} ${mShort}`,
  };
};

const getStoreWeekRange = (storeName, storeWeekRanges = {}) => {
  if (!storeName) return null;

  const tryMatch = (name) => {
    if (!name) return null;
    const snorm = name.replace(/[.\-]/g, '-');
    const normKey = normalizeForMatch(name);
    const matchKey = Object.keys(storeWeekRanges).find(
      k => k === name || k === snorm || (normKey && normalizeForMatch(k) === normKey)
    );
    if (matchKey && storeWeekRanges[matchKey]) {
      const storeVal = storeWeekRanges[matchKey];
      if (storeVal[CURRENT_MONTH_LONG]) {
        const mVal = storeVal[CURRENT_MONTH_LONG];
        if (mVal[1] || mVal[2] || mVal[3] || mVal[4]) return mVal;
      }
      if (storeVal[1] || storeVal[2] || storeVal[3] || storeVal[4]) return storeVal;
    }
    return null;
  };

  const exactMatch = tryMatch(storeName);
  const allMatch = tryMatch("All");

  if (exactMatch && storeName !== "All") {
    if (allMatch) {
      const exact3 = String(exactMatch[3] || "");
      const all3 = String(allMatch[3] || "");
      if (exact3.includes("15 - 21") && !all3.includes("15 - 21")) {
        return allMatch;
      }
    }
    return exactMatch;
  }

  if (allMatch) return allMatch;
  if (exactMatch) return exactMatch;

  return null;
};

// Date Range Helpers for TY/LY (This Year / Last Year)
const getStoreWTDDateRange = (storeName = "All", targetYear, storeWeekRanges = {}) => {
  const today = new Date();
  const todayDateNum = today.getDate();
  const daysInMonth = getDaysInMonth(CURRENT_MONTH_LONG);
  const daysInMonthStr = String(daysInMonth).padStart(2, "0");

  let w1 = localStorage.getItem("week1Dates") || `01 - 07 ${CURRENT_MONTH_SHORT}`;
  let w2 = localStorage.getItem("week2Dates") || `08 - 14 ${CURRENT_MONTH_SHORT}`;
  let w3 = localStorage.getItem("week3Dates") || `15 - 21 ${CURRENT_MONTH_SHORT}`;
  let w4 = localStorage.getItem("week4Dates") || `22 - ${daysInMonthStr} ${CURRENT_MONTH_SHORT}`;

  const sr = getStoreWeekRange(storeName, storeWeekRanges);
  if (sr) {
    if (sr[1]) w1 = sr[1];
    if (sr[2]) w2 = sr[2];
    if (sr[3]) w3 = sr[3];
    if (sr[4]) w4 = sr[4];
  }

  const weeks = [
    { id: 1, val: w1 },
    { id: 2, val: w2 },
    { id: 3, val: w3 },
    { id: 4, val: w4 },
  ];

  let activeWeekId = 4;
  let found = false;
  for (const w of weeks) {
    const { start: startDay, end: endDay } = parseWeekDays(w.val);
    if (startDay !== null && endDay !== null) {
      if (todayDateNum >= startDay && todayDateNum <= endDay) {
        activeWeekId = w.id;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    if (todayDateNum <= 7) activeWeekId = 1;
    else if (todayDateNum <= 14) activeWeekId = 2;
    else if (todayDateNum <= 21) activeWeekId = 3;
    else activeWeekId = 4;
  }

  let startDayNum = 1;
  let endDayNum = Math.min(todayDateNum, daysInMonth);
  const weekVal = activeWeekId === 1 ? w1 
                : activeWeekId === 2 ? w2 
                : activeWeekId === 3 ? w3 
                : w4;
                
  if (weekVal && weekVal !== "Select Days") {
    const { start: pStart, end: pEnd } = parseWeekDays(weekVal);
    if (pStart !== null) startDayNum = pStart;
    if (pEnd !== null) endDayNum = Math.min(todayDateNum, pEnd, daysInMonth);
  }

  const start = new Date(targetYear, today.getMonth(), startDayNum);
  const end = new Date(targetYear, today.getMonth(), endDayNum);

  return {
    start: getLocalDateString(start),
    end: getLocalDateString(end)
  };
};

const getMTDDateRange = (targetYear) => {
  const today = new Date();
  const start = new Date(targetYear, today.getMonth(), 1);
  const end = new Date(targetYear, today.getMonth(), today.getDate());
  return {
    start: getLocalDateString(start),
    end: getLocalDateString(end)
  };
};

const getActiveWeekInfo = (storeWeekRanges = {}) => {
  const today = new Date();
  const todayDateNum = today.getDate();
  const daysInMonth = getDaysInMonth(CURRENT_MONTH_LONG);

  let w1 = localStorage.getItem("week1Dates") || `01 - 07 ${CURRENT_MONTH_SHORT}`;
  let w2 = localStorage.getItem("week2Dates") || `08 - 14 ${CURRENT_MONTH_SHORT}`;
  let w3 = localStorage.getItem("week3Dates") || `15 - 21 ${CURRENT_MONTH_SHORT}`;
  let w4 = localStorage.getItem("week4Dates") || `22 - ${daysInMonth} ${CURRENT_MONTH_SHORT}`;

  const sr = getStoreWeekRange("All", storeWeekRanges);
  if (sr) {
    if (sr[1]) w1 = sr[1];
    if (sr[2]) w2 = sr[2];
    if (sr[3]) w3 = sr[3];
    if (sr[4]) w4 = sr[4];
  }

  const weeks = [
    { id: 1, val: w1 },
    { id: 2, val: w2 },
    { id: 3, val: w3 },
    { id: 4, val: w4 },
  ];

  let activeWeekId = 4;
  for (const w of weeks) {
    const { start: startDay, end: endDay } = parseWeekDays(w.val);
    if (startDay !== null && endDay !== null) {
      if (todayDateNum >= startDay && todayDateNum <= endDay) {
        activeWeekId = w.id;
        break;
      }
    }
  }

  const rangeStr = activeWeekId === 1 ? w1 : activeWeekId === 2 ? w2 : activeWeekId === 3 ? w3 : w4;
  return { activeWeekId, rangeStr };
};

const mockComparisonRows = [
  { sl: 1, name: "G Thrissur", tyVal: 798500, lyVal: 845200, l2lVal: -46700, tyBill: 186, lyBill: 172, l2lBill: 14, tyQty: 342, lyQty: 315, l2lQty: 27, tyWalk: 1240, lyWalk: 1180, l2lWalk: 60 },
  { sl: 2, name: "SG Edappally", tyVal: 924600, lyVal: 884500, l2lVal: 40100, tyBill: 198, lyBill: 187, l2lBill: 11, tyQty: 368, lyQty: 344, l2lQty: 24, tyWalk: 1320, lyWalk: 1270, l2lWalk: 50 },
  { sl: 3, name: "G Thrissur", tyVal: 798500, lyVal: 845200, l2lVal: -46700, tyBill: 186, lyBill: 172, l2lBill: 14, tyQty: 342, lyQty: 315, l2lQty: 27, tyWalk: 1240, lyWalk: 1180, l2lWalk: 60 },
  { sl: 4, name: "SG Edappally", tyVal: 924600, lyVal: 884500, l2lVal: 40100, tyBill: 198, lyBill: 187, l2lBill: 11, tyQty: 368, lyQty: 344, l2lQty: 24, tyWalk: 1320, lyWalk: 1270, l2lWalk: 50 },
  { sl: 5, name: "G Thrissur", tyVal: 798500, lyVal: 845200, l2lVal: -46700, tyBill: 186, lyBill: 172, l2lBill: 14, tyQty: 342, lyQty: 315, l2lQty: 27, tyWalk: 1240, lyWalk: 1180, l2lWalk: 60 },
  { sl: 6, name: "SG Edappally", tyVal: 924600, lyVal: 884500, l2lVal: 40100, tyBill: 198, lyBill: 187, l2lBill: 11, tyQty: 368, lyQty: 344, l2lQty: 24, tyWalk: 1320, lyWalk: 1270, l2lWalk: 50 },
  { sl: 7, name: "G Thrissur", tyVal: 798500, lyVal: 845200, l2lVal: -46700, tyBill: 186, lyBill: 172, l2lBill: 14, tyQty: 342, lyQty: 315, l2lQty: 27, tyWalk: 1240, lyWalk: 1180, l2lWalk: 60 },
  { sl: 8, name: "SG Edappally", tyVal: 924600, lyVal: 884500, l2lVal: 40100, tyBill: 198, lyBill: 187, l2lBill: 11, tyQty: 368, lyQty: 344, l2lQty: 24, tyWalk: 1320, lyWalk: 1270, l2lWalk: 50 },
  { sl: 9, name: "G Thrissur", tyVal: 798500, lyVal: 845200, l2lVal: -46700, tyBill: 186, lyBill: 172, l2lBill: 14, tyQty: 342, lyQty: 315, l2lQty: 27, tyWalk: 1240, lyWalk: 1180, l2lWalk: 60 },
  { sl: 10, name: "SG Edappally", tyVal: 924600, lyVal: 884500, l2lVal: 40100, tyBill: 198, lyBill: 187, l2lBill: 11, tyQty: 368, lyQty: 344, l2lQty: 24, tyWalk: 1320, lyWalk: 1270, l2lWalk: 50 }
];

const BRANCH_LOCATION_MAPPING = {
  // Z-Edappally (loc 1)
  "z-edapally1": "1", "z-edappally1": "1", "z edapally1": "1", "z edappally1": "1",
  "zorucci edappally": "1", "zorucci edapally": "1", "z.edappally": "1", "z.edapally": "1",
  // G-Edappally (loc 3)
  "g-edappally": "3", "g edappally": "3", "grooms edappally": "3", "suitor guy edappally": "3",
  "sg.edappally": "3", "sg edappally": "3", "sg.edapally": "3", "sg edapally": "3",
  // G-Trivandrum (loc 5)
  "g-trivandrum": "5", "g.trivandrum": "5", "g trivandrum": "5",
  "grooms trivandrum": "5", "suitor guy trivandrum": "5", "sg.trivandrum": "5", "sg trivandrum": "5", "sg.tvm": "5",
  // Z-Edappal (loc 6)
  "z- edappal": "6", "z.edappal": "6", "z edappal": "6", "zorucci edappal": "6",
  // Z-Perinthalmanna (loc 7)
  "z.perinthalmanna": "7", "z perinthalmanna": "7", "zorucci perinthalmanna": "7", "z.perinthalmana": "7",
  // Z-Kottakkal (loc 8)
  "z.kottakkal": "8", "z kottakkal": "8", "zorucci kottakkal": "8",
  // G-Kottayam (loc 9)
  "g.kottayam": "9", "g kottayam": "9", "grooms kottayam": "9", "suitor guy kottayam": "9", "sg.kottayam": "9", "sg kottayam": "9",
  // G-Perumbavoor (loc 10)
  "g.perumbavoor": "10", "g perumbavoor": "10", "grooms perumbavoor": "10", "suitor guy perumbavoor": "10", "sg.perumbavoor": "10", "sg perumbavoor": "10",
  // G-Thrissur (loc 11)
  "g.thrissur": "11", "g thrissur": "11", "grooms thrissur": "11", "suitor guy thrissur": "11", "sg.thrissur": "11", "sg thrissur": "11", "sg.tsr": "11",
  // G-Chavakkad (loc 12)
  "g.chavakkad": "12", "g chavakkad": "12", "grooms chavakkad": "12", "suitor guy chavakkad": "12", "sg.chavakkad": "12", "sg chavakkad": "12",
  // G-Calicut (loc 13)
  "g.calicut": "13", "g calicut": "13", "grooms calicut": "13", "suitor guy calicut": "13", "sg.calicut": "13", "sg calicut": "13",
  // G-Vadakara (loc 14)
  "g.vadakara": "14", "g vadakara": "14", "grooms vadakara": "14", "suitor guy vadakara": "14", "sg.vadakara": "14", "sg vadakara": "14",
  // G-Edappal (loc 15)
  "g.edappal": "15", "g edappal": "15", "grooms edappal": "15", "suitor guy edappal": "15", "sg.edappal": "15", "sg edappal": "15",
  // G-Perinthalmanna (loc 16)
  "g.perinthalmanna": "16", "g perinthalmanna": "16", "grooms perinthalmanna": "16", "suitor guy perinthalmanna": "16",
  "sg.perinthalmanna": "16", "sg perinthalmanna": "16", "sg-perinthalmanna": "16", "sg.perinthalmana": "16", "sg perinthalmana": "16", "sg.pma": "16", "sg pma": "16",
  // G-Kottakkal (loc 17)
  "g.kottakkal": "17", "g kottakkal": "17", "grooms kottakkal": "17", "suitor guy kottakkal": "17", "sg.kottakkal": "17", "sg kottakkal": "17", "sg.ktk": "17",
  // G-Manjeri (loc 18)
  "g.manjeri": "18", "g manjeri": "18", "grooms manjeri": "18", "suitor guy manjeri": "18", "sg.manjeri": "18", "sg manjeri": "18",
  // G-Palakkad (loc 19)
  "g.palakkad": "19", "g palakkad": "19", "grooms palakkad": "19", "suitor guy palakkad": "19", "sg.palakkad": "19", "sg palakkad": "19", "sg.pkd": "19",
  // G-Kalpetta (loc 20)
  "g.kalpetta": "20", "g kalpetta": "20", "grooms kalpetta": "20", "suitor guy kalpetta": "20", "sg.kalpetta": "20", "sg kalpetta": "20",
  // G-Kannur (loc 21)
  "g.kannur": "21", "g kannur": "21", "grooms kannur": "21", "suitor guy kannur": "21", "sg.kannur": "21", "sg kannur": "21", "sg.knr": "21",
  // G-MG Road (loc 23)
  "g.mg road": "23", "g.mgroad": "23", "g mg road": "23", "gmg road": "23", "grooms mg road": "23", "suitor guy mg road": "23", "sg.mg road": "23", "sg.mgroad": "23", "sg mg road": "23",
  // Dappr Squad (loc 25)
  "dappr squad": "25", "crsrootments": "25"
};

// Fuzzy stripped lookup (strips all non-alphanumeric) — matches StoreInsights
const BRANCH_LOCATION_MAPPING_FUZZY = (() => {
  const fuzzy = {};
  Object.entries(BRANCH_LOCATION_MAPPING).forEach(([key, val]) => {
    const stripped = key.replace(/[^a-z0-9]/g, "");
    if (!fuzzy[stripped]) fuzzy[stripped] = val;
  });
  return fuzzy;
})();

function getBranchLocationId(workingBranch) {
  if (!workingBranch) return null;
  const normalized = String(workingBranch).trim().toLowerCase();
  // 1. Exact match
  if (BRANCH_LOCATION_MAPPING[normalized]) return BRANCH_LOCATION_MAPPING[normalized];
  // 2. Fuzzy: strip all separators
  const stripped = normalized.replace(/[^a-z0-9]/g, "");
  if (BRANCH_LOCATION_MAPPING_FUZZY[stripped]) return BRANCH_LOCATION_MAPPING_FUZZY[stripped];
  // 3. City keyword fallback
  const CITY_TO_LOC = {
    "edappally": "3", "edapally": "3",
    "trivandrum": "5", "thiruvananthapuram": "5",
    "perinthalmanna": "16", "perinthalmana": "16",
    "kottakkal": "17",
    "kottayam": "9",
    "perumbavoor": "10",
    "thrissur": "11",
    "chavakkad": "12",
    "calicut": "13", "kozhikode": "13",
    "vadakara": "14",
    "edappal": "15",
    "manjeri": "18",
    "palakkad": "19",
    "kalpetta": "20",
    "kannur": "21",
    "mgroad": "23",
  };
  for (const [city, locId] of Object.entries(CITY_TO_LOC)) {
    if (stripped.endsWith(city) || stripped.includes(city)) {
      if (stripped.startsWith("z") || stripped.startsWith("g") || stripped.startsWith("sg") ||
          stripped.startsWith("suitor") || stripped.startsWith("grooms") || stripped.startsWith("zorucci")) {
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("edappal")) return city.includes("edappally") ? "1" : "6";
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("perinthalman")) return "7";
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("kottakkal")) return "8";
        return locId;
      }
    }
  }
  return null;
}

const getStoreNameFromLocId = (locId) => {
  const branchKey = Object.keys(BRANCH_LOCATION_MAPPING).find(key => BRANCH_LOCATION_MAPPING[key] === locId);
  if (!branchKey) return "All";
  return displayBranchName(branchKey);
};

const sortStoresGThenZ = (a, b) => {
  const getStoreStr = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "object") {
      return (val.name || val.storeName || val.workingBranch || val.label || "").trim();
    }
    return String(val).trim();
  };
  const strA = getStoreStr(a);
  const strB = getStoreStr(b);
  const isZ_A = /^z/i.test(strA);
  const isZ_B = /^z/i.test(strB);
  if (!isZ_A && isZ_B) return -1;
  if (isZ_A && !isZ_B) return 1;
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
};

const GrowthComparison = () => {
  const { user } = useSelector((state) => state.auth || {});
  const isStoreAdmin = user?.role === "store_admin";
  const isClusterAdmin = user?.role === "cluster_admin";
  const isRestrictedRole = isStoreAdmin || isClusterAdmin;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const STORES_PER_PAGE = 9999;
  const [clusters, setClusters] = useState([]);
  const [selectedClusters, setSelectedClusters] = useState(["All"]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState(["All"]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

  const clusterDropdownRef = useRef(null);
  const storeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clusterDropdownRef.current && !clusterDropdownRef.current.contains(e.target)) {
        setIsClusterDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);
  const [activeTab, setActiveTab] = useState("MTD");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `2026-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    return `2026-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);
  const [branches, setBranches] = useState([]);
  // walkin counts per store: { [storeName]: number } — sourced from walkin-count API (same as WalkinCount page)
  const [tyWalkinCounts, setTyWalkinCounts] = useState({});
  const [lyWalkinCounts, setLyWalkinCounts] = useState({});
  const [tyPerformance, setTyPerformance] = useState({});
  const [lyPerformance, setLyPerformance] = useState({});
  const [loading, setLoading] = useState(false);
  const [storeWeekRanges, setStoreWeekRanges] = useState(() => {
    try { return JSON.parse(localStorage.getItem("storeWeekRanges") || "{}"); } catch { return {}; }
  });

  // Fetch active clusters dynamically
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) 
            ? json.data.filter(item => item.role === "cluster_admin") 
            : [];
          setClusters(list);
        }
      } catch (err) {
        console.error("Error fetching cluster admins for GrowthComparison:", err);
      }
    };
    fetchClusters();
  }, []);

  // Fetch store target week ranges on mount
  useEffect(() => {
    const fetchStoreTargets = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/store-targets?month=${CURRENT_MONTH_LONG}&year=${CURRENT_YEAR}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          const data = Array.isArray(json?.data) ? json.data : [];
          const rangesMap = {};
          const autoWeeks = getAutoWeekDates(CURRENT_MONTH_LONG, CURRENT_YEAR);
          data.forEach((doc) => {
            const store = doc.storeName;
            const storeNorm = store.replace(/[.\-]/g, '-');
            const normKey = normalizeForMatch(store);
            const rangeEntry = {
              1: (doc.weekRanges?.[1] && doc.weekRanges?.[1] !== "Select Days") ? doc.weekRanges[1] : autoWeeks[1],
              2: (doc.weekRanges?.[2] && doc.weekRanges?.[2] !== "Select Days") ? doc.weekRanges[2] : autoWeeks[2],
              3: (doc.weekRanges?.[3] && doc.weekRanges?.[3] !== "Select Days") ? doc.weekRanges[3] : autoWeeks[3],
              4: (doc.weekRanges?.[4] && doc.weekRanges?.[4] !== "Select Days") ? doc.weekRanges[4] : autoWeeks[4],
              [CURRENT_MONTH_LONG]: {
                1: (doc.weekRanges?.[1] && doc.weekRanges?.[1] !== "Select Days") ? doc.weekRanges[1] : autoWeeks[1],
                2: (doc.weekRanges?.[2] && doc.weekRanges?.[2] !== "Select Days") ? doc.weekRanges[2] : autoWeeks[2],
                3: (doc.weekRanges?.[3] && doc.weekRanges?.[3] !== "Select Days") ? doc.weekRanges[3] : autoWeeks[3],
                4: (doc.weekRanges?.[4] && doc.weekRanges?.[4] !== "Select Days") ? doc.weekRanges[4] : autoWeeks[4],
              }
            };
            rangesMap[store] = rangeEntry;
            if (storeNorm !== store) rangesMap[storeNorm] = rangeEntry;
            if (normKey) rangesMap[normKey] = rangeEntry;
          });
          setStoreWeekRanges(rangesMap);
        }
      } catch (err) {
        console.error("Error fetching store targets in GrowthComparison:", err);
      }
    };
    fetchStoreTargets();
  }, []);

  const renderCellVal = (val, isPercent = false) => {
    const rawVal = String(val);
    const isZero = rawVal === "0" || rawVal === "0.0" || rawVal === "0%" || rawVal === "+0.0%" || rawVal === "-0.0%" || rawVal === "";
    const colorClass = isZero ? "text-[#e05a47] font-bold" : "";
    return (
      <span className={colorClass}>
        {val}{isPercent && "%"}
      </span>
    );
  };

  // Fetch branches dynamically
  useEffect(() => {
    let timer;
    let isMounted = true;
    const fetchBranches = async (retries = 3) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          let visible = list.filter((b) => !isHiddenBranch(b?.workingBranch));
          if (isRestrictedRole) {
            const assignedBranchIds = new Set((user?.branches || []).map((b) => String(b._id || b)));
            const assignedBranchNames = new Set(
              (user?.branches || [])
                .map((b) => norm(b.workingBranch || b.name || (typeof b === "string" ? b : "")))
                .filter(Boolean)
            );
            visible = visible.filter(
              (b) =>
                assignedBranchIds.has(String(b._id)) ||
                assignedBranchNames.has(norm(b.workingBranch))
            );
          }
          setBranches([...visible].sort(sortStoresGThenZ));
        } else if (retries > 0 && isMounted) {
          timer = setTimeout(() => fetchBranches(retries - 1), 2000);
        }
      } catch (err) {
        if (retries > 0 && isMounted) {
          timer = setTimeout(() => fetchBranches(retries - 1), 2000);
        }
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user, isRestrictedRole]);

  // Fetch Year-Over-Year Walk-In Counts (per store via walkin-count API) and Performance Report Data
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        let tyStart, tyEnd, lyStart, lyEnd;
        if (activeTab === "WTD") {
          const wtdTy = getStoreWTDDateRange("All", currentYear, storeWeekRanges);
          const wtdLy = getStoreWTDDateRange("All", lastYear, storeWeekRanges);
          tyStart = wtdTy.start;
          tyEnd = wtdTy.end;
          lyStart = wtdLy.start;
          lyEnd = wtdLy.end;
        } else if (activeTab === "CUSTOM") {
          tyStart = customStartDate;
          tyEnd = customEndDate;
          const tyYear = new Date(customStartDate).getFullYear() || currentYear;
          const lyYear = tyYear - 1;
          lyStart = customStartDate.replace(String(tyYear), String(lyYear));
          lyEnd = customEndDate.replace(String(tyYear), String(lyYear));
        } else {
          const tyRange = getMTDDateRange(currentYear);
          const lyRange = getMTDDateRange(lastYear);
          tyStart = tyRange.start;
          tyEnd = tyRange.end;
          lyStart = lyRange.start;
          lyEnd = lyRange.end;
        }

        const locationIds = ["1", "3", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "23", "25"];

        const tyTasks = locationIds.map((locId) => async () => {
          let storeStart = tyStart;
          let storeEnd = tyEnd;
          if (activeTab === "WTD") {
            const storeName = getStoreNameFromLocId(locId);
            const range = getStoreWTDDateRange(storeName, currentYear, storeWeekRanges);
            storeStart = range.start;
            storeEnd = range.end;
          }
          const data = await getPerformanceCached(locId, storeStart, storeEnd);
          return { locId, data };
        });

        const lyTasks = locationIds.map((locId) => async () => {
          let storeStart = lyStart;
          let storeEnd = lyEnd;
          if (activeTab === "WTD") {
            const storeName = getStoreNameFromLocId(locId);
            const range = getStoreWTDDateRange(storeName, lastYear, storeWeekRanges);
            storeStart = range.start;
            storeEnd = range.end;
          }
          const data = await getPerformanceCached(locId, storeStart, storeEnd);
          return { locId, data };
        });

        // Fetch TY & LY walkin lists in bulk (2 fast requests instead of 42 individual store requests)
        const branchRes = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        let branchList = [];
        if (branchRes.ok) {
          const branchJson = await branchRes.json();
          branchList = Array.isArray(branchJson?.data)
            ? branchJson.data.filter((b) => !isHiddenBranch(b?.workingBranch))
            : [];
          if (isRestrictedRole) {
            const assignedBranchIds = new Set((user?.branches || []).map((b) => String(b._id || b)));
            const assignedBranchNames = new Set(
              (user?.branches || [])
                .map((b) => norm(b.workingBranch || b.name || (typeof b === "string" ? b : "")))
                .filter(Boolean)
            );
            branchList = branchList.filter(
              (b) =>
                assignedBranchIds.has(String(b._id)) ||
                assignedBranchNames.has(norm(b.workingBranch))
            );
          }
          if (branchList.length > 0 && !cancelled) {
            setBranches([...branchList].sort(sortStoresGThenZ));
          }
        }

        const [tyWalkinRes, lyWalkinRes, tyResults, lyResults] = await Promise.all([
          fetch(`${baseUrl.baseUrl}api/walkin/list?startDate=${tyStart}&endDate=${tyEnd}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          }).catch(() => null),
          fetch(`${baseUrl.baseUrl}api/walkin/list?startDate=${lyStart}&endDate=${lyEnd}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          }).catch(() => null),
          runWithConcurrencyLimit(tyTasks, 10),
          runWithConcurrencyLimit(lyTasks, 10),
        ]);

        if (cancelled) return;

        const tyWalkinJson = tyWalkinRes?.ok ? await tyWalkinRes.json() : null;
        const lyWalkinJson = lyWalkinRes?.ok ? await lyWalkinRes.json() : null;

        const tyWalkinList = Array.isArray(tyWalkinJson?.data) ? tyWalkinJson.data : (Array.isArray(tyWalkinJson?.walkins) ? tyWalkinJson.walkins : []);
        const lyWalkinList = Array.isArray(lyWalkinJson?.data) ? lyWalkinJson.data : (Array.isArray(lyWalkinJson?.walkins) ? lyWalkinJson.walkins : []);

        const tyWalkMap = {};
        const lyWalkMap = {};

        branchList.forEach((b) => {
          const rawName = b.workingBranch;
          const fmtName = formatStoreDisplayName(rawName);

          const tyCount = tyWalkinList.filter((w) => {
            const wFmt = formatStoreDisplayName(w.store);
            return wFmt === fmtName || norm(w.store) === norm(rawName);
          }).length;

          let lyCount = lyWalkinList.filter((w) => {
            const wFmt = formatStoreDisplayName(w.store);
            return wFmt === fmtName || norm(w.store) === norm(rawName);
          }).length;

          const hCount = getHardcodedWalkin(rawName, lyStart, lyEnd);
          if (hCount !== undefined && hCount !== null) {
            lyCount = hCount;
          }

          tyWalkMap[rawName] = tyCount;
          lyWalkMap[rawName] = lyCount;
        });

        setTyWalkinCounts(tyWalkMap);
        setLyWalkinCounts(lyWalkMap);

        const tyMap = {};
        const lyMap = {};
        tyResults.forEach(r => { tyMap[r.locId] = r.data; });
        lyResults.forEach(r => { lyMap[r.locId] = r.data; });

        setTyPerformance(tyMap);
        setLyPerformance(lyMap);

      } catch (err) {
        console.error("Error fetching YoY walkins and performance for comparison:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [activeTab, customStartDate, customEndDate, storeWeekRanges, branches.length]);

  const formatIndianNumber = (num) => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const str = absNum.toString();
    let lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    if (otherNumbers !== "") {
      lastThree = "," + lastThree;
    }
    const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return (isNegative ? "-" : "") + res;
  };

  const storeOptions = useMemo(() => {
    let list = branches;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedBranchIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => {
            assignedBranchIds.add(String(b._id || b));
            if (b.workingBranch) assignedBranchIds.add(norm(b.workingBranch));
          });
        }
      });
      list = branches.filter(b => 
        assignedBranchIds.has(String(b._id)) || assignedBranchIds.has(norm(b.workingBranch))
      );
    }
    return list.map(b => displayBranchName(b.workingBranch)).filter(Boolean).sort(sortStoresGThenZ);
  }, [branches, selectedClusters, clusters]);

  const filteredRows = useMemo(() => {
    let targetBranches = branches;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedBranchIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => {
            assignedBranchIds.add(String(b._id || b));
            if (b.workingBranch) assignedBranchIds.add(norm(b.workingBranch));
          });
        }
      });
      targetBranches = branches.filter(b => 
        assignedBranchIds.has(String(b._id)) || assignedBranchIds.has(norm(b.workingBranch))
      );
    }

    if (selectedStores.length > 0 && !selectedStores.includes("All")) {
      targetBranches = targetBranches.filter(b => selectedStores.includes(displayBranchName(b.workingBranch)));
    }

    const activeList = targetBranches.map((b, index) => {
      const name = displayBranchName(b.workingBranch);
      const locId = getBranchLocationId(b.workingBranch);

      // Walk-in counts come directly from walkin-count API (same as WalkinCount page)
      const tyWalk = tyWalkinCounts[b.workingBranch] || 0;
      const lyWalk = lyWalkinCounts[b.workingBranch] || 0;

      const tyLocList = Array.isArray(tyPerformance[locId]) ? tyPerformance[locId] : [];
      const lyLocList = Array.isArray(lyPerformance[locId]) ? lyPerformance[locId] : [];

      // API property mapping from GetPerformanceStaffReportWithCancel:
      // totalValue = Sales Value (Rupees), total_Number_Of_Bill = Bill Count, totalQuantity = Qty
      const tyVal = tyLocList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
      const lyVal = lyLocList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
      const tyBill = tyLocList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
      const lyBill = lyLocList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
      const tyQty = tyLocList.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
      const lyQty = lyLocList.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

      return {
        sl: index + 1,
        name,
        tyVal,
        lyVal,
        tyBill,
        lyBill,
        tyQty,
        lyQty,
        tyWalk,
        lyWalk
      };
    });

    return activeList.sort(sortStoresGThenZ).filter((row) =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [branches, selectedClusters, selectedStores, clusters, tyWalkinCounts, lyWalkinCounts, tyPerformance, lyPerformance, searchQuery, activeTab, customStartDate, customEndDate, storeWeekRanges]);

  // Reset to page 1 when search, cluster, store, or tab changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedClusters, selectedStores, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / STORES_PER_PAGE));
  const paginatedRows = filteredRows.slice((currentPage - 1) * STORES_PER_PAGE, currentPage * STORES_PER_PAGE);

  // Dynamic calculations for totals row
  const totalTyVal = useMemo(() => filteredRows.reduce((acc, r) => acc + r.tyVal, 0), [filteredRows]);
  const totalLyVal = useMemo(() => filteredRows.reduce((acc, r) => acc + r.lyVal, 0), [filteredRows]);
  const totalL2lVal = useMemo(() => totalTyVal - totalLyVal, [totalTyVal, totalLyVal]);

  const totalTyBill = useMemo(() => filteredRows.reduce((acc, r) => acc + r.tyBill, 0), [filteredRows]);
  const totalLyBill = useMemo(() => filteredRows.reduce((acc, r) => acc + r.lyBill, 0), [filteredRows]);
  const totalL2lBill = useMemo(() => totalTyBill - totalLyBill, [totalTyBill, totalLyBill]);

  const totalTyQty = useMemo(() => filteredRows.reduce((acc, r) => acc + r.tyQty, 0), [filteredRows]);
  const totalLyQty = useMemo(() => filteredRows.reduce((acc, r) => acc + r.lyQty, 0), [filteredRows]);
  const totalL2lQty = useMemo(() => totalTyQty - totalLyQty, [totalTyQty, totalLyQty]);

  const totalTyWalk = useMemo(() => filteredRows.reduce((acc, r) => acc + r.tyWalk, 0), [filteredRows]);
  const totalLyWalk = useMemo(() => filteredRows.reduce((acc, r) => acc + r.lyWalk, 0), [filteredRows]);
  const totalL2lWalk = useMemo(() => totalTyWalk - totalLyWalk, [totalTyWalk, totalLyWalk]);

  const handleExportCSV = () => {
    const scaleLabel = activeTab === "MTD" ? "MTD" : (activeTab === "WTD" ? "WTD" : "CUSTOM");
    
    // Metric order: Walk-In -> Bill -> Quantity -> Value
    const headers = [
      "Store Name",
      `Walk-In TY (${scaleLabel})`, `Walk-In LY (${scaleLabel})`, "Walk-In L2L", "Walk-In L2L %",
      `Bill TY (${scaleLabel})`, `Bill LY (${scaleLabel})`, "Bill L2L", "Bill L2L %",
      `Qty TY (${scaleLabel})`, `Qty LY (${scaleLabel})`, "Qty L2L", "Qty L2L %",
      `Value TY (${scaleLabel})`, `Value LY (${scaleLabel})`, "Value L2L", "Value L2L %"
    ];
    
    const rows = filteredRows.map((row) => {
      const wL2l = row.tyWalk - row.lyWalk;
      const wL2lPctRaw = row.lyWalk > 0 ? (((row.tyWalk / row.lyWalk) - 1) * 100).toFixed(1) : "0.0";
      const wL2lPct = row.lyWalk > 0 ? (Number(wL2lPctRaw) > 0 ? "+" : "") + wL2lPctRaw + "%" : "0.0%";

      const bL2l = row.tyBill - row.lyBill;
      const bL2lPctRaw = row.lyBill > 0 ? (((row.tyBill / row.lyBill) - 1) * 100).toFixed(1) : "0.0";
      const bL2lPct = row.lyBill > 0 ? (Number(bL2lPctRaw) > 0 ? "+" : "") + bL2lPctRaw + "%" : "0.0%";
      
      const qL2l = row.tyQty - row.lyQty;
      const qL2lPctRaw = row.lyQty > 0 ? (((row.tyQty / row.lyQty) - 1) * 100).toFixed(1) : "0.0";
      const qL2lPct = row.lyQty > 0 ? (Number(qL2lPctRaw) > 0 ? "+" : "") + qL2lPctRaw + "%" : "0.0%";
      
      const vL2l = row.tyVal - row.lyVal;
      const vL2lPctRaw = row.lyVal > 0 ? (((row.tyVal / row.lyVal) - 1) * 100).toFixed(1) : "0.0";
      const vL2lPct = row.lyVal > 0 ? (Number(vL2lPctRaw) > 0 ? "+" : "") + vL2lPctRaw + "%" : "0.0%";

      return [
        row.name,
        row.tyWalk, row.lyWalk, wL2l, wL2lPct,
        row.tyBill, row.lyBill, bL2l, bL2lPct,
        row.tyQty, row.lyQty, qL2l, qL2lPct,
        row.tyVal, row.lyVal, vL2l, vL2lPct
      ];
    });
    
    const totalWL2l = totalTyWalk - totalLyWalk;
    const totalWL2lPctRaw = totalLyWalk > 0 ? (((totalTyWalk / totalLyWalk) - 1) * 100).toFixed(1) : "0.0";
    const totalWL2lPct = totalLyWalk > 0 ? (Number(totalWL2lPctRaw) > 0 ? "+" : "") + totalWL2lPctRaw + "%" : "0.0%";

    const totalBL2l = totalTyBill - totalLyBill;
    const totalBL2lPctRaw = totalLyBill > 0 ? (((totalTyBill / totalLyBill) - 1) * 100).toFixed(1) : "0.0";
    const totalBL2lPct = totalLyBill > 0 ? (Number(totalBL2lPctRaw) > 0 ? "+" : "") + totalBL2lPctRaw + "%" : "0.0%";
    
    const totalQL2l = totalTyQty - totalLyQty;
    const totalQL2lPctRaw = totalLyQty > 0 ? (((totalTyQty / totalLyQty) - 1) * 100).toFixed(1) : "0.0";
    const totalQL2lPct = totalLyQty > 0 ? (Number(totalQL2lPctRaw) > 0 ? "+" : "") + totalQL2lPctRaw + "%" : "0.0%";
    
    const totalVL2l = totalTyVal - totalLyVal;
    const totalVL2lPctRaw = totalLyVal > 0 ? (((totalTyVal / totalLyVal) - 1) * 100).toFixed(1) : "0.0";
    const totalVL2lPct = totalLyVal > 0 ? (Number(totalVL2lPctRaw) > 0 ? "+" : "") + totalVL2lPctRaw + "%" : "0.0%";

    rows.push([
      "Total",
      totalTyWalk, totalLyWalk, totalWL2l, totalWL2lPct,
      totalTyBill, totalLyBill, totalBL2l, totalBL2lPct,
      totalTyQty, totalLyQty, totalQL2l, totalQL2lPct,
      totalTyVal, totalLyVal, totalVL2l, totalVL2lPct
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const formatDateForFileName = (dateStr) => {
      if (!dateStr) return '';
      const parts = String(dateStr).split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = String(parseInt(parts[2], 10));
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    };

    const currentStoreName = isStoreAdmin 
      ? (branches[0] ? displayBranchName(branches[0].workingBranch) : "STORE ADMIN") 
      : (selectedStore === "All" ? "ALL STORES" : selectedStore);
    const sanitizedStoreName = String(currentStoreName).toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();

    let dateStr = '';
    if (activeTab === "CUSTOM") {
      const startFmt = formatDateForFileName(customStartDate);
      const endFmt = formatDateForFileName(customEndDate);
      dateStr = (startFmt && endFmt && startFmt !== endFmt) ? `${startFmt} TO ${endFmt}` : (startFmt || endFmt);
    } else {
      const startFmt = formatDateForFileName(getLocalDateString(new Date()));
      dateStr = startFmt;
    }

    const fileName = `${sanitizedStoreName} - GROWTH COMPARISON REPORT - ${dateStr}`.trim() + '.csv';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scaleLabel = activeTab === "MTD" ? "MTD" : (activeTab === "WTD" ? "WTD" : "CUSTOM");

  return (
    <div className="flex w-full min-h-screen bg-[#f3f4f6] text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* SideNav desktop */}
      <SideNav />
      
      {/* Mobile navigation */}
      <div className="md:hidden">
        <ModileNav />
      </div>

      {/* Main dashboard content */}
      <div className="flex-1 min-w-0 md:ml-[110px] min-h-screen p-4 sm:p-6 lg:p-8 mb-[70px] md:mb-0 overflow-x-hidden">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Store Rental Comparison</h1>
            <p className="text-gray-500 text-[13px] mt-0.5">Real time performance overview across all stores</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {activeTab === "WTD" && (
              <div className="flex items-center gap-2 bg-zinc-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
                <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  Week {getActiveWeekInfo(storeWeekRanges).activeWeekId}
                </span>
                <span>{getActiveWeekInfo(storeWeekRanges).rangeStr}</span>
              </div>
            )}
            {activeTab === "CUSTOM" && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-xs font-medium text-gray-600">
                <span className="font-bold text-gray-800">TY Range:</span>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-800 font-semibold cursor-pointer"
                />
                <span className="text-gray-300">|</span>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-800 font-semibold cursor-pointer"
                />
                <button
                  onClick={() => {
                    if (tempStartDate && tempEndDate) {
                      setCustomStartDate(tempStartDate);
                      setCustomEndDate(tempEndDate);
                    }
                  }}
                  className="ml-1 bg-black hover:bg-gray-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Fetch
                </button>
              </div>
            )}
            {/* MTD / WTD / Custom switcher */}
            <div className="flex bg-[#e5e7eb] p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setActiveTab("MTD")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "MTD" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                MTD
              </button>
              <button 
                onClick={() => setActiveTab("WTD")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "WTD" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                WTD
              </button>
              <button 
                onClick={() => setActiveTab("CUSTOM")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "CUSTOM" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                <FiSearch size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Search Store name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#eef1f6] border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            {/* Cluster Multi-Select Dropdown */}
            {!isRestrictedRole && clusters.length > 0 && (
              <div className="relative" ref={clusterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[170px]"
                >
                  <span>
                    {selectedClusters.includes("All") || selectedClusters.length === 0
                      ? "Cluster : All"
                      : selectedClusters.length === 1
                        ? `Cluster : ${clusters.find(c => String(c._id) === String(selectedClusters[0]))?.name || "1 Selected"}`
                        : `Clusters (${selectedClusters.length})`
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isClusterDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 text-xs">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
                      <span className="font-bold text-gray-500 text-[11px]">Select Cluster(s)</span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedClusters(["All"])}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedClusters([])}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedClusters.includes("All")}
                          onChange={() => setSelectedClusters(["All"])}
                          className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span>All Clusters</span>
                      </label>
                      {clusters.map((c) => {
                        const isChecked = selectedClusters.includes(String(c._id));
                        return (
                          <label key={c._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-gray-700 font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (selectedClusters.includes("All")) {
                                  setSelectedClusters([String(c._id)]);
                                } else {
                                  if (isChecked) {
                                    const next = selectedClusters.filter(id => id !== String(c._id));
                                    setSelectedClusters(next.length === 0 ? ["All"] : next);
                                  } else {
                                    setSelectedClusters([...selectedClusters, String(c._id)]);
                                  }
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Store Multi-Select Dropdown */}
            {!isStoreAdmin && storeOptions.length > 0 && (
              <div className="relative" ref={storeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[170px]"
                >
                  <span>
                    {selectedStores.includes("All") || selectedStores.length === 0
                      ? "Store : All"
                      : selectedStores.length === 1
                        ? `Store : ${selectedStores[0]}`
                        : `Stores (${selectedStores.length})`
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isStoreDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 text-xs font-sans">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
                      <span className="font-bold text-gray-500 text-[11px]">Select Store(s)</span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedStores(["All"])}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStores([])}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes("All")}
                          onChange={() => setSelectedStores(["All"])}
                          className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span>All Stores</span>
                      </label>
                      {storeOptions.map((name) => {
                        const isChecked = selectedStores.includes(name);
                        return (
                          <label key={name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-gray-700 font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (selectedStores.includes("All")) {
                                  setSelectedStores([name]);
                                } else {
                                  if (isChecked) {
                                    const next = selectedStores.filter(s => s !== name);
                                    setSelectedStores(next.length === 0 ? ["All"] : next);
                                  } else {
                                    setSelectedStores([...selectedStores, name]);
                                  }
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span>{name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#eaecf0] hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <FiDownload size={14} /> Export
          </button>
        </div>

        {/* Main Content Area Card */}
        <div className="relative bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 min-h-[300px]">
              <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mb-2" />
              <span className="text-xs font-bold text-gray-700">Loading Store Comparison Data...</span>
            </div>
          )}
          
          {/* Data Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-center border-collapse">
              <thead>
                {/* Primary header row — Metric order: Walk In -> Bill -> Quantity -> Value */}
                <tr className="bg-[#18181b] text-white text-[11px] font-bold tracking-wider uppercase border-b border-zinc-700">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-[#18181b] px-6 py-4 text-left border-r border-zinc-700 w-60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Store Name</th>
                  <th colSpan={3} className="px-6 py-2 border-r border-zinc-700 text-center">Walk In</th>
                  <th colSpan={3} className="px-6 py-2 border-r border-zinc-700 text-center">Bill</th>
                  <th colSpan={3} className="px-6 py-2 border-r border-zinc-700 text-center">Quantity</th>
                  <th colSpan={3} className="px-6 py-2 text-center">Value</th>
                </tr>
                {/* Secondary header row */}
                <tr className="bg-[#18181b] text-zinc-300 text-[10px] font-bold tracking-wider uppercase">
                  {/* Walk In */}
                  <th className="px-4 py-2 border-r border-zinc-700">{`TY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">{`LY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">L2L</th>

                  {/* Bill */}
                  <th className="px-4 py-2 border-r border-zinc-700">{`TY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">{`LY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">L2L</th>
                  
                  {/* Quantity */}
                  <th className="px-4 py-2 border-r border-zinc-700">{`TY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">{`LY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">L2L</th>
                  
                  {/* Value */}
                  <th className="px-4 py-2 border-r border-zinc-700">{`TY ${scaleLabel}`}</th>
                  <th className="px-4 py-2 border-r border-zinc-700">{`LY ${scaleLabel}`}</th>
                  <th className="px-4 py-2">L2L</th>
                </tr>
              </thead>
              <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                {paginatedRows.map((row, idx) => {
                  const calculatedL2lWalk = row.tyWalk - row.lyWalk;
                  const calculatedL2lBill = row.tyBill - row.lyBill;
                  const calculatedL2lQty = row.tyQty - row.lyQty;
                  const calculatedL2lVal = row.tyVal - row.lyVal;

                  // Formula: ((TY / LY) - 1) * 100
                  const walkL2lPctVal = row.lyWalk > 0 ? (((row.tyWalk / row.lyWalk) - 1) * 100).toFixed(0) : "0";
                  const walkL2lPctText = `${Number(walkL2lPctVal) > 0 ? "+" : ""}${walkL2lPctVal}%`;

                  const billL2lPctVal = row.lyBill > 0 ? (((row.tyBill / row.lyBill) - 1) * 100).toFixed(0) : "0";
                  const billL2lPctText = `${Number(billL2lPctVal) > 0 ? "+" : ""}${billL2lPctVal}%`;

                  const qtyL2lPctVal = row.lyQty > 0 ? (((row.tyQty / row.lyQty) - 1) * 100).toFixed(0) : "0";
                  const qtyL2lPctText = `${Number(qtyL2lPctVal) > 0 ? "+" : ""}${qtyL2lPctVal}%`;

                  const valL2lPctVal = row.lyVal > 0 ? (((row.tyVal / row.lyVal) - 1) * 100).toFixed(0) : "0";
                  const valL2lPctText = `${Number(valL2lPctVal) > 0 ? "+" : ""}${valL2lPctVal}%`;

                  const walkL2lColor = calculatedL2lWalk >= 0 ? "text-[#00A36C]" : "text-[#e05a47]";
                  const billL2lColor = calculatedL2lBill >= 0 ? "text-[#00A36C]" : "text-[#e05a47]";
                  const qtyL2lColor = calculatedL2lQty >= 0 ? "text-[#00A36C]" : "text-[#e05a47]";
                  const valL2lColor = calculatedL2lVal >= 0 ? "text-[#00A36C]" : "text-[#e05a47]";

                  return (
                    <tr key={idx} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors" style={{ animationDelay: `${idx * 40}ms` }}>
                      <td className={`sticky left-0 z-10 px-6 py-4 text-left font-bold text-gray-800 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"}`}>{row.name}</td>
                      
                      {/* 1. Walk In */}
                      <td className="px-4 py-4 font-medium border-r border-gray-100">{renderCellVal(formatIndianNumber(row.tyWalk))}</td>
                      <td className="px-4 py-4 font-medium border-r border-gray-100 text-gray-500">{renderCellVal(formatIndianNumber(row.lyWalk))}</td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{walkL2lPctText}</span>
                          <span className={`text-[10px] font-semibold ${walkL2lColor}`}>
                            {calculatedL2lWalk >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(calculatedL2lWalk))}
                          </span>
                        </div>
                      </td>

                      {/* 2. Bill */}
                      <td className="px-4 py-4 font-medium border-r border-gray-100">{renderCellVal(row.tyBill)}</td>
                      <td className="px-4 py-4 font-medium border-r border-gray-100 text-gray-500">{renderCellVal(row.lyBill)}</td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{billL2lPctText}</span>
                          <span className={`text-[10px] font-semibold ${billL2lColor}`}>
                            {calculatedL2lBill >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(calculatedL2lBill))}
                          </span>
                        </div>
                      </td>
                      
                      {/* 3. Quantity */}
                      <td className="px-4 py-4 font-medium border-r border-gray-100">{renderCellVal(row.tyQty)}</td>
                      <td className="px-4 py-4 font-medium border-r border-gray-100 text-gray-500">{renderCellVal(row.lyQty)}</td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{qtyL2lPctText}</span>
                          <span className={`text-[10px] font-semibold ${qtyL2lColor}`}>
                            {calculatedL2lQty >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(calculatedL2lQty))}
                          </span>
                        </div>
                      </td>

                      {/* 4. Value */}
                      <td className="px-4 py-4 font-medium border-r border-gray-100">{renderCellVal(formatIndianNumber(row.tyVal))}</td>
                      <td className="px-4 py-4 font-medium border-r border-gray-100 text-gray-500">{renderCellVal(formatIndianNumber(row.lyVal))}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{valL2lPctText}</span>
                          <span className={`text-[10px] font-semibold ${valL2lColor}`}>
                            {calculatedL2lVal >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(calculatedL2lVal))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* STORE TOTAL row (Hidden for Store Admin or when only 1 store is displayed) */}
                {!isStoreAdmin && filteredRows.length > 1 && (() => {
                  const totalWalkL2lPctVal = totalLyWalk > 0 ? (((totalTyWalk / totalLyWalk) - 1) * 100).toFixed(0) : "0";
                  const totalWalkL2lPctText = `${Number(totalWalkL2lPctVal) > 0 ? "+" : ""}${totalWalkL2lPctVal}%`;

                  const totalBillL2lPctVal = totalLyBill > 0 ? (((totalTyBill / totalLyBill) - 1) * 100).toFixed(0) : "0";
                  const totalBillL2lPctText = `${Number(totalBillL2lPctVal) > 0 ? "+" : ""}${totalBillL2lPctVal}%`;

                  const totalQtyL2lPctVal = totalLyQty > 0 ? (((totalTyQty / totalLyQty) - 1) * 100).toFixed(0) : "0";
                  const totalQtyL2lPctText = `${Number(totalQtyL2lPctVal) > 0 ? "+" : ""}${totalQtyL2lPctVal}%`;

                  const totalValL2lPctVal = totalLyVal > 0 ? (((totalTyVal / totalLyVal) - 1) * 100).toFixed(0) : "0";
                  const totalValL2lPctText = `${Number(totalValL2lPctVal) > 0 ? "+" : ""}${totalValL2lPctVal}%`;

                  return (
                    <tr className="bg-[#f1f5f9] border-t-2 border-zinc-300 font-bold text-gray-900">
                      <td className="sticky left-0 z-10 bg-[#f1f5f9] px-6 py-4 text-left border-r border-zinc-300 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Store Total</td>
                      
                      {/* 1. Walk In Total */}
                      <td className="px-4 py-4 border-r border-zinc-200">{renderCellVal(formatIndianNumber(totalTyWalk))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200 text-gray-600">{renderCellVal(formatIndianNumber(totalLyWalk))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{totalWalkL2lPctText}</span>
                          <span className={`text-[10px] font-bold ${totalL2lWalk >= 0 ? 'text-[#00A36C]' : 'text-[#e05a47]'}`}>
                            {totalL2lWalk >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(totalL2lWalk))}
                          </span>
                        </div>
                      </td>

                      {/* 2. Bill Total */}
                      <td className="px-4 py-4 border-r border-zinc-200">{renderCellVal(formatIndianNumber(totalTyBill))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200 text-gray-600">{renderCellVal(formatIndianNumber(totalLyBill))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{totalBillL2lPctText}</span>
                          <span className={`text-[10px] font-bold ${totalL2lBill >= 0 ? 'text-[#00A36C]' : 'text-[#e05a47]'}`}>
                            {totalL2lBill >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(totalL2lBill))}
                          </span>
                        </div>
                      </td>
                      
                      {/* 3. Quantity Total */}
                      <td className="px-4 py-4 border-r border-zinc-200">{renderCellVal(formatIndianNumber(totalTyQty))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200 text-gray-600">{renderCellVal(formatIndianNumber(totalLyQty))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{totalQtyL2lPctText}</span>
                          <span className={`text-[10px] font-bold ${totalL2lQty >= 0 ? 'text-[#00A36C]' : 'text-[#e05a47]'}`}>
                            {totalL2lQty >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(totalL2lQty))}
                          </span>
                        </div>
                      </td>

                      {/* 4. Value Total */}
                      <td className="px-4 py-4 border-r border-zinc-200">{renderCellVal(formatIndianNumber(totalTyVal))}</td>
                      <td className="px-4 py-4 border-r border-zinc-200 text-gray-600">{renderCellVal(formatIndianNumber(totalLyVal))}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{totalValL2lPctText}</span>
                          <span className={`text-[10px] font-bold ${totalL2lVal >= 0 ? 'text-[#00A36C]' : 'text-[#e05a47]'}`}>
                            {totalL2lVal >= 0 ? "" : "-"}{formatIndianNumber(Math.abs(totalL2lVal))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-[#fafafa]">
              <span className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-800">{((currentPage - 1) * STORES_PER_PAGE) + 1}–{Math.min(currentPage * STORES_PER_PAGE, filteredRows.length)}</span> of <span className="font-bold text-gray-800">{filteredRows.length}</span> stores
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      page === currentPage
                        ? "bg-[#18181b] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default GrowthComparison;
