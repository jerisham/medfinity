/* ===================================================================
   Medfinity — API client
   Wired to backend/config/urls.py + each app's urls.py
=================================================================== */

const API_BASE = 'http://127.0.0.1:8000/api';

function pageUrl(pageName){
  return window.location.pathname.includes('/pages/')
    ? pageName
    : `pages/${pageName}`;
}

function getAccessToken(){ return localStorage.getItem('medfinity_access'); }
function getRefreshToken(){ return localStorage.getItem('medfinity_refresh'); }
function setTokens(access, refresh){
  localStorage.setItem('medfinity_access', access);
  if (refresh) localStorage.setItem('medfinity_refresh', refresh);
}
function setCurrentUser(user){ localStorage.setItem('medfinity_user', JSON.stringify(user)); }
function getCurrentUser(){
  try { return JSON.parse(localStorage.getItem('medfinity_user') || 'null'); }
  catch { return null; }
}
function clearSession(){
  localStorage.removeItem('medfinity_access');
  localStorage.removeItem('medfinity_refresh');
  localStorage.removeItem('medfinity_user');
}

async function refreshAccessToken(){
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  });
  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.access, null);
  return true;
}

/**
 * Core request helper. Auto-attaches JWT, retries once on 401 after refresh.
 */
async function apiCall(endpoint, options = {}, _retry = true){
  const token = getAccessToken();
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(!isForm && { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (res.status === 401 && _retry){
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiCall(endpoint, options, false);
    clearSession();
    window.location.href = pageUrl('login.html');
    return;
  }

  if (!res.ok){
    let detail = 'Something went wrong. Please try again.';
    try {
      const err = await res.json();
      detail = err.detail || Object.values(err)[0] || detail;
      if (Array.isArray(detail)) detail = detail[0];
    } catch {}
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

/* ---------- Auth ---------- */
const Auth = {
  async login(username, password){
    const res = await fetch(`${API_BASE}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Incorrect username or password.');
    const data = await res.json();
    setTokens(data.access, data.refresh);
    const profile = await apiCall('/users/profile/');
    setCurrentUser(profile);
    return profile;
  },
  async register(payload){
    return apiCall('/users/register/', { method: 'POST', body: JSON.stringify(payload) });
  },
  logout(){
    clearSession();
    window.location.href = pageUrl('login.html');
  }
};

/* ---------- Users ---------- */
const UsersAPI = {
  profile: () => apiCall('/users/profile/'),
  dashboard: () => apiCall('/users/dashboard/'),
  doctors: (params = '') => apiCall(`/users/doctors/${params}`),
  doctor: (id) => apiCall(`/users/doctors/${id}/`),
  patient: (id) => apiCall(`/users/patients/${id}/`),
  doctorAvailability: (id) => apiCall(`/users/doctors/${id}/availability/`),
};

/* ---------- Appointments ---------- */
const AppointmentsAPI = {
  list: () => apiCall('/appointments/'),
  upcoming: () => apiCall('/appointments/upcoming/'),
  detail: (id) => apiCall(`/appointments/${id}/`),
  create: (payload) => apiCall('/appointments/', { method: 'POST', body: JSON.stringify(payload) }),
  cancel: (id) => apiCall(`/appointments/${id}/cancel/`, { method: 'POST' }),
  slots: (doctorId) => apiCall(`/appointments/slots/${doctorId}/`),
};

/* ---------- Health records ---------- */
const HealthAPI = {
  records: () => apiCall('/health-records/'),
  record: (id) => apiCall(`/health-records/${id}/`),
  latestVitals: () => apiCall('/health-records/vitals/latest/'),
  vitals: () => apiCall('/health-records/vitals/'),
};

/* ---------- Prescriptions ---------- */
const PrescriptionsAPI = {
  list: () => apiCall('/prescriptions/'),
  detail: (id) => apiCall(`/prescriptions/${id}/`),
};

/* ---------- Pharmacy ---------- */
const PharmacyAPI = {
  orders: () => apiCall('/pharmacy/orders/'),
  order: (id) => apiCall(`/pharmacy/orders/${id}/`),
  updateStatus: (id, status) => apiCall(`/pharmacy/orders/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  inventory: () => apiCall('/pharmacy/inventory/'),
  searchMedicines: (q) => apiCall(`/pharmacy/search/?q=${encodeURIComponent(q)}`),
};

/* ---------- Notifications ---------- */
const NotificationsAPI = {
  list: () => apiCall('/notifications/'),
  markRead: (id) => apiCall(`/notifications/read/${id}/`, { method: 'POST' }),
  markAllRead: () => apiCall('/notifications/read-all/', { method: 'POST' }),
  reminders: () => apiCall('/notifications/reminders/'),
};

/* ---------- AI services ---------- */
const AiAPI = {
  checkSymptoms: (payload) => apiCall('/ai/symptom-checker/', { method: 'POST', body: JSON.stringify(payload) }),
  chat: (message) => apiCall('/ai/chat/', { method: 'POST', body: JSON.stringify({ message }) }),
  recommendDoctor: (payload) => apiCall('/ai/recommend-doctor/', { method: 'POST', body: JSON.stringify(payload) }),
};
