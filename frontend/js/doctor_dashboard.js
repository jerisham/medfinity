/* ===================================================================
   Medfinity — Doctor dashboard
=================================================================== */

const user = requireAuth(['doctor']);

const ICONS = {
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  video: '<path d="M15 10l5-3v10l-5-3M3 6h12v12H3z"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  records: '<path d="M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z"/>',
  headset: '<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 002 2h1v-6H3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

if (document.getElementById('app')){
  const lastName = escapeHtml((user.name || user.last_name || '').split(' ').pop());
  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab') || 'dashboard';

  document.getElementById('app').innerHTML = `
    ${renderSidebar(activeTab, 'doctor')}
    <main class="main">
      ${renderTopbar({
        title: `${greeting()}, Dr. ${lastName} 👋`,
        sub: "Here's your day at a glance — your patients are counting on you.",
        user,
        hideSearch: true
      })}

      <div class="bento" id="bento" style="grid-template-columns: 2fr 1.3fr 1.3fr;">
        <section class="tile tile--peach hero-card">
          <h2 class="display">Steady hands, steady day</h2>
          <p>Review your schedule, jump into consults and keep patient care moving — all in one place.</p>
          <a class="btn btn--primary" href="video_consult.html" style="align-self:flex-start;">Start a Consult</a>
        </section>

        <section class="tile" id="nextApptTile">
          <div class="tile__head"><h3>Next Appointment</h3><a class="tile-link" href="#">View all</a></div>
          <div id="nextApptPreview">${skeletonRows(1)}</div>
        </section>

        <section class="tile cta-card" style="background:var(--peach-tint);border-color:transparent;">
          <div class="cta-card__icon">${icon('headset')}</div>
          <h3 style="margin-bottom:6px;">Video room ready</h3>
          <p style="font-size:13px;color:var(--ink-soft);flex:1;margin:0 0 14px;">Jump into your next scheduled video consultation.</p>
          <a class="btn btn--primary btn--sm" href="video_consult.html" style="align-self:flex-start;">Open Room</a>
        </section>

        <section class="tile" id="statToday">
          <div class="eyebrow">Today</div>
          <div class="stat__value">–</div>
          <div class="stat__label">appointments</div>
        </section>

        <section class="tile tile--ink" id="statPatients">
          <div class="eyebrow">Total</div>
          <div class="stat__value">–</div>
          <div class="stat__label">patients seen</div>
        </section>

        <section class="tile" id="statRating">
          <div class="eyebrow">Rating</div>
          <div class="stat__value">–</div>
          <div class="stat__label">patient rating</div>
        </section>

        <section class="tile tile--w2 tile--h2" id="apptTile">
          <div class="tile__head"><h3>Today's Schedule</h3></div>
          <div class="list" id="apptList">${skeletonRows(4)}</div>
        </section>

        <section class="tile">
          <div class="tile__head"><h3>Quick Actions</h3></div>
          <div class="qa-list">
            <a class="qa-row" href="video_consult.html">
              <div class="qa-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('video')}</div>
              <div><div class="qa-row__title">Start Video Consult</div><div class="qa-row__sub">Meet your next patient</div></div>
            </a>
            <a class="qa-row" href="patient_records.html">
              <div class="qa-row__icon" style="background:var(--blue-tint);color:#3b6fd1;">${icon('records')}</div>
              <div><div class="qa-row__title">Patient Records</div><div class="qa-row__sub">Review medical history</div></div>
            </a>
            <a class="qa-row" href="doctor_dashboard.html">
              <div class="qa-row__icon" style="background:var(--peach-tint);color:#d98a3d;">${icon('calendar')}</div>
              <div><div class="qa-row__title">Manage Schedule</div><div class="qa-row__sub">Set your availability</div></div>
            </a>
          </div>
        </section>

        <section class="tile tile--w2" id="notifTile">
          <div class="tile__head"><h3>Notifications</h3><a class="tile-link" href="#" id="markAllRead">Mark all read</a></div>
          <div class="list" id="notifList">${skeletonRows(2)}</div>
        </section>

        <section class="tile tile--ink connect-card">
          <h3 style="font-size:18px;">Built for better care</h3>
          <div class="connect-card__feature">${icon('check')} Patients you can trust</div>
          <div class="connect-card__feature">${icon('check')} Records always on hand</div>
          <div class="connect-card__feature">${icon('check')} Consults, just a click away</div>
        </section>
      </div>
    </main>
  `;

  loadDashboard();
  if (activeTab === 'appointments') {
    setTimeout(() => {
      document.getElementById('apptTile')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
  document.getElementById('markAllRead').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await NotificationsAPI.markAllRead(); loadNotifications(); } catch (err){ showToast(err.message, 'error'); }
  });
}

async function loadDashboard(){
  loadStats();
  loadSchedule();
  loadNotifications();
  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

const notifiedAppts = new Set();

function checkUpcomingReminders(items) {
  if (!items || !items.length) return;
  const now = new Date();
  
  items.forEach(a => {
    if (a.status !== 'scheduled' && a.status !== 'confirmed') return;
    
    const [year, month, day] = a.appointment_date.split('-');
    const [hour, min] = a.appointment_time.split(':');
    const apptDate = new Date(year, month - 1, day, hour, min);
    
    const diffMs = apptDate.getTime() - now.getTime();
    const diffMins = diffMs / 60000;
    
    if (diffMins > 0 && diffMins <= 10 && !notifiedAppts.has(a.id)) {
      notifiedAppts.add(a.id);
      
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(`Upcoming Appointment Reminder`, {
          body: `Your appointment with ${a.patient_name || 'Patient'} is scheduled at ${formatTime(a.appointment_time)} (${a.appointment_type === 'video' ? 'Video' : 'In-person'}).`,
          icon: '/favicon.ico'
        });
      }
      
      showToast(`Reminder: Appointment with ${a.patient_name || 'Patient'} starts at ${formatTime(a.appointment_time)}!`, 'default');
    }
  });
}

async function loadStats(){
  try {
    const data = await UsersAPI.dashboard();
    document.querySelector('#statToday .stat__value').textContent = data.today_appointments ?? 0;
    document.querySelector('#statPatients .stat__value').textContent = data.total_patients ?? 0;
    document.querySelector('#statRating .stat__value').textContent = data.rating ?? '—';
  } catch {
    ['#statToday', '#statPatients', '#statRating'].forEach(s => document.querySelector(`${s} .stat__value`).textContent = '—');
  }
}

async function loadSchedule(){
  const list = document.getElementById('apptList');
  const preview = document.getElementById('nextApptPreview');
  try {
    const data = await AppointmentsAPI.upcoming();
    const items = data.results || data;
    
    checkUpcomingReminders(items);
    
    if (!items.length){
      list.innerHTML = emptyState('Nothing on the books today', 'Enjoy the quiet.', icon('calendar'));
      preview.innerHTML = emptyState('No appointments yet', '', icon('calendar'));
      return;
    }

    const a = items[0];
    preview.innerHTML = `
      <div class="preview-row">
        <div class="avatar">${initials(a.patient_name || 'Patient')}</div>
        <div class="preview-row__body">
          <div class="preview-row__name">${escapeHtml(a.patient_name || 'Patient')}</div>
          <div class="preview-row__role">${a.appointment_type === 'video' ? 'Video consult' : 'In-person visit'}</div>
          <div class="preview-row__meta">${icon('clock')} ${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</div>
        </div>
      </div>
      <div style="margin-top:12px;"><span class="badge badge--${a.status}">${a.status.replace('_',' ')}</span></div>
    `;

    list.innerHTML = items.map(a => {
      const showComplete = (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress');
      return `
      <div class="list-row">
        <div class="list-row__icon">${icon('calendar')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(a.patient_name || 'Patient')}</div>
          <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)} · ${a.appointment_type === 'video' ? 'Video' : 'In-person'}</div>
        </div>
        <span class="badge badge--${a.status}">${a.status.replace('_',' ')}</span>
        ${showComplete ? `<button class="btn btn--primary btn--sm" data-complete="${a.id}" style="margin-left:8px; font-size:11px; padding:4px 8px;">Complete</button>` : ''}
      </div>`;
    }).join('');

    list.querySelectorAll('[data-complete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Mark this appointment as completed?')) return;
        btn.disabled = true;
        try {
          await AppointmentsAPI.updateStatus(btn.dataset.complete, 'completed');
          showToast('Appointment completed!', 'success');
          loadSchedule();
          loadStats();
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });
  } catch {
    list.innerHTML = emptyState("Couldn't load schedule", 'Check that the backend is running.', icon('calendar'));
    preview.innerHTML = emptyState("Couldn't load", '', icon('calendar'));
  }
}

// Auto-refresh stats and appointments list in real-time
setInterval(() => {
  loadSchedule();
  loadStats();
  loadNotifications();
}, 30000);

async function loadNotifications(){
  const list = document.getElementById('notifList');
  try {
    const data = await NotificationsAPI.list();
    const items = (data.results || data).slice(0, 5);
    if (!items.length){ list.innerHTML = emptyState("You're all caught up", '', icon('bell')); return; }
    list.innerHTML = items.map(n => `
      <div class="list-row">
        <div class="list-row__icon">${icon('bell')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(n.title)}</div>
          <div class="list-row__meta">${escapeHtml(n.message)} · ${relativeTime(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState("Couldn't load notifications", '', icon('bell'));
  }
}
