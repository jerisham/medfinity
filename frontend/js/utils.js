/* ===================================================================
   Medfinity — Shared utilities
=================================================================== */

function requireAuth(allowedTypes){
  const user = getCurrentUser();
  if (!getAccessToken() || !user){
    window.location.href = '/pages/login.html';
    return null;
  }
  if (allowedTypes && !allowedTypes.includes(user.user_type)){
    const type = user.user_type === 'pharmacist' ? 'pharmacy'
               : user.user_type === 'caregiver'   ? 'patient'
               : user.user_type;
    window.location.href = `/pages/${type}_dashboard.html`;
    return null;
  }
  return user;
}

function initials(name){
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0,2).map(p => p[0]?.toUpperCase()).join('');
}

function greeting(){
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr){
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr){
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function relativeTime(dateStr){
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function escapeHtml(str=''){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(message, type = 'default'){
  const el = document.createElement('div');
  el.className = `toast${type !== 'default' ? ' toast--' + type : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function skeletonRows(n = 3){
  return Array.from({length:n}).map(() => `
    <div class="list-row">
      <div class="skeleton" style="width:36px;height:36px;border-radius:10px;"></div>
      <div style="flex:1">
        <div class="skeleton skel-line" style="width:70%"></div>
        <div class="skeleton skel-line" style="width:40%;height:9px;"></div>
      </div>
    </div>`).join('');
}

function emptyState(title, sub, iconSvg){
  return `<div class="empty">${iconSvg || ''}<div class="empty__title">${title}</div><div class="empty__sub">${sub || ''}</div></div>`;
}

/** Renders the sidebar nav for the given role + active page key. */
function renderSidebar(activeKey, role){
  const links = {
    patient: [
      ['dashboard',      'patient_dashboard.html', 'M3 11l9-8 9 8M5 10v10h14V10',                                                                  'Dashboard'],
      ['video',          'video_consult.html',      'M15 10l5-3v10l-5-3M3 6h12v12H3z',                                                              'Video Consult'],
      ['appointments',   'appointments.html',       'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',       'Appointments'],
      ['doctors',        'doctors.html',            'M16 11a4 4 0 10-8 0M2 21a8 8 0 0116 0',                                                         'Doctors'],
      ['prescriptions',  'prescriptions.html',      'M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6zM9 12h6M9 16h4',                                         'Prescriptions'],
      ['orders',         'orders.html',             'M21 8l-9-5-9 5 9 5 9-5z M3 8v8l9 5 9-5V8M12 13v8',                                              'My Orders'],
      ['reminders',      'reminders.html',          'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                                                  'Reminders'],
      ['records',        'health_records.html',     'M3 12h4l3 8 4-16 3 8h4',                                                                        'Health Records'],
      ['ai',             'ai_chat.html',            'M21 11.5a8.4 8.4 0 01-1.1 4.2L21 21l-5.4-1.4a8.5 8.5 0 11-1.6-12.1',                           'AI Chat'],
    ],
    doctor: [
      ['dashboard',      'doctor_dashboard.html',   'M3 11l9-8 9 8M5 10v10h14V10',                                                                  'Dashboard'],
      ['video',          'video_consult.html',      'M15 10l5-3v10l-5-3M3 6h12v12H3z',                                                              'Video Consult'],
      ['appointments',   'doctor_appointments.html', 'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',       'Appointments'],
      ['records',        'patient_records.html',    'M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z',                                                       'Patient Records'],
    ],
    pharmacist: [
      ['dashboard',      'pharmacy_dashboard.html', 'M3 11l9-8 9 8M5 10v10h14V10',                                                                  'Dashboard'],
      ['orders',         'pharmacy_dashboard.html?tab=orders', 'M21 8l-9-5-9 5 9 5 9-5z M3 8v8l9 5 9-5V8M12 13v8',                                    'Orders'],
      ['inventory',      'pharmacy_dashboard.html?tab=inventory', 'M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z M8 8l5 5',                       'Inventory'],
    ],
  };
  const items = links[role] || links.patient;
  return `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__mark">
          <span style="font-family:var(--font-display);font-weight:900;font-size:20px;color:#fff;letter-spacing:-1px;">M</span>
        </div>
        <div class="sidebar__brand-text">
          <div class="sidebar__brand-name">Medfinity</div>
          <div class="sidebar__brand-tag">Care. Connect. Comfort.</div>
        </div>
      </div>
      <nav class="sidebar__nav">
        ${items.map(([key, href, path, label]) => `
          <a class="sidebar__link${key === activeKey ? ' is-active' : ''}" href="${href}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>
            <span>${label}</span>
          </a>`).join('')}
      </nav>
      <div class="sidebar__footer">
        <div class="sidebar__footer-title">Better health every day</div>
        <div class="sidebar__footer-sub">Small steps today for a healthier tomorrow.</div>
      </div>
      <button class="sidebar__logout" onclick="Auth.logout()" title="Log out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        <span>Log out</span>
      </button>
    </aside>`;
}

/**
 * Renders the topbar: title/sub on the left, optional search + bell + profile on the right.
 * Pass hideSearch:true for pages where the global doctor/pharmacy search bar should not appear.
 */
function renderTopbar({ title, sub, user, notifCount = 0, rightContent = '', hideSearch = false }){
  const roleLabel = { patient: 'Patient', doctor: 'Doctor', pharmacist: 'Pharmacy' }[user?.user_type] || 'Member';
  const displayName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'there';
  const searchBar = hideSearch ? '' : `
    <div class="topbar__search" id="globalSearchWrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="globalSearch" placeholder="Search doctors, specialties…" autocomplete="off">
    </div>`;
  return `
    <header class="topbar">
      <div>
        <div class="topbar__title display">${title}</div>
        <div class="topbar__sub">${sub}</div>
      </div>
      ${searchBar}
      <div class="topbar__right">
        ${rightContent}
        <div class="topbar__bell">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
          ${notifCount > 0 ? `<span class="topbar__bell-dot">${notifCount}</span>` : ''}
        </div>
        <a class="topbar__profile" href="profile.html" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
          <div class="avatar avatar--sm">${initials(displayName)}</div>
          <div>
            <div class="topbar__profile-name">${escapeHtml(displayName)}</div>
            <div class="topbar__profile-role">${roleLabel}</div>
          </div>
        </a>
      </div>
    </header>`;
}

/** Wire the global topbar search to navigate to doctors.html with query param */
function initGlobalSearch(){
  const input = document.getElementById('globalSearch');
  if (!input) return;
  // Pre-fill from URL param if on doctors page
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) input.value = q;

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter'){
      const val = input.value.trim();
      if (val) window.location.href = `doctors.html?q=${encodeURIComponent(val)}`;
    }
  });
  // Also show live search hint on input
  input.addEventListener('input', () => {
    if (input.value.trim().length > 1){
      input.style.borderColor = 'var(--emerald)';
    } else {
      input.style.borderColor = '';
    }
  });
}

// Auto-init global search after DOM is ready
document.addEventListener('DOMContentLoaded', () => initGlobalSearch());
// Also init immediately if DOM already loaded (since scripts are deferred inline)
if (document.readyState !== 'loading') {
  setTimeout(initGlobalSearch, 50);
}