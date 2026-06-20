/* ===================================================================
   Medfinity — Patient dashboard
=================================================================== */

const user = requireAuth(['patient']);

const ICONS = {
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  heart: '<path d="M12 21s-8-4.5-8-11a5 5 0 019-3 5 5 0 019 3c0 6.5-8 11-8 11z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

if (document.getElementById('app')){
  document.getElementById('app').innerHTML = `
    ${renderSidebar('dashboard', 'patient')}
    <main class="main">
      <header class="topbar">
        <div>
          <div class="topbar__title display">${greeting()}, ${escapeHtml(user.name?.split(' ')[0] || user.first_name || 'there')}</div>
          <div class="topbar__sub">Here's where things stand today.</div>
        </div>
        <div class="topbar__right">
          <a class="btn btn--primary" href="book_appointment.html">+ Book appointment</a>
        </div>
      </header>

      <div class="bento" id="bento">
        <section class="tile tile--peach tile--w2">
          <div class="pulse-wrap"><div class="pulse-blob"></div><div class="avatar">${initials(user.name || (user.first_name+' '+user.last_name))}</div></div>
          <h2 class="display" style="font-size:22px;margin-top:14px;">Take it one step at a time.</h2>
          <p style="color:var(--ink-soft);font-size:13.5px;margin:6px 0 0;">${formatDate(new Date())}</p>
        </section>

        <section class="tile" id="statUpcoming">
          <div class="eyebrow">Upcoming</div>
          <div class="stat__value">–</div>
          <div class="stat__label">appointments</div>
        </section>

        <section class="tile tile--ink" id="statCompleted">
          <div class="eyebrow">Completed</div>
          <div class="stat__value">–</div>
          <div class="stat__label">consultations</div>
        </section>

        <section class="tile tile--w2" id="vitalsTile">
          <div class="tile__head"><h3>Latest vitals</h3><a class="tile-link" href="health_records.html">Records →</a></div>
          <div class="vitals-grid" id="vitalsGrid">${skeletonRows(0)}</div>
        </section>

        <section class="tile tile--w2 tile--h2" id="apptTile">
          <div class="tile__head"><h3>Upcoming appointments</h3><a class="tile-link" href="book_appointment.html">Book →</a></div>
          <div class="list" id="apptList">${skeletonRows(3)}</div>
        </section>

        <section class="tile" style="background:var(--peach);border-color:transparent;">
          <div class="tile__head"><h3>Ask the AI</h3></div>
          <p style="font-size:13px;color:var(--ink-soft);flex:1;">Describe symptoms and get guidance before you book.</p>
          <a class="btn btn--primary btn--sm" href="ai_chat.html" style="align-self:flex-start;">Start chat</a>
        </section>

        <section class="tile">
          <div class="tile__head"><h3>Prescriptions</h3></div>
          <div class="list" id="rxList">${skeletonRows(2)}</div>
        </section>

        <section class="tile tile--w2" id="notifTile">
          <div class="tile__head"><h3>Notifications</h3><a class="tile-link" href="#" id="markAllRead">Mark all read</a></div>
          <div class="list" id="notifList">${skeletonRows(2)}</div>
        </section>
      </div>
    </main>
  `;

  loadDashboard();
  document.getElementById('markAllRead').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await NotificationsAPI.markAllRead(); loadNotifications(); } catch (err){ showToast(err.message, 'error'); }
  });
}

async function loadDashboard(){
  loadStats();
  loadVitals();
  loadAppointments();
  loadPrescriptions();
  loadNotifications();
}

async function loadStats(){
  try {
    const data = await UsersAPI.dashboard();
    document.querySelector('#statUpcoming .stat__value').textContent = data.upcoming_appointments ?? 0;
    document.querySelector('#statCompleted .stat__value').textContent = data.total_consultations ?? 0;
  } catch (err){
    document.querySelector('#statUpcoming .stat__value').textContent = '—';
    document.querySelector('#statCompleted .stat__value').textContent = '—';
  }
}

async function loadVitals(){
  const grid = document.getElementById('vitalsGrid');
  try {
    const v = await HealthAPI.latestVitals();
    const items = [
      ['BP', v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'],
      ['Heart rate', v.heart_rate ? `${v.heart_rate} bpm` : '—'],
      ['Temp', v.temperature ? `${v.temperature}°` : '—'],
      ['O₂ sat', v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'],
    ];
    grid.innerHTML = items.map(([lab, num]) => `
      <div class="vital"><div class="vital__num">${num}</div><div class="vital__lab">${lab}</div></div>`).join('');
  } catch {
    grid.innerHTML = `<div class="empty" style="grid-column:span 2;padding:8px;">${emptyState('No vitals logged yet', 'Add a reading from Health Records.')}</div>`;
  }
}

async function loadAppointments(){
  const list = document.getElementById('apptList');
  try {
    const data = await AppointmentsAPI.upcoming();
    const items = data.results || data;
    if (!items.length){
      list.innerHTML = emptyState('No upcoming appointments', 'Book one when you\'re ready.', icon('calendar'));
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="list-row">
        <div class="list-row__icon">${icon('calendar')}</div>
        <div class="list-row__body">
          <div class="list-row__title">Dr. ${escapeHtml(a.doctor_name || a.doctor?.toString() || '')}</div>
          <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</div>
        </div>
        <span class="badge badge--${a.status}">${a.status.replace('_',' ')}</span>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState('Couldn\'t load appointments', 'Check that the backend is running.', icon('calendar'));
  }
}

async function loadPrescriptions(){
  const list = document.getElementById('rxList');
  try {
    const data = await PrescriptionsAPI.list();
    const items = (data.results || data).slice(0, 4);
    if (!items.length){ list.innerHTML = emptyState('No prescriptions yet', '', icon('pill')); return; }
    list.innerHTML = items.map(p => `
      <div class="list-row">
        <div class="list-row__icon">${icon('pill')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(p.diagnosis || 'Prescription')}</div>
          <div class="list-row__meta">${formatDate(p.created_at)}</div>
        </div>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState('Couldn\'t load prescriptions', '', icon('pill'));
  }
}

async function loadNotifications(){
  const list = document.getElementById('notifList');
  try {
    const data = await NotificationsAPI.list();
    const items = (data.results || data).slice(0, 5);
    if (!items.length){ list.innerHTML = emptyState('You\'re all caught up', '', icon('bell')); return; }
    list.innerHTML = items.map(n => `
      <div class="list-row">
        <div class="list-row__icon">${icon('bell')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(n.title)}</div>
          <div class="list-row__meta">${escapeHtml(n.message)} · ${relativeTime(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState('Couldn\'t load notifications', '', icon('bell'));
  }
}