/* ===================================================================
   Medfinity — Shared utilities
=================================================================== */

function requireAuth(allowedTypes){
  const user = getCurrentUser();
  const dashboardByRole = {
    patient: 'patient_dashboard.html',
    doctor: 'doctor_dashboard.html',
    pharmacist: 'pharmacy_dashboard.html',
  };

  if (!getAccessToken() || !user){
    window.location.href = pageUrl('login.html');
    return null;
  }
  if (allowedTypes && !allowedTypes.includes(user.user_type)){
    window.location.href = pageUrl(dashboardByRole[user.user_type] || 'patient_dashboard.html');
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
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  return `<div class="empty">${iconSvg || ''}<div class="empty__title">${title}</div><div class="empty__sub">${sub}</div></div>`;
}

/** Renders the sidebar nav for the given role + active page key. */
function renderSidebar(activeKey, role){
  const links = {
    patient: [
      ['dashboard', 'patient_dashboard.html', 'M3 11l9-8 9 8M5 10v10h14V10'],
      ['book', 'book_appointment.html', 'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z'],
      ['records', 'health_records.html', 'M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z'],
      ['ai', 'ai_chat.html', 'M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2'],
    ],
    doctor: [
      ['dashboard', 'doctor_dashboard.html', 'M3 11l9-8 9 8M5 10v10h14V10'],
      ['video', 'video_consult.html', 'M15 10l5-3v10l-5-3M3 6h12v12H3z'],
      ['records', 'health_records.html', 'M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z'],
    ],
    pharmacist: [
      ['dashboard', 'pharmacy_dashboard.html', 'M3 11l9-8 9 8M5 10v10h14V10'],
    ],
  };
  const items = links[role] || links.patient;
  return `
    <aside class="sidebar">
      <div class="sidebar__mark">M</div>
      <nav class="sidebar__nav">
        ${items.map(([key, href, path]) => `
          <a class="sidebar__link${key === activeKey ? ' is-active' : ''}" href="${href}" title="${key}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>
          </a>`).join('')}
      </nav>
      <button class="sidebar__logout" onclick="Auth.logout()" title="Log out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      </button>
    </aside>`;
}
