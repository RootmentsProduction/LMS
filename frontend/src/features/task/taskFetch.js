import baseUrl from '../../api/api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchTasks(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category && params.category !== 'All') qs.set('category', params.category);
  if (params.priority && params.priority !== 'All') qs.set('priority', params.priority);
  if (params.status && params.status !== 'All') qs.set('status', params.status);
  if (params.mine) qs.set('mine', 'true');

  const url = `${baseUrl.baseUrl}api/task/list${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(), credentials: 'include' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load tasks');
  return json;
}


export async function createTask(payload) {
  const res = await fetch(`${baseUrl.baseUrl}api/task/save`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create task');
  return json;
}

// ── Auto Task Template API helpers ────────────────────────────────────────────

export async function createAutoTask(payload) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/save`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create auto task template');
  return json;
}

export async function fetchAutoTasks() {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/list`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load auto task templates');
  return json;
}

export async function fetchAutoTaskById(id) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/${id}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load auto task template');
  return json;
}

export async function updateAutoTask(id, payload) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update auto task template');
  return json;
}

export async function toggleAutoTask(id) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/${id}/toggle`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to toggle auto task template');
  return json;
}

export async function deleteAutoTask(id) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete auto task template');
  return json;
}

export async function generateAutoTaskNow(id, targetDate = null) {
  const res = await fetch(`${baseUrl.baseUrl}api/auto-task/${id}/generate-now`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(targetDate ? { targetDate } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to generate tasks');
  return json;
}

