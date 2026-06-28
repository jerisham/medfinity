/* ===================================================================
   Medfinity — Book Appointment page
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  star:     '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  check:    '<path d="M20 6L9 17l-5-5"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  video:    '<path d="M15 10l5-3v10l-5-3M3 6h12v12H3z"/>',
  stethoscope: '<path d="M4.8 2.3A.3.3 0 104 3v3a6 6 0 006 6 6 6 0 006-6V3a.3.3 0 10-.8-.7"/><path d="M6 15v1a6 6 0 006 6 6 6 0 006-6v-4"/>',
  pin:      '<path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  filter:   '<path d="M3 6h18M7 12h10M11 18h2"/>',
  x:        '<path d="M18 6L6 18M6 6l12 12"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ── State ─────────────────────────────────────────────── */
let allDoctors = [];
let selectedDoctor = null;
let selectedSlot = null;
let availableSlots = [];
let activeSpecialty = 'all';

const SPECIALTIES = [
  { key: 'all',           label: 'All Doctors',   color: 'var(--green-tint)',  text: 'var(--emerald-hover)' },
  { key: 'General',       label: 'General',        color: 'var(--blue-tint)',   text: '#3b6fd1' },
  { key: 'Cardiology',    label: 'Cardiology',     color: 'var(--rose-tint)',   text: '#c0436b' },
  { key: 'Dermatology',   label: 'Dermatology',    color: 'var(--peach-tint)',  text: '#d98a3d' },
  { key: 'Neurology',     label: 'Neurology',      color: 'var(--lilac-tint)',  text: '#7c5cbf' },
  { key: 'Orthopedics',   label: 'Orthopedics',    color: 'var(--green-tint)',  text: 'var(--emerald-hover)' },
  { key: 'Pediatrics',    label: 'Pediatrics',     color: '#fff3e0',            text: '#e65100' },
];

/* ── Render Shell ───────────────────────────────────────── */
if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('appointments', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'Appointments',
        sub: 'Manage your appointments and schedule with doctors in seconds.',
        user
      })}

      <div class="bento" style="grid-template-columns:1fr; gap:20px;">

        <!-- Search & filter bar -->
        <section class="tile" style="padding:18px 24px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div class="appt-searchbar">
              ${icon('search')}
              <input id="doctorSearch" placeholder="Search by name or specialization…" autocomplete="off">
            </div>
            <div class="appt-chips" id="specialtyChips">
              ${SPECIALTIES.map(s => `
                <button class="chip${s.key === 'all' ? ' chip--active' : ''}"
                  data-specialty="${s.key}"
                  style="--chip-bg:${s.color};--chip-text:${s.text}">
                  ${s.label}
                </button>`).join('')}
            </div>
          </div>
        </section>

        <!-- Doctor list grid -->
        <section class="tile" style="padding:20px 24px;">
          <div class="tile__head" style="margin-bottom:16px;">
            <h3>Available Doctors</h3>
            <span id="doctorCount" style="font-size:13px;color:var(--ink-soft);font-weight:600;"></span>
          </div>
          <div class="doctor-grid" id="doctorGrid">${skeletonDoctors(6)}</div>
        </section>

        <!-- Appointment panel (hidden until doctor chosen) -->
        <section class="tile" id="bookingPanel" style="display:none;padding:24px;">
          <div class="tile__head" style="margin-bottom:18px;">
            <h3>Book an Appointment</h3>
            <button class="btn btn--ghost btn--sm" id="clearDoctor">${icon('x')} Clear</button>
          </div>
          <div id="bookingContent"></div>
        </section>

        <!-- Upcoming appointments -->
        <section class="tile" style="padding:20px 24px;">
          <div class="tile__head" style="margin-bottom:14px;">
            <h3>My Upcoming Appointments</h3>
          </div>
          <div class="list" id="upcomingList">${skeletonRows(3)}</div>
        </section>

      </div>
    </main>
  `;

  initPage();
}

/* ── Init ───────────────────────────────────────────────── */
function initPage() {
  loadDoctors();
  loadUpcoming();

  document.getElementById('doctorSearch').addEventListener('input', () => filterDoctors());
  document.getElementById('specialtyChips').addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeSpecialty = btn.dataset.specialty;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    filterDoctors();
  });
  document.getElementById('clearDoctor').addEventListener('click', () => {
    selectedDoctor = null;
    selectedSlot = null;
    document.getElementById('bookingPanel').style.display = 'none';
    document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('is-selected'));
  });
}

/* ── Doctors ────────────────────────────────────────────── */
async function loadDoctors() {
  try {
    const data = await UsersAPI.doctors();
    allDoctors = data.results || data;
    renderDoctors(allDoctors);

    // Auto-select doctor from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('doctor');
    if (doctorId) {
      const doc = allDoctors.find(d => d.id == doctorId);
      if (doc) {
        selectDoctor(doc);
      }
    }
  } catch {
    document.getElementById('doctorGrid').innerHTML = emptyState('Could not load doctors', 'Check that the backend is running.', icon('stethoscope'));
  }
}

function filterDoctors() {
  const q = document.getElementById('doctorSearch').value.toLowerCase();
  let list = allDoctors;
  if (activeSpecialty !== 'all') list = list.filter(d => (d.specialization || '').toLowerCase().includes(activeSpecialty.toLowerCase()));
  if (q) list = list.filter(d => `${d.first_name} ${d.last_name} ${d.specialization}`.toLowerCase().includes(q));
  renderDoctors(list);
}

function renderDoctors(docs) {
  const grid = document.getElementById('doctorGrid');
  const count = document.getElementById('doctorCount');
  count.textContent = `${docs.length} doctor${docs.length !== 1 ? 's' : ''} found`;

  if (!docs.length) {
    grid.innerHTML = emptyState('No doctors match', 'Try a different specialty or search term.', icon('search'));
    return;
  }

  grid.innerHTML = docs.map(d => {
    const name = `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Doctor';
    const fee = d.consultation_fee ? `₹${d.consultation_fee}` : 'Fee N/A';
    const rating = parseFloat(d.rating || 0);
    const stars = Math.round(rating);
    const starHtml = Array.from({length: 5}, (_, i) =>
      `<svg viewBox="0 0 24 24" fill="${i < stars ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" width="13" height="13" style="color:#f59e0b">${ICONS.star}</svg>`
    ).join('');
    return `
      <div class="doctor-card${selectedDoctor?.id === d.id ? ' is-selected' : ''}" data-id="${d.id}" id="doc-${d.id}">
        <div class="doctor-card__avatar">${initials(name)}</div>
        <div class="doctor-card__body">
          <div class="doctor-card__name">Dr. ${escapeHtml(name)}</div>
          <div class="doctor-card__spec">${escapeHtml(d.specialization || 'General Practitioner')}</div>
          <div class="doctor-card__meta">
            <span>${fee} / visit</span>
            <span style="display:flex;align-items:center;gap:3px;">${starHtml} ${rating > 0 ? rating.toFixed(1) : '—'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
            <span class="badge badge--completed" style="font-size:10.5px;">${d.experience_years || 0}y exp</span>
            ${d.is_available ? '<span class="badge badge--completed" style="font-size:10.5px;">Available</span>' : '<span class="badge badge--cancelled" style="font-size:10.5px;">Unavailable</span>'}
          </div>
        </div>
        <button class="btn btn--primary btn--sm" style="align-self:flex-end;margin-top:auto;" data-book="${d.id}">Book</button>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', () => selectDoctor(docs.find(d => d.id == btn.dataset.book)));
  });
}

async function selectDoctor(doc) {
  selectedDoctor = doc;
  selectedSlot = null;

  document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('is-selected'));
  document.getElementById(`doc-${doc.id}`)?.classList.add('is-selected');

  const panel = document.getElementById('bookingPanel');
  const content = document.getElementById('bookingContent');
  panel.style.display = 'flex';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  content.innerHTML = skeletonRows(2);

  try {
    const slots = await UsersAPI.doctorAvailability(doc.id);
    availableSlots = slots.results || slots;
    renderBookingForm(doc);
  } catch {
    content.innerHTML = emptyState('Could not load availability', '', icon('clock'));
  }
}

function renderBookingForm(doc) {
  const name = `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || 'Doctor';
  const content = document.getElementById('bookingContent');

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 2);

  content.innerHTML = `
    <div class="grid-2col">
      <div>
        <div class="preview-row" style="margin-bottom:20px;">
          <div class="avatar">${initials(name)}</div>
          <div class="preview-row__body">
            <div class="preview-row__name">Dr. ${escapeHtml(name)}</div>
            <div class="preview-row__role">${escapeHtml(doc.specialization || 'General Practitioner')}</div>
            <div class="preview-row__meta">${icon('pin')} Consultation Fee: ₹${doc.consultation_fee || 'N/A'}</div>
          </div>
        </div>
        <div class="field">
          <label for="apptDate">Select Date</label>
          <input type="date" id="apptDate" min="${today}" max="${maxDate.toISOString().split('T')[0]}" value="${today}">
        </div>
        <div class="field">
          <label for="apptType">Appointment Type</label>
          <select id="apptType">
            <option value="in_person">In-person Visit</option>
            <option value="video">Video Consultation</option>
          </select>
        </div>
        <div class="field">
          <label for="apptNotes">Reason / Notes</label>
          <textarea id="apptNotes" rows="3" placeholder="Describe your symptoms or reason for visit…" style="resize:vertical;"></textarea>
        </div>
        <div id="bookFormError" class="form-error"></div>
        <button class="btn btn--primary btn--sm" id="confirmBookBtn" style="margin-top:4px;">
          ${icon('calendar')} Confirm Appointment
        </button>
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--forest-deep);margin-bottom:12px;">Available Slots</div>
        <div id="slotsContainer">
          ${availableSlots.length ? renderSlots(availableSlots) : `<div style="color:var(--ink-soft);font-size:13px;">No availability set by this doctor yet.</div>`}
        </div>
      </div>
    </div>
  `;

  document.getElementById('confirmBookBtn').addEventListener('click', confirmBooking);
}

function renderSlots(slots) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const grouped = {};
  slots.forEach(s => { (grouped[s.day] = grouped[s.day] || []).push(s); });
  return days.filter(d => grouped[d]).map(day => `
    <div style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;text-transform:capitalize;color:var(--ink-soft);margin-bottom:6px;">${day}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${(grouped[day] || []).map(s => `
          <button class="slot-btn" data-slot='${JSON.stringify(s)}'>
            ${formatTime(s.start_time)} – ${formatTime(s.end_time)}
          </button>`).join('')}
      </div>
    </div>`).join('');
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.slot-btn');
  if (!btn) return;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('is-selected'));
  btn.classList.add('is-selected');
  selectedSlot = JSON.parse(btn.dataset.slot);
});

async function confirmBooking() {
  const btn = document.getElementById('confirmBookBtn');
  const errBox = document.getElementById('bookFormError');
  const date = document.getElementById('apptDate')?.value;
  const type = document.getElementById('apptType')?.value;
  const notes = document.getElementById('apptNotes')?.value.trim();

  errBox.classList.remove('is-visible');

  if (!date) { errBox.textContent = 'Please select a date.'; errBox.classList.add('is-visible'); return; }
  if (!selectedDoctor) { errBox.textContent = 'No doctor selected.'; errBox.classList.add('is-visible'); return; }

  btn.disabled = true;
  btn.innerHTML = `${icon('clock')} Booking…`;

  const apptTime = selectedSlot ? selectedSlot.start_time : '09:00:00';

  const payload = {
    doctor: selectedDoctor.id,
    appointment_date: date,
    appointment_type: type,
    symptoms: notes || '',  // backend field is "symptoms"
    notes: notes || '',
    appointment_time: apptTime,
  };

  try {
    await AppointmentsAPI.create(payload);
    showToast('Appointment booked! 🎉', 'success');
    selectedDoctor = null; selectedSlot = null;
    document.getElementById('bookingPanel').style.display = 'none';
    document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('is-selected'));
    loadUpcoming();
  } catch (err) {
    errBox.textContent = err.message || 'Booking failed. Try again.';
    errBox.classList.add('is-visible');
    btn.disabled = false;
    btn.innerHTML = `${icon('calendar')} Confirm Appointment`;
  }
}

/* ── Upcoming ────────────────────────────────────────────── */
async function loadUpcoming() {
  const list = document.getElementById('upcomingList');
  try {
    const data = await AppointmentsAPI.list();
    const items = (data.results || data).filter(a => a.status !== 'cancelled').slice(0, 8);
    if (!items.length) {
      list.innerHTML = emptyState('No appointments yet', "Book one above when you're ready.", icon('calendar'));
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="list-row">
        <div class="list-row__icon">${icon('calendar')}</div>
        <div class="list-row__body">
          <div class="list-row__title">Dr. ${escapeHtml(a.doctor_name || 'Doctor')}</div>
          <div class="list-row__meta">${escapeHtml(a.doctor_specialization || a.doctor_details?.specialization || 'Specialist')} · ${formatDate(a.appointment_date)} at ${formatTime(a.appointment_time || '09:00')} · ${a.appointment_type === 'video' ? 'Video' : 'In-person'}</div>
        </div>
        <span class="badge badge--${a.status}">${a.status.replace(/_/g, ' ')}</span>
        ${a.status === 'scheduled' ? `<button class="btn btn--ghost btn--sm" data-cancel="${a.id}" style="margin-left:4px;">Cancel</button>` : ''}
      </div>`).join('');

    list.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this appointment?')) return;
        btn.disabled = true;
        try {
          await AppointmentsAPI.cancel(btn.dataset.cancel);
          showToast('Appointment cancelled.', 'default');
          loadUpcoming();
        } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
      });
    });
  } catch {
    list.innerHTML = emptyState("Couldn't load appointments", 'Check that the backend is running.', icon('calendar'));
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function skeletonDoctors(n) {
  return Array.from({length: n}).map(() => `
    <div class="doctor-card" style="pointer-events:none;">
      <div class="skeleton" style="width:56px;height:56px;border-radius:50%;flex-shrink:0;"></div>
      <div class="doctor-card__body" style="flex:1;">
        <div class="skeleton skel-line" style="width:70%;height:14px;"></div>
        <div class="skeleton skel-line" style="width:50%;height:11px;margin-top:6px;"></div>
        <div class="skeleton skel-line" style="width:40%;height:10px;margin-top:6px;"></div>
      </div>
    </div>`).join('');
}
