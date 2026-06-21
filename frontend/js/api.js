/* ===================================================================
   Medfinity — API client
   Wired to backend/config/urls.py + each app's urls.py
=================================================================== */

const API_BASE = 'http://localhost:8000/api';

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
    window.location.href = '/pages/login.html';
    return;
  }

  if (!res.ok){
    let detail = 'Something went wrong. Please try again.';
    try {
      const err = await res.json();
      detail = err.detail || err.non_field_errors?.[0] || Object.values(err)[0] || detail;
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
    window.location.href = '/pages/login.html';
  }
};

/* ---------- Users ---------- */
const UsersAPI = {
  profile:            ()          => apiCall('/users/profile/'),
  updateProfile:      (payload)   => apiCall('/users/profile/', { method: 'PATCH', body: JSON.stringify(payload) }),
  dashboard:          ()          => apiCall('/users/dashboard/'),
  doctors:            (params='') => apiCall(`/users/doctors/${params}`),
  doctorSearch:       (q)         => apiCall(`/users/doctors/?search=${encodeURIComponent(q)}`),
  doctor:             (id)        => apiCall(`/users/doctors/${id}/`),
  doctorAvailability: (id)        => apiCall(`/users/doctors/${id}/availability/`),
  pharmacists:        (params='') => apiCall(`/users/pharmacists/${params}`),
  nearbyPharmacists:  (lat, lng)  => apiCall(`/users/pharmacists/nearby/?lat=${lat}&lng=${lng}`),
};

/* ---------- Appointments ---------- */
const AppointmentsAPI = {
  list:           (params='')  => apiCall(`/appointments/${params}`),
  upcoming:       ()           => apiCall('/appointments/upcoming/'),
  detail:         (id)         => apiCall(`/appointments/${id}/`),
  create:         (payload)    => apiCall('/appointments/', { method: 'POST', body: JSON.stringify(payload) }),
  cancel:         (id)         => apiCall(`/appointments/${id}/cancel/`, { method: 'POST' }),
  updateStatus:   (id, status) => apiCall(`/appointments/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  slots:          (doctorId)   => apiCall(`/appointments/slots/${doctorId}/`),
  // Doctor: list unique patients
  patients:       ()           => apiCall('/appointments/patients/'),
  // Doctor: appointments for a specific patient
  forPatient:     (patientId)  => apiCall(`/appointments/?patient_id=${patientId}`),
};

/* ---------- Health records ---------- */
const HealthAPI = {
  records:      ()   => apiCall('/health-records/'),
  record:       (id) => apiCall(`/health-records/${id}/`),
  latestVitals: ()   => apiCall('/health-records/vitals/latest/'),
  vitals:       ()   => apiCall('/health-records/vitals/'),
};

/* ---------- Prescriptions ---------- */
const PrescriptionsAPI = {
  list:           (params='')  => apiCall(`/prescriptions/${params}`),
  detail:         (id)         => apiCall(`/prescriptions/${id}/`),
  // Doctor: prescriptions for a specific patient
  forPatient:     (patientId)  => apiCall(`/prescriptions/?patient_id=${patientId}`),
  // Doctor: create a new prescription
  create:         (payload)    => apiCall('/prescriptions/create/', { method: 'POST', body: JSON.stringify(payload) }),
};

/* ---------- Pharmacy ---------- */
const PharmacyAPI = {
  orders:             ()           => apiCall('/pharmacy/orders/'),
  order:              (id)         => apiCall(`/pharmacy/orders/${id}/`),
  createOrder:        (payload)    => apiCall('/pharmacy/orders/create/', { method: 'POST', body: JSON.stringify(payload) }),
  updateStatus:       (id, status) => apiCall(`/pharmacy/orders/${id}/status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  inventory:          ()           => apiCall('/pharmacy/inventory/'),
  addInventoryItem:   (payload)    => apiCall('/pharmacy/inventory/', { method: 'POST', body: JSON.stringify(payload) }),
  updateInventoryItem:(id, payload)=> apiCall(`/pharmacy/inventory/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteInventoryItem:(id)         => apiCall(`/pharmacy/inventory/${id}/`, { method: 'DELETE' }),
  searchMedicines:    (q)          => apiCall(`/pharmacy/search/?q=${encodeURIComponent(q)}`),
  // Patient: cancel their own pending order (uses the same retrieve/update
  // endpoint the pharmacy uses — the backend scopes it to the requester's
  // own orders either way).
  cancelOrder:        (id)         => apiCall(`/pharmacy/orders/${id}/`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
};

/* ---------- Video Consultations (Jitsi / JaaS) ---------- */
const ConsultationsAPI = {
  createRoom:  (appointmentId) => apiCall(`/consultations/room/${appointmentId}/`, { method: 'POST' }),
  joinToken:   (appointmentId) => apiCall(`/consultations/token/${appointmentId}/`),
  details:     (appointmentId) => apiCall(`/consultations/details/${appointmentId}/`),
  start:       (appointmentId) => apiCall(`/consultations/start/${appointmentId}/`, { method: 'POST' }),
  end:         (appointmentId) => apiCall(`/consultations/end/${appointmentId}/`, { method: 'POST' }),
  messages:    (consultationId) => apiCall(`/consultations/messages/${consultationId}/`),
  sendMessage: (consultationId, message) => apiCall(`/consultations/messages/${consultationId}/`, { method: 'POST', body: JSON.stringify({ message }) }),
};

/* ---------- Notifications ---------- */
const NotificationsAPI = {
  list:        ()   => apiCall('/notifications/'),
  markRead:    (id) => apiCall(`/notifications/read/${id}/`, { method: 'POST' }),
  markAllRead: ()   => apiCall('/notifications/read-all/', { method: 'POST' }),
  reminders:        ()         => apiCall('/notifications/reminders/'),
  createReminder:   (payload)  => apiCall('/notifications/reminders/', { method: 'POST', body: JSON.stringify(payload) }),
  updateReminder:   (id, payload) => apiCall(`/notifications/reminders/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteReminder:   (id)       => apiCall(`/notifications/reminders/${id}/`, { method: 'DELETE' }),
};

/* ---------- AI services ---------- */
const AiAPI = {
  checkSymptoms:  (payload) => apiCall('/ai/symptom-checker/', { method: 'POST', body: JSON.stringify(payload) }),
  chat:           (message) => apiCall('/ai/chat/', { method: 'POST', body: JSON.stringify({ message }) }),
  recommendDoctor:(payload) => apiCall('/ai/recommend-doctor/', { method: 'POST', body: JSON.stringify(payload) }),
  rankDoctors:    (payload) => apiCall('/ai/rank-doctors/', { method: 'POST', body: JSON.stringify(payload) }),
};
