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
  headset: '<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 002 2h1v-6H3z"/>',
  pin: '<path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  upload: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  records: '<path d="M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  doctor: '<circle cx="11" cy="6" r="3"/><path d="M5 21v-2a6 6 0 0112 0v2"/><path d="M19 8l2 2-4 4"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;


if (document.getElementById('app')){
  const firstName = escapeHtml(user.name?.split(' ')[0] || user.first_name || 'there');
  document.getElementById('app').innerHTML = `
    ${renderSidebar('dashboard', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: `${greeting()}, ${firstName} 👋`,
        sub: "Your health, our priority. Let's take care of you today.",
        user
      })}

      <div class="bento" id="bento" style="grid-template-columns: 2fr 1.3fr 1.3fr;">
        <section class="tile tile--peach hero-card tile--w2" style="grid-column: span 1;">
          <h2 class="display">Quality care when you need it</h2>
          <p>Book appointments, consult doctors, order medicines and manage your health — all in one place.</p>
          <a class="btn btn--primary" href="book_appointment.html" style="align-self:flex-start;">+ Book Appointment</a>
        </section>

        <section class="tile" id="apptTile">
          <div class="tile__head"><h3>Upcoming Appointment</h3><a class="tile-link" href="book_appointment.html">View all</a></div>
          <div id="apptPreview">${skeletonRows(1)}</div>
        </section>

        <section class="tile cta-card" style="background:var(--peach-tint);border-color:transparent;">
          <div class="cta-card__icon">${icon('headset')}</div>
          <h3 style="margin-bottom:6px;">Need help choosing?</h3>
          <p style="font-size:13px;color:var(--ink-soft);flex:1;margin:0 0 14px;">We'll help you find the right doctor for your concern.</p>
          <a class="btn btn--primary btn--sm" href="ai_chat.html" style="align-self:flex-start;">Find My Doctor</a>
        </section>

        <section class="tile">
          <div class="tile__head"><h3>Quick Actions</h3></div>
          <div class="qa-list">
            <a class="qa-row" href="book_appointment.html">
              <div class="qa-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('calendar')}</div>
              <div><div class="qa-row__title">Book Appointment</div><div class="qa-row__sub">Schedule with doctors</div></div>
            </a>
            <a class="qa-row" href="health_records.html">
              <div class="qa-row__icon" style="background:var(--peach-tint);color:#d98a3d;">${icon('upload')}</div>
              <div><div class="qa-row__title">Upload Prescription</div><div class="qa-row__sub">Get medicines easily</div></div>
            </a>
            <a class="qa-row" href="pharmacy_dashboard.html">
              <div class="qa-row__icon" style="background:var(--blue-tint);color:#3b6fd1;">${icon('box')}</div>
              <div><div class="qa-row__title">Order Medicines</div><div class="qa-row__sub">From trusted pharmacies</div></div>
            </a>
            <a class="qa-row" href="health_records.html">
              <div class="qa-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('records')}</div>
              <div><div class="qa-row__title">Health Records</div><div class="qa-row__sub">View your medical history</div></div>
            </a>
          </div>
        </section>

        <section class="tile order-card">
          <div class="tile__head"><h3>Order Medicines</h3><a class="tile-link" href="pharmacy_dashboard.html">View all</a></div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0;">Get your medicines delivered at your doorstep</p>
          <div class="order-card__search">
            <input id="medSearchInput" placeholder="Search medicines…">
            <button onclick="window.location.href='pharmacy_dashboard.html'">${icon('search')}</button>
          </div>
        </section>

        <section class="tile tile--w2" id="vitalsTile">
          <div class="tile__head"><h3>Health Summary</h3><a class="tile-link" href="health_records.html">View full record</a></div>
          <div class="health-grid" id="vitalsGrid">${skeletonRows(0)}</div>
          <div class="health-banner">
            ${icon('shield')}
            <p>Keep your profile updated for a better healthcare experience.</p>
            <button class="btn btn--ghost btn--sm" onclick="window.location.href='health_records.html'">Update Now</button>
          </div>
        </section>

        <section class="tile" id="rxTile">
          <div class="tile__head"><h3>Recent Prescriptions</h3><a class="tile-link" href="health_records.html">View all</a></div>
          <div class="list" id="rxList">${skeletonRows(2)}</div>
        </section>

        <section class="tile tile--ink connect-card tile--w2">
          <h3 style="font-size:20px;">We connect your care</h3>
          <div class="connect-card__feature">${icon('check')} Doctors you can trust</div>
          <div class="connect-card__feature">${icon('check')} Care that comes to you</div>
          <div class="connect-card__feature">${icon('check')} Medicines just a click away</div>
        </section>

        <section class="tile" id="notifTile">
          <div class="tile__head"><h3>Notifications</h3><a class="tile-link" href="#" id="markAllRead">Mark all read</a></div>
          <div class="list" id="notifList">${skeletonRows(2)}</div>
        </section>

        <section class="tile tile--w3">
          <div class="tile__head"><h3>How MediConnect Works</h3></div>
          <div class="steps">
            <div class="step"><div class="step__icon">${icon('search')}</div><div><div class="step__title">1. Find a Doctor</div><div class="step__sub">Search and choose the right specialist</div></div></div>
            <div class="step"><div class="step__icon">${icon('calendar')}</div><div><div class="step__title">2. Book Appointment</div><div class="step__sub">Pick a time that suits you</div></div></div>
            <div class="step"><div class="step__icon">${icon('headset')}</div><div><div class="step__title">3. Consult &amp; Get Care</div><div class="step__sub">Visit the clinic or consult online</div></div></div>
            <div class="step"><div class="step__icon">${icon('box')}</div><div><div class="step__title">4. Get Medicines</div><div class="step__sub">Order from our partner pharmacies</div></div></div>
          </div>
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
  loadVitals();
  loadAppointments();
  loadPrescriptions();
  loadNotifications();
}

async function loadVitals(){
  const grid = document.getElementById('vitalsGrid');
  try {
    const v = await HealthAPI.latestVitals();
    const items = [
      ['Blood Group', v.blood_group || 'O+'],
      ['Allergies', v.allergies || 'None'],
      ['Height', v.height ? `${v.height} cm` : '165 cm'],
      ['Weight', v.weight ? `${v.weight} kg` : '62 kg'],
    ];
    grid.innerHTML = items.map(([lab, val]) => `
      <div class="health-stat"><div class="health-stat__lab">${lab}</div><div class="health-stat__val">${val}</div></div>`).join('');
  } catch {
    const items = [['Blood Group','O+'],['Allergies','None'],['Height','165 cm'],['Weight','62 kg']];
    grid.innerHTML = items.map(([lab, val]) => `
      <div class="health-stat"><div class="health-stat__lab">${lab}</div><div class="health-stat__val">${val}</div></div>`).join('');
  }
}

async function loadAppointments(){
  const preview = document.getElementById('apptPreview');
  try {
    const data = await AppointmentsAPI.upcoming();
    const items = data.results || data;
    if (!items.length){
      preview.innerHTML = emptyState('No upcoming appointments', "Book one when you're ready.", icon('calendar'));
      return;
    }
    const a = items[0];
    preview.innerHTML = `
      <div class="preview-row">
        <div class="avatar">${initials(a.doctor_name || 'Dr')}</div>
        <div class="preview-row__body">
          <div class="preview-row__name">Dr. ${escapeHtml(a.doctor_name || '')}</div>
          <div class="preview-row__role">${escapeHtml(a.doctor_specialization || 'Specialist')}</div>
          <div class="preview-row__meta">${icon('calendar')} ${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</div>
        </div>
      </div>
      <div style="margin-top:12px;"><span class="badge badge--${a.status}">${a.status.replace('_',' ')}</span></div>
      <a class="btn btn--ghost btn--sm btn--block" style="margin-top:14px;" href="book_appointment.html">View Appointment Details</a>
    `;
  } catch {
    preview.innerHTML = emptyState("Couldn't load appointments", 'Check that the backend is running.', icon('calendar'));
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
        <span class="badge badge--${p.status || 'active'}">${p.status || 'active'}</span>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState("Couldn't load prescriptions", '', icon('pill'));
  }
}

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
