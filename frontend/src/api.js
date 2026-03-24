// Em produção aponta pro Railway, local usa proxy Vite
const BASE = window.location.protocol === 'file:'
  ? 'http://localhost:8000'
  : window.location.hostname === 'localhost'
    ? '/api'
    : 'https://meutico-production.up.railway.app'

function getToken() {
  return localStorage.getItem('mt_token') || ''
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    localStorage.removeItem('mt_token')
    window.location.reload()
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erro ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  login: (username, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(r => r.json()),

  health: () => request('GET', '/health'),
  getRoots: () => request('GET', '/roots'),
  addRoot: (path, label) => request('POST', '/roots', { path, label }),
  deleteRoot: (id) => request('DELETE', `/roots/${id}`),
  scan: () => request('POST', '/scan'),
  getFiles: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/files${q ? '?' + q : ''}`)
  },
  detectDuplicates: () => request('POST', '/duplicates'),
  getRecommendations: () => request('GET', '/recommendations'),
  getAgent: () => request('GET', '/agent'),
  prepare: (fileIds) => request('POST', '/execute/prepare', { file_ids: fileIds }),
  commit: (fileIds) => request('POST', '/execute/commit', { file_ids: fileIds }),
  rollback: (auditIds) => request('POST', '/execute/rollback', { audit_log_ids: auditIds }),
  getAuditLog: () => request('GET', '/audit-log'),
  pickFolder: () => request('GET', '/pick-folder'),
  browse: (path = '') => request('GET', `/browse${path ? '?path=' + encodeURIComponent(path) : ''}`),
  search: (query, files = null) => request('POST', '/search', { query, files }),
  getSchedules: () => request('GET', '/schedules'),
  addSchedule: (job_id, interval, label, source_path, folder_id) =>
    request('POST', '/schedules', { job_id, interval, label, source_path, folder_id }),
  deleteSchedule: (job_id) => request('DELETE', `/schedules/${job_id}`),
  cloudStatus: () => request('GET', '/cloud/status'),
  cloudAuthUrl: () => request('GET', '/cloud/auth-url'),
  cloudFolders: () => request('GET', '/cloud/folders'),
  cloudUpload: (body) => request('POST', '/cloud/upload', body),
  cloudJobs: () => request('GET', '/cloud/jobs'),
}
