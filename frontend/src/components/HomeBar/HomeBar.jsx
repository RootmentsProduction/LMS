import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";
import { normalizeBranchProgress } from "../../features/dashboard/dashboardUtils";
import { Link } from "react-router-dom";
import { fetchHomeProgressChart as fetchHomeProgress } from "../../features/dashboard/dashboardFetch";
import baseUrl from "../../api/api";

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

function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const STAFF_ALIAS_MAPPING = {
  // Ashiq
  "mohammed ashiq s": "M ASHIQ S",
  "mohammed ashiq": "M ASHIQ S",
  "mohammedashiqs": "M ASHIQ S",
  "mohammedashiq": "M ASHIQ S",
  "mohammad ashiq s": "M ASHIQ S",
  "mohammad ashiq": "M ASHIQ S",
  "m ashiq s": "M ASHIQ S",
  "mashiqs": "M ASHIQ S",
  "m ashiq": "M ASHIQ S",
  "mashiq": "M ASHIQ S",
  "ashiq": "M ASHIQ S",

  // Niyas
  "niyas dinu nasar k": "NIYAS",
  "niyas dinu nasar": "NIYAS",
  "niyasdinunasark": "NIYAS",
  "niyasdinunasar": "NIYAS",
  "niyas": "NIYAS",

  // Shamil
  "m shamil k p": "M SHAMIL K P",
  "mshamilkp": "M SHAMIL K P",
  "muhammed shamil k p": "M SHAMIL K P",
  "muhammedshamilkp": "M SHAMIL K P",
  "shamil k p": "M SHAMIL K P",
  "shamilkp": "M SHAMIL K P",
  "shamil": "M SHAMIL K P",

  // Shahil
  "shahil shan v": "SHAHIL SHAN",
  "shahilshanv": "SHAHIL SHAN",
  "shahil shan": "SHAHIL SHAN",
  "shahilshan": "SHAHIL SHAN",

  // Riswan
  "m riswan": "MOHAMMAD RISWAN",
  "mriswan": "MOHAMMAD RISWAN",
  "riswan": "MOHAMMAD RISWAN",
  "mohammad riswan": "MOHAMMAD RISWAN",
  "mohammed riswan": "MOHAMMAD RISWAN",

  // Shan
  "m shan k": "M SHAN K",
  "mshank": "M SHAN K",
  "muhammed shan k": "M SHAN K",
  "muhammedshank": "M SHAN K",
  "shan k": "M SHAN K",
  "shank": "M SHAN K",
  "shan": "M SHAN K",

  // Faris
  "s faris vk": "S FARIS VK",
  "sfarisvk": "S FARIS VK",
  "salmanul faris v k": "S FARIS VK",
  "salmanulfarisvk": "S FARIS VK",
  "salman faris v k": "S FARIS VK",
  "salmanfarisvk": "S FARIS VK",
  "salman faris": "S FARIS VK",
  "salmanfaris": "S FARIS VK",
  "faris": "S FARIS VK",

  // Salman
  "salman muhammed v": "SALMAN MUHAMMED.V",
  "salmanmuhammedv": "SALMAN MUHAMMED.V",
  "salman muhammed": "SALMAN MUHAMMED.V",
  "salmanmuhammed": "SALMAN MUHAMMED.V",

  // Basil
  "muhammed basil p k": "Muhammed Basil P K",
  "muhammedbasilpk": "Muhammed Basil P K",
  "muhammed basil": "Muhammed Basil P K",
  "muhammedbasil": "Muhammed Basil P K",
  "basil": "Muhammed Basil P K",

  // Shabir
  "muhammad shabir vt": "SHABIR VT",
  "muhammadshabirvt": "SHABIR VT",
  "shabir vt": "SHABIR VT",
  "shabirvt": "SHABIR VT",
  "shabir": "SHABIR VT",

  // Devadath
  "devadeth r": "DEVADATH",
  "devadethr": "DEVADATH",
  "devadeth": "DEVADATH",
  "devadath r": "DEVADATH",
  "devadathr": "DEVADATH",


  // Anshif
  "muhammed anshif c.k": "ANSHIF C.K",
  "muhammed anshif ck": "ANSHIF C.K",
  "muhammedanshifck": "ANSHIF C.K",
  "m anshif ck": "ANSHIF C.K",
  "manshifck": "ANSHIF C.K",
  "anshif c.k": "ANSHIF C.K",
  "anshif ck": "ANSHIF C.K",
  "anshif": "ANSHIF C.K",

  // Afsal
  "mohammed afsal v l": "AFSAL",
  "mohammed afsal": "AFSAL",
  "mohammedafsal": "AFSAL",
  "afsal": "AFSAL",

  // Thahseen
  "muhammad thahseen p": "THAHSEEN P",
  "muhammadthahseenp": "THAHSEEN P",
  "thahseen p": "THAHSEEN P",
  "thahseen": "THAHSEEN P",
  "thahaseen": "THAHSEEN P",

  // Sidheeq
  "sidheek": "SIDHEEQ",
  "sidheeq": "SIDHEEQ",
  "sidheek k": "SIDHEEQ",
  "sidheeq k": "SIDHEEQ",
  "sidheeqk": "SIDHEEQ",
  "sidheekk": "SIDHEEQ",

  // Deepak
  "deepak nh": "DEEPAK N H",
  "deepak n h": "DEEPAK N H",
  "deepaknh": "DEEPAK N H",

  // Shamnad
  "shamnad as": "Shamnad A S",
  "shamnad a s": "Shamnad A S",
  "shamnadas": "Shamnad A S",

  // Jaseena
  "jaseena p": "JASEENA",
  "jaseenap": "JASEENA",

  // Nayana
  "nayana t s": "NAYANA TS",
  "nayanats": "NAYANA TS",

  // Al Shifna
  "al shifna v s": "AL SHIFNA VS",
  "al shifna vs": "AL SHIFNA VS",
  "alshifnavs": "AL SHIFNA VS",
  "al shifna": "AL SHIFNA VS",
  "alshifna": "AL SHIFNA VS",

  // Angel
  "angel p saji": "ANGEL P SAJI",
  "angelpsaji": "ANGEL P SAJI",

  // Alphin
  "alphin biju": "ALPHIN BIJU",
  "alphinbiju": "ALPHIN BIJU",
  "alphin": "ALPHIN BIJU",

  // Amal
  "amal k manoj": "AMAL K MANOJ",
  "amalkmanoj": "AMAL K MANOJ",
  "amal k": "AMAL K MANOJ",
  "amalk": "AMAL K MANOJ",
  "amal": "AMAL K MANOJ",

  // Abhijith
  "abhijith kumar p a": "ABHIJITH KUMAR",
  "abhijithkumarpa": "ABHIJITH KUMAR",
  "abhijith kumar": "ABHIJITH KUMAR",
  "abhijithkumar": "ABHIJITH KUMAR",
  "abhijith": "ABHIJITH KUMAR",

  // Aswin
  "aswin raj m. r": "ASWIN RAJ M.R",
  "aswin raj m.r": "ASWIN RAJ M.R",
  "aswin raj m r": "ASWIN RAJ M.R",
  "aswin raj mr": "ASWIN RAJ M.R",
  "aswinrajmr": "ASWIN RAJ M.R",
  "aswin raj": "ASWIN RAJ M.R",
  "aswinraj": "ASWIN RAJ M.R",
  "aswin": "ASWIN RAJ M.R",

  // Reshma
  "reshma m": "RESHMA M",
  "reshmam": "RESHMA M"
};


function getCanonicalStaffName(rawName) {
  if (!rawName) return "";
  const str = String(rawName).trim();
  const lower = str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  if (STAFF_ALIAS_MAPPING[lower]) {
    return STAFF_ALIAS_MAPPING[lower];
  }
  const normKey = lower.replace(/\s+/g, "");
  if (STAFF_ALIAS_MAPPING[normKey]) {
    return STAFF_ALIAS_MAPPING[normKey];
  }
  return str;
}

function normalizeForMatch(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^sg/, "g")
    .replace(/^dapper/, "dappr");
}

const isDapprSquadName = (name) => {
  if (!name) return false;
  const lower = String(name).toLowerCase().trim();
  const normalized = lower.replace(/[^a-z0-9]/g, "");
  return lower.startsWith("sg.") || 
         lower.startsWith("sg ") || 
         lower === "dappr squad";
};

function isStaffNameMatch(strA, strB) {
  if (!strA || !strB) return false;
  if (isDapprSquadName(strA) || isDapprSquadName(strB)) return false;

  const rawA = String(strA).trim();
  const rawB = String(strB).trim();
  if (rawA.toLowerCase() === rawB.toLowerCase()) return true;

  const canonA = getCanonicalStaffName(rawA);
  const canonB = getCanonicalStaffName(rawB);
  if (canonA.toLowerCase() === canonB.toLowerCase()) return true;

  const normA = normalizeForMatch(canonA);
  const normB = normalizeForMatch(canonB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const cleanTokens = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const tokensA = cleanTokens(canonA);
  const tokensB = cleanTokens(canonB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  if (tokensA.join("") === tokensB.join("")) return true;

  const common = tokensA.filter(t => tokensB.includes(t));
  if (common.length === 0) return false;

  const unsharedA = tokensA.filter(t => !tokensB.includes(t));
  const unsharedB = tokensB.filter(t => !tokensA.includes(t));

  const TITLES = new Set(["muhammed", "mohammad", "mohammed", "md", "m"]);
  const isTitleToken = (t) => TITLES.has(t);

  if (unsharedA.length > 0 && unsharedB.length > 0) {
    const unsharedStrA = unsharedA.join("");
    const unsharedStrB = unsharedB.join("");

    if (unsharedStrA === unsharedStrB) return true;

    if (
      (unsharedA.length === 1 && isTitleToken(unsharedA[0]) && unsharedB.length === 1 && isTitleToken(unsharedB[0])) ||
      (unsharedA.length === 1 && isTitleToken(unsharedA[0]) && unsharedB.every(isTitleToken)) ||
      (unsharedB.length === 1 && isTitleToken(unsharedB[0]) && unsharedA.every(isTitleToken))
    ) {
      return true;
    }

    return false;
  }

  const substantialCommon = common.filter(t => t.length >= 3 && !TITLES.has(t));
  if (substantialCommon.length > 0) {
    const remainingUnshared = unsharedA.length > 0 ? unsharedA : unsharedB;
    const allTitlesOrInitials = remainingUnshared.every(t => isTitleToken(t) || t.length <= 2);
    if (allTitlesOrInitials) {
      return true;
    }
  }

  return false;
}

const runWithConcurrencyLimit = async (tasks, limit) => {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

const getPerformanceCached = async (locId, startDate, endDate) => {
  const cacheKey = `perf_${locId}_${startDate}_${endDate}`;
  if (!window.__performanceCache) {
    window.__performanceCache = {};
  }
  
  if (window.__performanceCache[cacheKey]?.promise) {
    return window.__performanceCache[cacheKey].promise;
  }

  const promise = (async () => {
    try {
      const res = await fetch("https://rentalapi.rootments.live/api/Reports/GetPerformanceStaffReportWithCancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          DateFrom: startDate,
          DateTo: endDate,
          BookingNo: "",
          LocationID: locId,
          UserID: "7777"
        })
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.dataSet?.data || [];
        return data;
      }
    } catch (err) {
      console.error(`Error in getPerformanceCached for loc ${locId}:`, err);
    } finally {
      delete window.__performanceCache[cacheKey];
    }
    return [];
  })();

  window.__performanceCache[cacheKey] = {
    promise,
    timestamp: Date.now()
  };

  return promise;
};

const CURRENT_MONTH_LONG = new Date().toLocaleString("en-US", { month: "long" });
const CURRENT_YEAR = new Date().getFullYear();

const getMTDSubtitleRangeString = () => {
  const today = new Date();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  return `${monthName} 01-${day}, ${year}`;
};

/* ── Canon normalizations (matching DSRReport.jsx) ────────────────────────── */
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

function displayBranchName(name) {
  const raw = String(name || "");
  if (/^grooms\s+/i.test(raw)) {
    return raw.replace(/^grooms\s+/i, "Suitor Guy ");
  }
  return raw;
}

function isHiddenBranch(name) {
  const normalized = norm(name);
  const nonSalesBranches = ["office", "production", "warehouse"];
  if (nonSalesBranches.includes(normalized)) return true;
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

/* ── Mock target vs achieved data for line chart ────────────────────────── */
const mockDSRDataForGraph = [
  { name: "Z Edappally", target: 70000, achieved: 68000 },
  { name: "G Edappally", target: 75000, achieved: 76000 },
  { name: "Z Edappal", target: 60000, achieved: 52000 },
  { name: "Z Perinthalmanna", target: 65000, achieved: 62000 },
  { name: "Z Kottakkal", target: 55000, achieved: 68000 },
  { name: "G Kottayam", target: 70000, achieved: 42000 },
  { name: "G Perumbavoor", target: 72000, achieved: 32000 },
  { name: "G Thrissur", target: 65000, achieved: 38000 },
  { name: "SG Edappally", target: 58000, achieved: 35000 },
  { name: "Z Perumbavoor", target: 60000, achieved: 32000 },
  { name: "Z Thrissur", target: 78000, achieved: 52000 },
  { name: "SG Thrissur", target: 75000, achieved: 62000 },
  { name: "Z Manjeri", target: 72000, achieved: 41000 },
  { name: "Z Kalpetta", target: 69000, achieved: 36000 },
  { name: "Z Palakkad", target: 74000, achieved: 48000 },
  { name: "Z Kannur", target: 82000, achieved: 51000 },
  { name: "Z Muvattupuzha", target: 73000, achieved: 68000 },
  { name: "Z Aluva", target: 68000, achieved: 76000 },
  { name: "Z Angamaly", target: 58000, achieved: 51000 },
  { name: "Z Chalakudy", target: 64000, achieved: 62000 },
  { name: "Z Kollam", target: 56000, achieved: 68000 },
  { name: "Z Kayamkulam", target: 70000, achieved: 42000 },
  { name: "Z Tirur", target: 71500, achieved: 32000 },
  { name: "Z Vadakara", target: 64000, achieved: 38000 },
  { name: "SG Test", target: 58000, achieved: 35000 }
];

/* ── Colour tiers (matching reference image) ────────────────────────────── */
const getTierColor = (pct) => {
  if (pct >= 85) return "#22c55e";   // green  — On Track
  if (pct >= 65) return "#3b82f6";   // blue   — In Progress
  if (pct >= 45) return "#f59e0b";   // amber  — Needs Attention
  return "#ef4444";                  // red    — At Risk
};

const getTierLabel = (pct) => {
  if (pct >= 85) return "on-track";
  if (pct >= 65) return "in-progress";
  if (pct >= 45) return "needs-attention";
  return "at-risk";
};

/* ── Custom Tooltips ────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: "10px", padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: "13px", minWidth: "140px",
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>{d.fullBranchName || d.branchName || d.name}</p>
      <p style={{ color: getTierColor(d.pct), margin: "2px 0" }}>Progress: <b>{Number(d.pct).toFixed(1)}%</b></p>
      <p style={{ color: "#6b7280", margin: "2px 0" }}>{d.employees} Employees</p>
      <p style={{ color: "#ef4444", margin: "2px 0" }}>Overdue: <b>{d.overdue}</b></p>
    </div>
  );
};

const RevenueTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const formatNum = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: "10px", padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: "13px", minWidth: "140px",
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>{d.fullName}</p>
      <p style={{ color: "#a855f7", margin: "2px 0" }}>Target: <b>₹{formatNum(d.target)}</b></p>
      <p style={{ color: "#f59e0b", margin: "2px 0" }}>Achieved: <b>₹{formatNum(d.achieved)}</b></p>
      <p style={{ color: d.achieved >= d.target ? "#22c55e" : "#ef4444", margin: "4px 0 2px", fontWeight: 600 }}>
        {d.achieved >= d.target ? "On Track" : "At Risk"}
      </p>
    </div>
  );
};

/* ── Legend pill ─────────────────────────────────────────────────────────── */
const LegendPill = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151" }}>
    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
    {label}
  </div>
);

/* ── Filter tab ──────────────────────────────────────────────────────────── */
const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
      border: "none", cursor: "pointer",
      background: active ? "#111827" : "transparent",
      color: active ? "#fff" : "#6b7280",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

const BranchTick = ({ x, y, payload }) => {
  const label = String(payload?.value || "");
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="end"
        transform="rotate(-28)"
        fontSize={9}
        fill="#9ca3af"
      >
        {label}
      </text>
    </g>
  );
};

/* ── Date range helpers ──────────────────────────────────────────────────── */

// Get the current store week start date using the same logic as StoreInsights
const getStoreWTDStart = (storeWeekRanges) => {
  const today = new Date();
  const todayDateNum = today.getDate();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const monthShort = today.toLocaleString("en-US", { month: "short" });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysStr = String(daysInMonth).padStart(2, "0");

  // Default week ranges (15th starts week 3)
  const defaultRanges = {
    1: `01 - 07 ${monthShort}`,
    2: `08 - 14 ${monthShort}`,
    3: `15 - 21 ${monthShort}`,
    4: `22 - ${daysStr} ${monthShort}`,
  };

  // Try to get ranges from the first store that has data for this month
  let weekRanges = defaultRanges;
  const storeKeys = Object.keys(storeWeekRanges);
  for (const store of storeKeys) {
    const storeObj = storeWeekRanges[store];
    if (storeObj) {
      const monthRanges = storeObj[monthName] || (storeObj[1] || storeObj[2] || storeObj[3] || storeObj[4] ? storeObj : null);
      if (monthRanges) {
        weekRanges = { ...defaultRanges, ...monthRanges };
        break;
      }
    }
  }

  // Determine which week we're in
  let activeWeekId = 4;
  for (const wId of [1, 2, 3, 4]) {
    const val = weekRanges[wId];
    if (!val || val === "Select Days") continue;
    const parts = val.split("-");
    if (parts.length < 2) continue;
    const start = parseInt(parts[0].trim(), 10);
    const endPart = parts[1].trim().split(" ")[0];
    const end = parseInt(endPart, 10);
    if (!isNaN(start) && !isNaN(end) && todayDateNum >= start && todayDateNum <= end) {
      activeWeekId = wId;
      break;
    }
  }

  // Get start day of active week
  const activeVal = weekRanges[activeWeekId];
  let startDayNum = activeWeekId === 1 ? 1 : activeWeekId === 2 ? 8 : activeWeekId === 3 ? 15 : 22;
  if (activeVal && activeVal !== "Select Days") {
    const parts = activeVal.split("-");
    if (parts.length >= 2) {
      const parsed = parseInt(parts[0].trim(), 10);
      if (!isNaN(parsed)) startDayNum = parsed;
    }
  }

  return getLocalDateString(new Date(today.getFullYear(), today.getMonth(), startDayNum));
};

const getDateRangeForTimeframe = (timeframe, customStart, customEnd, storeWeekRanges = {}) => {
  const today = new Date();
  if (timeframe === "MTD") {
    return {
      start: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: getLocalDateString(today),
    };
  }
  if (timeframe === "WTD") {
    return {
      start: getStoreWTDStart(storeWeekRanges),
      end: getLocalDateString(today),
    };
  }
  if (timeframe === "YTD") {
    return {
      start: getLocalDateString(new Date(today.getFullYear(), 0, 1)),
      end: getLocalDateString(today),
    };
  }
  if (timeframe === "CUSTOM" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  // fallback to MTD
  return {
    start: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: getLocalDateString(today),
  };
};

const getTimeframeLabel = (timeframe, customStart, customEnd, storeWeekRanges = {}) => {
  const today = new Date();
  if (timeframe === "MTD") {
    const month = today.toLocaleString("en-US", { month: "long" });
    const day = String(today.getDate()).padStart(2, "0");
    return `${month} 01–${day}, ${today.getFullYear()}`;
  }
  if (timeframe === "WTD") {
    const wtdStart = getStoreWTDStart(storeWeekRanges);
    const startDate = new Date(wtdStart + "T00:00:00");
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${today.getFullYear()}`;
  }
  if (timeframe === "YTD") {
    return `Jan 01 – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${today.getFullYear()}`;
  }
  if (timeframe === "CUSTOM" && customStart && customEnd) {
    const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(customStart)} – ${fmt(customEnd)}`;
  }
  return "";
};

/* ── Timeframe pill button ───────────────────────────────────────────────── */
const TimeframeTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "5px 13px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
      border: "none", cursor: "pointer",
      background: active ? "#111827" : "transparent",
      color: active ? "#fff" : "#6b7280",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

/* ── Main component ──────────────────────────────────────────────────────── */
const HomeBar = () => {
  const user = useSelector((state) => state.auth.user);
  const isStoreAdmin = user?.role === "store_admin";
  const isClusterAdmin = user?.role === "cluster_admin";

  const [activeGraph, setActiveGraph] = useState("revenue"); // "training" or "revenue"
  const [filter, setFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("MTD");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(false);

  const [weeklyTargets, setWeeklyTargets] = useState({});
  const [storeWeekRanges, setStoreWeekRanges] = useState({});
  const [employeeTargets, setEmployeeTargets] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [salesData, setSalesData] = useState({});  // byBranch locCode → { totalValue, totalQty, totalBills }
  const [branches, setBranches] = useState([]);

  // Fetch performance data whenever timeframe or custom dates change
  const fetchPerformance = async (tf, cs, ce, mounted, setData) => {
    const { start, end } = getDateRangeForTimeframe(tf, cs, ce, storeWeekRanges);
    if (!start || !end) return;
    setLoadingPerf(true);
    try {
      const locationIds = ["1", "3", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "23", "25"];
      const pTasks = locationIds.map((locId) => async () => {
        const data = await getPerformanceCached(locId, start, end);
        return { locId, data };
      });
      const pResults = await runWithConcurrencyLimit(pTasks, 4);
      const perfMap = {};
      pResults.forEach(r => { perfMap[r.locId] = r.data; });
      if (mounted.current) setData(perfMap);
    } catch (err) {
      console.error("Error loading performance in HomeBar:", err);
    } finally {
      if (mounted.current) setLoadingPerf(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const mountedRef = { current: true };

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchHomeProgress();
        if (!alive) return;
        setResponseData(data);
      } catch {
        if (!alive) return;
        setResponseData(null);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    load();
    const refresh = () => load();
    window.addEventListener("dashboard:refresh", refresh);

    const fetchBranchesAndTargets = async () => {
      try {
        const token = localStorage.getItem("token");

        const bRes = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        let visibleBranches = [];
        if (bRes.ok) {
          const json = await bRes.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          visibleBranches = list.filter((b) => !isHiddenBranch(b?.workingBranch));
          if (isStoreAdmin || isClusterAdmin) {
            const assignedBranchIds = (user?.branches || []).map(b => String(b._id || b));
            if (assignedBranchIds.length > 0) {
              visibleBranches = visibleBranches.filter(b => assignedBranchIds.includes(String(b._id)));
            }
          }
          if (alive) setBranches(visibleBranches);
        }

        // Fetch ALL months of current year (same as StoreInsights)
        const tRes = await fetch(`${baseUrl.baseUrl}api/store-targets?year=${CURRENT_YEAR}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (tRes.ok) {
          const json = await tRes.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          // Nested structure: map[storeName][monthName] = weeklyTargets — matches StoreInsights
          const targetsMap = {};
          const rangesMap = {};
          const empTargetsMap = {};
          list.forEach(t => {
            const store = t.storeName;
            const month = t.month;
            if (!targetsMap[store]) targetsMap[store] = {};
            if (!rangesMap[store]) rangesMap[store] = {};
            if (!empTargetsMap[store]) empTargetsMap[store] = {};

            const existingTgt = targetsMap[store][month] || {};
            targetsMap[store][month] = {
              1: Number(t.weeklyTargets?.[1]) > 0 ? t.weeklyTargets[1] : (existingTgt[1] || 0),
              2: Number(t.weeklyTargets?.[2]) > 0 ? t.weeklyTargets[2] : (existingTgt[2] || 0),
              3: Number(t.weeklyTargets?.[3]) > 0 ? t.weeklyTargets[3] : (existingTgt[3] || 0),
              4: Number(t.weeklyTargets?.[4]) > 0 ? t.weeklyTargets[4] : (existingTgt[4] || 0),
            };
            rangesMap[store][month] = t.weekRanges || {};
            empTargetsMap[store][month] = t.employeeTargets || [];
          });
          if (alive) {
            setWeeklyTargets(targetsMap);
            setStoreWeekRanges(rangesMap);
            setEmployeeTargets(empTargetsMap);
          }
        }

        // Fetch shoe sales for consolidated achieved value (same as StoreInsights)
        const { start: perfStart, end: perfEnd } = getDateRangeForTimeframe("MTD", "", "");
        const [salesRes, perfInit] = await Promise.all([
          fetch(`${baseUrl.baseUrl}api/brynex/shoe-sales/summary?fromDate=${perfStart}&toDate=${perfEnd}`)
            .then(r => r.ok ? r.json() : { stores: [] }),
          fetchPerformance("MTD", "", "", mountedRef, setPerformanceData),
        ]);

        const salesStores = Array.isArray(salesRes.stores) ? salesRes.stores : [];
        const byBranch = {};
        salesStores.forEach(s => {
          const locCode = String(s.locCode || "");
          if (!locCode) return;
          const total = s.total || {};
          const mixed = s.mixed || {};
          byBranch[locCode] = {
            totalValue: Math.round((total.value || 0)),
            totalQty: total.qty || 0,
            totalBills: total.bills || 0,
          };
        });
        if (alive) setSalesData(byBranch);

      } catch (err) {
        console.error("Error loading branches/targets in HomeBar:", err);
      }
    };

    fetchBranchesAndTargets();

    return () => {
      alive = false;
      mountedRef.current = false;
      window.removeEventListener("dashboard:refresh", refresh);
    };
  }, [isStoreAdmin, isClusterAdmin, user]);

  // Re-fetch performance and sales when timeframe or custom range changes
  useEffect(() => {
    if (timeframe === "CUSTOM" && (!customStart || !customEnd)) return;
    const mountedRef = { current: true };

    const { start, end } = getDateRangeForTimeframe(timeframe, customStart, customEnd, storeWeekRanges);

    fetchPerformance(timeframe, customStart, customEnd, mountedRef, setPerformanceData);

    // Re-fetch sales for the new date range
    fetch(`${baseUrl.baseUrl}api/brynex/shoe-sales/summary?fromDate=${start}&toDate=${end}`)
      .then(r => r.ok ? r.json() : { stores: [] })
      .then(json => {
        if (!mountedRef.current) return;
        const stores = Array.isArray(json.stores) ? json.stores : [];
        const byBranch = {};
        stores.forEach(s => {
          const locCode = String(s.locCode || "");
          if (!locCode) return;
          const total = s.total || {};
          byBranch[locCode] = {
            totalValue: Math.round(total.value || 0),
            totalQty: total.qty || 0,
            totalBills: total.bills || 0,
          };
        });
        setSalesData(byBranch);
      })
      .catch(() => {});

    return () => { mountedRef.current = false; };
  }, [timeframe, customStart, customEnd]);

  const allData = useMemo(() => {
    let data = normalizeBranchProgress(responseData);
    if (isStoreAdmin && user?.workingBranch) {
      const targetFmt = user.workingBranch.toLowerCase().replace(/[^a-z0-9]/g, "");
      const filtered = data.filter((obj) => {
        const name = (obj.branchName || obj.branch || obj.locCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return name.includes(targetFmt) || targetFmt.includes(name);
      });
      if (filtered.length > 0) data = filtered;
    }
    return data;
  }, [responseData, isStoreAdmin, user?.workingBranch]);

  const realChartData = useMemo(() =>
    allData.map((obj) => {
      const pct = Number(obj.completeTraining ?? 0);
      const pendingPct = Number(obj.pendingTraining ?? 0);
      return {
        name:       obj.branchName || obj.branch || obj.locCode,
        branchName: obj.shortBranchName || obj.branchName || obj.locCode,
        fullBranchName: obj.branchName || obj.locCode,
        pct: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0,
        pendingPct: Number.isFinite(pendingPct) ? Math.max(0, Math.min(100, pendingPct)) : 0,
        employees:  obj.totalEmployees || obj.employees || 0,
        overdue:    obj.overdueEmployeesCount || 0,
        tier:       getTierLabel(pct),
        color:      getTierColor(pct),
      };
    }), [allData]);

  const chartData = realChartData;

  const filtered = useMemo(() => {
    if (filter === "on-track")  return chartData.filter(d => d.tier === "on-track");
    if (filter === "at-risk")   return chartData.filter(d => d.tier === "at-risk" || d.tier === "needs-attention");
    return chartData;
  }, [chartData, filter]);

  const isSingleStoreView = isStoreAdmin || branches.length === 1;

  /* ── Generate dynamic target vs achieved data for line chart ── */
  const revenueChartData = useMemo(() => {
    const today = new Date();
    const targetMonth = timeframe === "CUSTOM" && customStart
      ? new Date(customStart + "T00:00:00").toLocaleString("en-US", { month: "long" })
      : CURRENT_MONTH_LONG;

    // ── Single Store View (Store Admin login or 1 store selected): Show Employee Names ──
    if (isSingleStoreView && branches.length > 0) {
      const singleBranch = branches[0];
      const storeName = displayBranchName(singleBranch?.workingBranch);
      const locId = getBranchLocationId(singleBranch?.workingBranch);
      const locCode = singleBranch?.locCode;

      const locPeriodList = performanceData[locId] || [];
      const dapprList = performanceData["25"] || [];
      const dapprForStore = dapprList.filter(item => {
        const raw = String(item.bookingBy || "").trim().toLowerCase();
        const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
        const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
        const DAPPR_MAP = {
          "sg.edappally":"3","sg.perumbavoor":"10","sg.thrissur":"11","sg.chavakkad":"12",
          "sg.calicut":"13","sg.vadakara":"14","sg.edappal":"15","sg.perinthalmanna":"16",
          "sg.kottakkal":"17","sg.manjeri":"18","sg.palakkad":"19","sg.kalpetta":"20",
          "sg.kannur":"21","sg.trivandrum":"5","sg.kottayam":"9","sg.mg road":"23","sg.edapally1":"1"
        };
        return DAPPR_MAP[raw] === locId || DAPPR_MAP[dotted] === locId;
      });

      const mergedPeriodList = [...locPeriodList, ...dapprForStore];
      const storeEmpTargets = employeeTargets[storeName]?.[targetMonth] || [];

      const rawStaffNames = [
        ...mergedPeriodList.map(x => x && x.bookingBy),
        ...storeEmpTargets.map(x => x && x.staffName)
      ].filter(name => typeof name === "string" && name.trim() !== "" && !isDapprSquadName(name)).map(getCanonicalStaffName);

      const staffNames = [];
      const sortedStaffNames = Array.from(new Set(rawStaffNames)).sort((a, b) => {
        const aUpper = /[A-Z]/.test(a);
        const bUpper = /[A-Z]/.test(b);
        if (aUpper && !bUpper) return -1;
        if (!aUpper && bUpper) return 1;
        return (b || "").length - (a || "").length;
      });

      sortedStaffNames.forEach(name => {
        if (!name) return;
        const canon = getCanonicalStaffName(name);
        const existing = staffNames.find(existingName => isStaffNameMatch(existingName, canon));
        if (!existing) {
          staffNames.push(canon);
        }
      });

      const resolveStaffTarget = (staffName) => {
        const empT = storeEmpTargets.find(e => 
          normalizeForMatch(e.staffName) === normalizeForMatch(staffName) || 
          isStaffNameMatch(e.staffName, staffName)
        );
        if (!empT || !empT.weeklyTargets) return 0;
        const wt = empT.weeklyTargets;

        if (timeframe === "MTD" || timeframe === "CUSTOM") {
          return [1, 2, 3, 4].reduce((s, wId) => s + (wt[wId] || 0), 0);
        }
        if (timeframe === "WTD") {
          const monthName = today.toLocaleString("en-US", { month: "long" });
          const storeRanges = weeklyTargets[storeName] ? storeWeekRanges[storeName]?.[monthName] : null;
          const todayDate = today.getDate();
          let weekId = 4;
          for (const wId of [1, 2, 3, 4]) {
            const defaultStarts = [1, 8, 15, 22];
            const defaultEnds = [7, 14, 21, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()];
            let start = defaultStarts[wId - 1];
            let end = defaultEnds[wId - 1];
            if (storeRanges?.[wId]) {
              const parts = storeRanges[wId].split("-");
              if (parts.length >= 2) {
                const s = parseInt(parts[0].trim(), 10);
                const ePart = parts[1].trim().split(" ")[0];
                const e = parseInt(ePart, 10);
                if (!isNaN(s) && !isNaN(e)) { start = s; end = e; }
              }
            }
            if (todayDate >= start && todayDate <= end) { weekId = wId; break; }
          }
          return wt[weekId] || 0;
        }
        if (timeframe === "YTD") {
          const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
          const currentMonthIdx = today.getMonth();
          let sum = 0;
          for (let i = 0; i <= currentMonthIdx; i++) {
            const mMonth = monthNames[i];
            const empTargetForMonth = employeeTargets[storeName]?.[mMonth]?.find(e =>
              normalizeForMatch(e.staffName) === normalizeForMatch(staffName) ||
              isStaffNameMatch(e.staffName, staffName)
            );
            const mwt = empTargetForMonth?.weeklyTargets || {};
            for (let wId = 1; wId <= 4; wId++) {
              sum += mwt[wId] || 0;
            }
          }
          return sum;
        }
        return 0;
      };

      return staffNames.map(staffName => {
        const fullName = String(staffName || "").trim();
        const firstName = fullName.split(/\s+/)[0] || fullName;
        const staffKey = normalizeForMatch(fullName);
        const staffRentalItems = mergedPeriodList.filter(x => x && (normalizeForMatch(x.bookingBy) === staffKey || isStaffNameMatch(x.bookingBy, fullName)));

        let achieved = staffRentalItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
        const target = resolveStaffTarget(fullName);

        return {
          name: firstName.substring(0, 10).toUpperCase(),
          fullName: fullName,
          target,
          achieved
        };
      })
      .filter(item => item.achieved > 0 || item.target > 0)
      .sort((a, b) => b.achieved - a.achieved);
    }

    // ── Multi-Store View (Admin / Cluster Admin viewing all stores): Show Store Names ──
    const list = branches.map((b) => {
      const name = displayBranchName(b.workingBranch);
      const shortName = name.replace(/^(Suitor Guy|SG|Z|G)\s+/i, "").substring(0, 5).toUpperCase();
      const locId = getBranchLocationId(b.workingBranch);
      const locCode = b.locCode;

      // ── TARGET: use nested weeklyTargets[storeName][month] — matches StoreInsights ──
      const storeTargetObj = weeklyTargets[name]?.[targetMonth] || {};
      let target = 0;

      if (timeframe === "MTD" || timeframe === "CUSTOM") {
        const hasWeeks = [1, 2, 3, 4].some(wId => storeTargetObj[wId] !== undefined);
        if (hasWeeks) {
          for (let wId = 1; wId <= 4; wId++) {
            target += storeTargetObj[wId] || 0;
          }
        }
      } else if (timeframe === "WTD") {
        // Use the same week ID logic as StoreInsights — based on store week ranges
        const monthName = today.toLocaleString("en-US", { month: "long" });
        const storeRanges = weeklyTargets[name] ? storeWeekRanges[name]?.[monthName] : null;
        const todayDate = today.getDate();
        let weekId = 4;
        for (const wId of [1, 2, 3, 4]) {
          const defaultStarts = [1, 8, 15, 22];
          const defaultEnds = [7, 14, 21, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()];
          let start = defaultStarts[wId - 1];
          let end = defaultEnds[wId - 1];
          if (storeRanges?.[wId]) {
            const parts = storeRanges[wId].split("-");
            if (parts.length >= 2) {
              const s = parseInt(parts[0].trim(), 10);
              const ePart = parts[1].trim().split(" ")[0];
              const e = parseInt(ePart, 10);
              if (!isNaN(s) && !isNaN(e)) { start = s; end = e; }
            }
          }
          if (todayDate >= start && todayDate <= end) { weekId = wId; break; }
        }
        target = storeTargetObj[weekId] || 0;
      } else if (timeframe === "YTD") {
        // Sum all months Jan → current
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const currentMonthIdx = today.getMonth();
        for (let i = 0; i <= currentMonthIdx; i++) {
          const mTargets = weeklyTargets[name]?.[monthNames[i]] || {};
          for (let wId = 1; wId <= 4; wId++) {
            target += mTargets[wId] || 0;
          }
        }
      }

      // ── ACHIEVED: rental + Dappr Squad + sales — matches StoreInsights consolidated ──
      const locPeriodList = performanceData[locId] || [];
      const dapprList = performanceData["25"] || [];
      const dapprForStore = dapprList.filter(item => {
        const raw = String(item.bookingBy || "").trim().toLowerCase();
        const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
        const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
        const DAPPR_MAP = {
          "sg.edappally":"3","sg.perumbavoor":"10","sg.thrissur":"11","sg.chavakkad":"12",
          "sg.calicut":"13","sg.vadakara":"14","sg.edappal":"15","sg.perinthalmanna":"16",
          "sg.kottakkal":"17","sg.manjeri":"18","sg.palakkad":"19","sg.kalpetta":"20",
          "sg.kannur":"21","sg.trivandrum":"5","sg.kottayam":"9","sg.mg road":"23","sg.edapally1":"1"
        };
        return DAPPR_MAP[raw] === locId || DAPPR_MAP[dotted] === locId;
      });

      const rentalValue = [...locPeriodList, ...dapprForStore].reduce((sum, item) => sum + (item.totalValue || 0), 0);
      const salesValue = (locCode && salesData[locCode]?.totalValue) || 0;
      const achieved = rentalValue + salesValue;

      return { name: shortName, fullName: name, target, achieved };
    });
    return list;
  }, [branches, isSingleStoreView, weeklyTargets, storeWeekRanges, employeeTargets, performanceData, salesData, timeframe, customStart, customEnd]);

  const filteredRevenue = useMemo(() => {
    if (filter === "on-track") return revenueChartData.filter(d => d.achieved >= d.target);
    if (filter === "at-risk") return revenueChartData.filter(d => d.achieved < d.target);
    return revenueChartData;
  }, [revenueChartData, filter]);

  const storeCount = chartData.length;

  return (
    <div className="bg-white dark:bg-[#111c2a] border border-[#e5e7eb] dark:border-slate-800" style={{
      width: "100%",
      borderRadius: "18px",
      padding: "20px 24px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
    }}>

      {/* ── Row 1: Title ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h3 className="text-[#111827] dark:text-[#f8fafc]" style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
              Training Progress
            </h3>
            <p className="text-[#9ca3af] dark:text-[#94a3b8]" style={{ fontSize: "12px", margin: "2px 0 0" }}>
              {getTimeframeLabel(timeframe, customStart, customEnd, storeWeekRanges)} | {storeCount} Stores
              {loadingPerf && <span style={{ marginLeft: 8, color: "#a3a3a3" }}>updating…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 2: Legend + filter tabs + buttons ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <LegendPill color="#22c55e" label="≥85% On Track" />
          <LegendPill color="#3b82f6" label="65–84% In Progress" />
          <LegendPill color="#f59e0b" label="45–64% Needs Attention" />
          <LegendPill color="#ef4444" label="<45% At Risk" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: "8px", padding: "3px" }}>
            <Tab label="All"      active={filter === "all"}      onClick={() => setFilter("all")} />
            <Tab label="On Track" active={filter === "on-track"} onClick={() => setFilter("on-track")} />
            <Tab label="At Risk"  active={filter === "at-risk"}  onClick={() => setFilter("at-risk")} />
          </div>
          <button
            onClick={async () => {
              setIsLoading(false);
              try {
                const data = await fetchHomeProgress();
                setResponseData(data);
              } finally {
                // completed refresh
              }
            }}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              border: "1px solid #e5e7eb", borderRadius: "8px",
              padding: "5px 10px", fontSize: "12px", fontWeight: 500,
              color: "#374151", background: "#fff", cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          
          <Link to="/training">
            <button style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "#111827", color: "#fff",
              border: "none", borderRadius: "8px",
              padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              View Report
            </button>
          </Link>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ flex: 1, minHeight: "280px" }}>
        {isLoading ? (
          <div style={{ width: "100%", height: "280px", background: "#f9fafb", borderRadius: "10px" }} />
        ) : filtered.length === 0 ? (
          <div style={{ width: "100%", height: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={filtered}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={filtered.length > 15 ? 16 : filtered.length > 8 ? 22 : 32}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="branchName"
                tick={<BranchTick />}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={70}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="pct" radius={[0, 0, 0, 0]}>
                {filtered.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HomeBar;
