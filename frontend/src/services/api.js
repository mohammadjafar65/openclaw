/* ══════════════════════════════════════════════════════════
   OpenClaw — API Service Layer
   Centralized fetch wrapper with JWT auth
   ══════════════════════════════════════════════════════════ */

const BASE = process.env.REACT_APP_API_URL || '/openclaw/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem('oc_token');
}

function setToken(token) {
  localStorage.setItem('oc_token', token);
}

function clearToken() {
  localStorage.removeItem('oc_token');
}

async function request(method, path, body = null, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    method,
    headers,
    ...options,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, config);

  if (res.status === 401) {
    clearToken();
    window.location.href = '/openclaw/login';
    throw new ApiError('Unauthorized', 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || data.message || 'Request failed', res.status, data);
  }

  return data;
}

const api = {
  get:    (path) => request('GET', path),
  post:   (path, body) => request('POST', path, body),
  put:    (path, body) => request('PUT', path, body),
  patch:  (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),

  // ── Auth ──────────────────────────────────────────────
  auth: {
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    register: (data) => request('POST', '/auth/register', data),
    me: () => request('GET', '/auth/me'),
  },

  // ── Dashboard / Analytics ─────────────────────────────
  analytics: {
    overview:       (params) => request('GET', `/analytics/overview${qs(params)}`),
    funnel:         () => request('GET', '/analytics/funnel'),
    auditDist:      () => request('GET', '/analytics/audit-distribution'),
    discoveryTrend: (period) => request('GET', `/analytics/discovery-trend?period=${period || '30d'}`),
    nicheBreakdown: () => request('GET', '/analytics/niche-breakdown'),
    geoBreakdown:   () => request('GET', '/analytics/geo-breakdown'),
    campaignPerf:   () => request('GET', '/analytics/campaign-performance'),
    templatePerf:   () => request('GET', '/analytics/template-performance'),
    activityFeed:   (limit) => request('GET', `/analytics/activity-feed?limit=${limit || 30}`),
    pipelineValue:  () => request('GET', '/analytics/pipeline-value'),
  },

  // ── Leads ─────────────────────────────────────────────
  leads: {
    list:   (params) => request('GET', `/leads${qs(params)}`),
    get:    (id) => request('GET', `/leads/${id}`),
    update: (id, data) => request('PUT', `/leads/${id}`, data),
    delete: (id) => request('DELETE', `/leads/${id}`),
    export: (params) => request('GET', `/leads/export${qs(params)}`),
  },

  // ── Scraper ───────────────────────────────────────────
  scraper: {
    search:     (data) => request('POST', '/scraper/search', data),
    status:     () => request('GET', '/scraper/status'),
    categories: () => request('GET', '/scraper/categories'),
  },

  // ── Campaigns ─────────────────────────────────────────
  campaigns: {
    list:   () => request('GET', '/campaigns'),
    get:    (id) => request('GET', `/campaigns/${id}`),
    create: (data) => request('POST', '/campaigns', data),
    update: (id, data) => request('PUT', `/campaigns/${id}`, data),
    delete: (id) => request('DELETE', `/campaigns/${id}`),
    start:  (id) => request('POST', `/campaigns/${id}/start`),
    pause:  (id) => request('POST', `/campaigns/${id}/pause`),
  },

  // ── Audit ─────────────────────────────────────────────
  audit: {
    run:    (leadId) => request('POST', `/audit/run/${leadId}`),
    batch:  (leadIds) => request('POST', '/audit/batch', { leadIds }),
    get:    (leadId) => request('GET', `/audit/lead/${leadId}`),
    queue:  () => request('GET', '/audit/queue'),
    stats:  () => request('GET', '/audit/stats'),
  },

  // ── CRM Pipeline ─────────────────────────────────────
  crm: {
    stages:      () => request('GET', '/crm/stages'),
    pipeline:    (params) => request('GET', `/crm/pipeline${qs(params)}`),
    moveStage:   (leadId, stage) => request('PUT', `/crm/stage/${leadId}`, { stage }),
    assignLead:  (leadId, userId) => request('PUT', `/crm/assign/${leadId}`, { assigned_to: userId }),
    setDeal:     (leadId, value) => request('PUT', `/crm/deal-value/${leadId}`, { deal_value: value }),
    leadDetail:  (leadId) => request('GET', `/crm/lead/${leadId}`),
    addNote:     (leadId, data) => request('POST', `/crm/notes/${leadId}`, data),
    addTask:     (leadId, data) => request('POST', `/crm/tasks/${leadId}`, data),
    completeTask:(taskId) => request('PUT', `/crm/tasks/${taskId}/complete`),
    setTags:     (leadId, tags) => request('PUT', `/crm/tags/${leadId}`, { tags }),
    forecast:    () => request('GET', '/crm/forecast'),
  },

  // ── Personalization ───────────────────────────────────
  personalize: {
    coldEmail:  (leadId, data) => request('POST', `/personalize/cold-email/${leadId}`, data),
    followUp:   (leadId, data) => request('POST', `/personalize/follow-up/${leadId}`, data),
    whatsapp:   (leadId, data) => request('POST', `/personalize/whatsapp/${leadId}`, data),
    callScript: (leadId) => request('POST', `/personalize/call-script/${leadId}`),
    sequence:   (leadId, data) => request('POST', `/personalize/full-sequence/${leadId}`, data),
    subjects:   (leadId, data) => request('POST', `/personalize/subject-variants/${leadId}`, data),
  },

  // ── Compliance ────────────────────────────────────────
  compliance: {
    suppression:     (params) => request('GET', `/compliance/suppression${qs(params)}`),
    addSuppression:  (data) => request('POST', '/compliance/suppression', data),
    bulkSuppress:    (emails) => request('POST', '/compliance/suppression/bulk', { emails }),
    removeSuppression: (id) => request('DELETE', `/compliance/suppression/${id}`),
    traceability:    (leadId) => request('GET', `/compliance/traceability/${leadId}`),
    stats:           () => request('GET', '/compliance/stats'),
  },

  // ── Team ──────────────────────────────────────────────
  team: {
    list:       () => request('GET', '/team'),
    invite:     (data) => request('POST', '/team/invite', data),
    changeRole: (userId, role) => request('PUT', `/team/${userId}/role`, { role }),
    deactivate: (userId) => request('PUT', `/team/${userId}/deactivate`),
    activate:   (userId) => request('PUT', `/team/${userId}/activate`),
  },

  // ── Outreach ──────────────────────────────────────────
  outreach: {
    sequences:  () => request('GET', '/outreach/sequences'),
    send:       (data) => request('POST', '/outreach/send', data),
    inbox:      (params) => request('GET', `/outreach/inbox${qs(params)}`),
    reply:      (threadId, data) => request('POST', `/outreach/reply/${threadId}`, data),
  },

  // ── Settings ──────────────────────────────────────────
  settings: {
    get:    () => request('GET', '/settings'),
    update: (data) => request('PUT', '/settings', data),
  },
};

/* Query string builder */
function qs(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export { api, setToken, clearToken, getToken, ApiError };
export default api;
