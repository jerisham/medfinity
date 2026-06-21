/* ===================================================================
   Medfinity — Doctor Appointments
   Lets a doctor view, filter and manage their own appointment queue
   (confirm, start, complete, mark no-show, or cancel).
=================================================================== */

const user = requireAuth(['doctor']);

const ICONS = {
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  video: '<path d="M15 10l5-3v10l-5-3M3 6h12v12H3z"/>',
  records: '<path d="M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const FILTERS = [
  { key: 'upcoming',  label: 'Upcoming',  test: a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status) },
  { key: 'completed', label: 'Completed', test: a => a.status === 'completed' },
  { key: 'cancelled', label: 'Cancelled / No-show', test: a => ['cancelled', 'no_show'].includes(a.status) },
  { key: 'all',       label: 'All', test: () => true },
];

let allAppointments = [];
let activeFilter = 'upcoming';

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('appointments', 'doctor')}
    <main class="main">
      ${renderTopbar({
        title: 'Appointments',
        sub: 'Manage your schedule — confirm, start, complete or cancel visits.',
        user,
        hideSearch: true
      })}

      <div class="bento" style="grid-template-columns:1fr; gap:20px;">
        <section class="tile" style="padding:20px 24px;">
          <div class="tile__head" style="margin-bottom:6px;"><h3>Your Appointment Queue</h3><span class="tile-link" id="apptCount"></span></div>
          <div class="filter-tabs" id="apptFilters" style="margin:14px 0 18px;"></div>
          <div class="list" id="apptList">${skeletonRows(5)}</div>
        </section>
      </div>
    </main>
  `;

  initPage();
}

function initPage() {
  loadAppointments();
}

async function loadAppointments() {
  const list = document.getElementById('apptList');
  try {
    const data = await AppointmentsAPI.list();
    allAppointments = data.results || data;
    renderFilters();
    renderList();
  } catch (err) {
    list.innerHTML = emptyState("Couldn't load appointments", err.message, icon('calendar'));
  }
}

function renderFilters() {
  const wrap = document.getElementById('apptFilters');
  wrap.innerHTML = FILTERS.map(f => {
    const n = allAppointments.filter(f.test).length;
    return `<button type="button" class="filter-tab${f.key === activeFilter ? ' is-active' : ''}" data-f="${f.key}">${f.label} <span class="count">${n}</span></button>`;
  }).join('');
  wrap.querySelectorAll('[data-f]').forEach(btn => {
    btn.addEventListener('click', () => { activeFilter = btn.dataset.f; renderFilters(); renderList(); });
  });
}

function renderList() {
  const list = document.getElementById('apptList');
  const countEl = document.getElementById('apptCount');
  const filterDef = FILTERS.find(f => f.key === activeFilter) || FILTERS[0];
  const items = allAppointments.filter(filterDef.test)
    .sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`));
  countEl.textContent = `${allAppointments.length} total`;

  if (!items.length) {
    list.innerHTML = emptyState('Nothing here', 'Appointments matching this filter will show up here.', icon('calendar'));
    return;
  }

  list.innerHTML = items.map(a => {
    const actions = [];
    if (a.status === 'scheduled') actions.push(`<button class="btn btn--sage btn--sm" data-status="${a.id}" data-next="confirmed">Confirm</button>`);
    if (a.status === 'scheduled' || a.status === 'confirmed') actions.push(`<button class="btn btn--ghost btn--sm" data-status="${a.id}" data-next="in_progress">Start</button>`);
    if (['scheduled', 'confirmed', 'in_progress'].includes(a.status)) actions.push(`<button class="btn btn--primary btn--sm" data-status="${a.id}" data-next="completed">Complete</button>`);
    if (['scheduled', 'confirmed'].includes(a.status)) actions.push(`<button class="btn btn--ghost btn--sm" data-status="${a.id}" data-next="no_show">No-show</button>`);
    if (['scheduled', 'confirmed'].includes(a.status)) actions.push(`<button class="btn btn--ghost btn--sm" data-cancel="${a.id}" style="border-color:var(--danger);color:var(--danger);">Cancel</button>`);
    if (a.appointment_type === 'video' && ['confirmed', 'in_progress'].includes(a.status)) actions.push(`<a class="btn btn--sage btn--sm" href="video_consult.html">${icon('video','style="width:13px;height:13px;"')} Join</a>`);

    return `
    <div class="list-row" style="align-items:flex-start;flex-wrap:wrap;gap:14px;padding:16px 6px;">
      <div class="list-row__icon">${icon('calendar')}</div>
      <div class="list-row__body" style="flex:1 1 220px;">
        <div class="list-row__title">${escapeHtml(a.patient_name || 'Patient')}</div>
        <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)} · ${a.appointment_type === 'video' ? 'Video' : 'In-person'}</div>
        ${a.symptoms ? `<div class="list-row__meta" style="margin-top:2px;">Reason: ${escapeHtml(a.symptoms)}</div>` : ''}
      </div>
      <span class="badge badge--${a.status}">${a.status.replace(/_/g,' ')}</span>
      <a class="btn btn--ghost btn--sm" href="patient_records.html?patient=${a.patient_id}">${icon('records','style="width:13px;height:13px;"')} Records</a>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${actions.join('')}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await AppointmentsAPI.updateStatus(btn.dataset.status, btn.dataset.next);
        showToast('Appointment updated', 'success');
        loadAppointments();
      } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
    });
  });
  list.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this appointment?')) return;
      btn.disabled = true;
      try {
        await AppointmentsAPI.cancel(btn.dataset.cancel);
        showToast('Appointment cancelled', 'default');
        loadAppointments();
      } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
    });
  });
}
