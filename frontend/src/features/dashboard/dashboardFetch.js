import baseUrl from "../../api/api";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function fetchJson(path) {
  const res = await fetch(`${baseUrl.baseUrl}${path}`, {
    headers: authHeaders(),
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;
}

const pad2 = (n) => String(n).padStart(2, "0");

const toDateOnly = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getPresetDateRange = (range) => {
  const today = new Date();
  const key = String(range || "7");

  if (key === "7") {
    // Current week: Sunday through today
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { startDate: toDateOnly(start), endDate: toDateOnly(today) };
  }

  if (key === "14" || key === "45") {
    const totalDays = Number(key);
    const start = new Date(today);
    start.setDate(today.getDate() - (totalDays - 1));
    return { startDate: toDateOnly(start), endDate: toDateOnly(today) };
  }

  return null;
};

const buildWalkinChartPath = ({ range, startDate, endDate, chartOnly }) => {
  const useCustomRange = String(range) === "custom";
  const preset = getPresetDateRange(range);
  const start = useCustomRange && normalizeDate(startDate) ? toDateOnly(normalizeDate(startDate)) : preset?.startDate;
  const end = useCustomRange && normalizeDate(endDate) ? toDateOnly(normalizeDate(endDate)) : preset?.endDate;

  if (!start || !end) {
    throw new Error("A valid date range is required");
  }

  return `api/walkin/list?startDate=${start}&endDate=${end}&${chartOnly ? "chartOnly=true" : "dashboard=true"}`;
};

export function fetchHomeProgress() {
  return fetchJson("api/admin/get/HomeProgressSummary");
}

export function fetchHomeProgressChart() {
  return fetchJson("api/admin/get/HomeProgressData");
}

export function fetchDashboardTasks() {
  return fetchJson("api/task/list");
}

export function fetchWeeklyWalkins(daysCount = 7) {
  // Dashboard needs the full matching range, not a paginated slice.
  return fetchJson(buildWalkinChartPath({ range: daysCount, chartOnly: false }));
}

export function fetchDailyWalkinsChart({ range = "7", startDate, endDate } = {}) {
  return fetchJson(buildWalkinChartPath({ range, startDate, endDate, chartOnly: true }));
}

export function fetchWeeklyWalkinCount({ range = "7", startDate, endDate } = {}) {
  const useCustomRange = String(range) === "custom";
  const preset = getPresetDateRange(range);
  const start = useCustomRange && normalizeDate(startDate) ? toDateOnly(normalizeDate(startDate)) : preset?.startDate;
  const end = useCustomRange && normalizeDate(endDate) ? toDateOnly(normalizeDate(endDate)) : preset?.endDate;

  if (!start || !end) {
    throw new Error("A valid date range is required");
  }

  return fetchJson(`api/walkin/list?startDate=${start}&endDate=${end}&countOnly=true`);
}

export function fetchBestThreeUsers() {
  return fetchJson("api/admin/get/bestThreeUser");
}

export function fetchStoreManagerData() {
  return fetchJson("api/admin/get/storemanagerData");
}

export function fetchStoreManagerDueData() {
  return fetchJson("api/admin/get/storemanagerduedata");
}

export function fetchNotifications() {
  return fetchJson("api/admin/home/notification");
}

export function fetchLMSStats() {
  return fetchJson("api/lms-login/count-simple");
}
