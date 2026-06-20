/* ===================================================================
   Medfinity — Book Appointment
=================================================================== */

const user = requireAuth(['patient']);
if (!user) throw new Error('Not authenticated');

let selectedDoctor = null;
let selectedSlot = null;

async function init(){
  const app = document.getElementById('app');
  app.innerHTML = renderSkeleton();

  try {
    const doctors = await UsersAPI.doctors();
    app.innerHTML = renderBookingPage(doctors);
    attachListeners();
  } catch (err) {
    app.innerHTML = `<div class="main"><p style="color:var(--danger)">Failed to load doctors.</p></div>`;
  }
}

function renderSkeleton(){
  return `
    <div class="app">
      ${renderSidebar('book', 'patient')}
      <div class="main">
        <div class="topbar"><h1 class="topbar__title">Book Appointment</h1></div>
        <div class="bento"><div class="tile tile--w4">${skeletonRows(3)}</div></div>
      </div>
    </div>`;
}

function renderBookingPage(doctors){
  const doctorCards = doctors.length ? doctors.map(d => `
    <div class="list-row doctor-card" data-id="${d.id}" style="cursor:pointer;border:2px solid transparent;border-radius:var(--radius-sm);padding:12px;transition:border-color .15s">
      <div class="avatar" style="width:48px;height:48px;font-size:16px;background:var(--sage)">${initials(d.first_name + ' ' + d.last_name)}</div>
      <div class="list-row__body">
        <div class="list-row__title">Dr. ${escapeHtml(d.first_name || '')} ${escapeHtml(d.last_name || '')}</div>
        <div class="list-row__meta">${escapeHtml(d.specialization || '')} · ${d.experience_years || 0} years · ₹${d.consultation_fee || 0}</div>
      </div>
      <div class="badge badge--${d.is_available ? 'completed' : 'cancelled'}">${d.is_available ? 'Available' : 'Unavailable'}</div>
    </div>`).join('') : emptyState('No doctors available', 'Check back later.', '');

  return `
    <div class="app">
      ${renderSidebar('book', 'patient')}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Appointments</div>
            <h1 class="topbar__title">Book an appointment</h1>
          </div>
        </div>

        <div class="bento">
          <div class="tile tile--w2">
            <div class="tile__head"><h3>Select a doctor</h3></div>
            <div class="list" id="doctorList">${doctorCards}</div>
          </div>

          <div class="tile tile--w2" id="slotPanel" style="opacity:.5;pointer-events:none">
            <div class="tile__head"><h3>Available slots</h3></div>
            <div id="slotsContainer"><p style="color:var(--ink-soft);font-size:13px">Select a doctor to see available slots.</p></div>
          </div>

          <div class="tile tile--w4" id="bookingForm" style="opacity:.5;pointer-events:none">
            <div class="tile__head"><h3>Confirm booking</h3></div>
            <div class="field-row" style="max-width:600px">
              <div class="field">
                <label>Appointment type</label>
                <select id="apptType"><option value="in_person">In-Person</option><option value="video">Video Consultation</option></select>
              </div>
              <div class="field">
                <label>Symptoms</label>
                <input type="text" id="symptoms" placeholder="Describe your symptoms">
              </div>
            </div>
            <button class="btn btn--primary" id="bookBtn" disabled>Book appointment</button>
            <div class="form-error" id="bookError"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function attachListeners(){
  document.querySelectorAll('.doctor-card').forEach(card => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.doctor-card').forEach(c => c.style.borderColor = 'transparent');
      card.style.borderColor = 'var(--terracotta)';
      selectedDoctor = card.dataset.id;
      selectedSlot = null;
      document.getElementById('bookBtn').disabled = true;
      await loadSlots(selectedDoctor);
    });
  });

  document.getElementById('bookBtn').addEventListener('click', async () => {
    const btn = document.getElementById('bookBtn');
    const errorBox = document.getElementById('bookError');
    errorBox.classList.remove('is-visible');
    btn.disabled = true; btn.textContent = 'Booking…';

    try {
      await AppointmentsAPI.create({
        doctor: parseInt(selectedDoctor),
        appointment_date: selectedSlot.date,
        appointment_time: selectedSlot.time,
        appointment_type: document.getElementById('apptType').value,
        symptoms: document.getElementById('symptoms').value,
      });
      showToast('Appointment booked!', 'success');
      setTimeout(() => window.location.href = 'patient_dashboard.html', 800);
    } catch (err) {
      errorBox.textContent = err.message || 'Booking failed.';
      errorBox.classList.add('is-visible');
      btn.disabled = false; btn.textContent = 'Book appointment';
    }
  });
}

async function loadSlots(doctorId){
  const container = document.getElementById('slotsContainer');
  const panel = document.getElementById('slotPanel');
  container.innerHTML = '<p style="color:var(--ink-soft);font-size:13px">Loading slots…</p>';
  panel.style.opacity = '1'; panel.style.pointerEvents = 'auto';

  try {
    const slots = await AppointmentsAPI.slots(doctorId);
    if (!slots.length) {
      container.innerHTML = '<p style="color:var(--ink-soft);font-size:13px">No slots available.</p>';
      return;
    }
    container.innerHTML = slots.map(s => `
      <button class="btn btn--ghost slot-btn" data-date="${s.date}" data-time="${s.start_time}" style="margin:4px">
        ${formatDate(s.date)} · ${formatTime(s.start_time)}
      </button>`).join('');

    document.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('btn--primary'));
        btn.classList.add('btn--primary');
        selectedSlot = { date: btn.dataset.date, time: btn.dataset.time };
        document.getElementById('bookingForm').style.opacity = '1';
        document.getElementById('bookingForm').style.pointerEvents = 'auto';
        document.getElementById('bookBtn').disabled = false;
      });
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);font-size:13px">Failed to load slots.</p>';
  }
}

init();
