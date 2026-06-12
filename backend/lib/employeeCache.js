import axios from 'axios';

const ROOTMENTS_API_TOKEN = process.env.ROOTMENTS_API_TOKEN || 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
const EXTERNAL_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PROCESSED_TTL_MS = 3 * 60 * 1000;  // 3 minutes

let externalCache = { data: [], ts: 0 };
let externalFetchPromise = null;
const processedCache = new Map();

export const isExternalCacheFresh = () =>
  externalCache.data.length > 0 && Date.now() - externalCache.ts < EXTERNAL_TTL_MS;

export async function refreshExternalEmployees(force = false) {
  if (!force && isExternalCacheFresh()) return externalCache.data;
  if (externalFetchPromise) return externalFetchPromise;

  externalFetchPromise = axios
    .post(
      'https://rootments.in/api/employee_range',
      { startEmpId: 'EMP1', endEmpId: 'EMP9999' },
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    )
    .then((response) => {
      externalCache = { data: response.data?.data || [], ts: Date.now() };
      processedCache.clear();
      return externalCache.data;
    })
    .catch(() => externalCache.data || [])
    .finally(() => {
      externalFetchPromise = null;
    });

  return externalFetchPromise;
}

/** Returns cached external employees; refreshes in background if stale. */
export function getExternalEmployeesNonBlocking() {
  if (!isExternalCacheFresh()) {
    refreshExternalEmployees().catch(() => {});
  }
  return externalCache.data || [];
}

export function getProcessedCacheKey(adminId, allowedLocCodes, isGlobalAdmin) {
  return `${adminId}:${isGlobalAdmin ? 'all' : allowedLocCodes.slice().sort().join(',')}`;
}

export function getProcessedEmployees(cacheKey) {
  const entry = processedCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.ts > PROCESSED_TTL_MS) {
    processedCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setProcessedEmployees(cacheKey, data) {
  processedCache.set(cacheKey, { data, ts: Date.now() });
}

export function clearEmployeeCaches() {
  externalCache = { data: [], ts: 0 };
  processedCache.clear();
}
