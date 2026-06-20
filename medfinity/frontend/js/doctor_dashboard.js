/* ===================================================================
   Medfinity — Doctor Dashboard (Updated)
   Features: Profile, Appointments, Patient Profiles, 
             Prescriptions, Dietary Recommendations, Video Calls
=================================================================== */

const user = requireAuth(['doctor']);
if (!user) throw new Error('Not authenticated');

let selectedPatient = null;
let selectedAppointment = null;

async function init(){
  const app = document.getElementById('app');
  app.innerHTML = renderSkeleton();

  try {
    const [dashboard, upcoming, profile] = await Promise.all([
      UsersAPI.dashboard().catch(() => ({})),
      AppointmentsAPI.upcoming().catch(() => []),
      UsersAPI.profile().catch(() => ({}))
    ]);

    app.innerHTML = renderDashboard(dashboard, upcoming, profile);
    attachListeners();
  } catch (err) {
    app.innerHTML = `<div class="main"><p style="color:var(--danger)">Failed to load dashboard.</p></div>`;
  }
}

function renderSkeleton(){
  return `
      ${renderSidebar('dashboard', 'doctor')}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Dashboard</div>
            <h1 class="topbar__title">${greeting()}, Dr. ${escapeHtml(user.first_name || 'Doctor')}</h1>
          </div>
          <div class="topbar__right">
            <div class="avatar">${initials(user.first_name + ' ' + user.last_name)}</div>
          </div>
        </div>
        <div class="bento">
          <div class="tile tile--w2 tile--peach">
            <div class="eyebrow">Today's Appointments</div>
            <div class="list">${skeletonRows(2)}</div>
          </div>
          <div class="tile tile--w2">
            <div class="eyebrow">Profile</div>
            <div class="list">${skeletonRows(2)}</div>
          </div>
        </div>
      </div>`;
}

function renderDashboard(dashboard, upcoming, profile){
  const todayList = upcoming.length ? upcoming.slice(0,5).map(a => `
    <div class="list-row appt-item" data-id="${a.id}" data-patient="${a.patient}" data-patient-name="${escapeHtml(a.patient_name || 'Patient')}">
      <div class="list-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
      <div class="list-row__body">
        <div class="list-row__title">${escapeHtml(a.patient_name || 'Patient')}</div>
        <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)} · <span class="badge badge--${a.status}">${a.status}</span></div>
      </div>
      <a href="video_consult.html?appointment=${a.id}" class="btn btn--sm btn--primary">Join Call</a>
    </div>`).join('') : emptyState('No appointments today', 'Your schedule is clear.', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>');

  return `
      ${renderSidebar('dashboard', 'doctor')}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Dashboard</div>
            <h1 class="topbar__title">${greeting()}, Dr. ${escapeHtml(user.first_name || 'Doctor')}</h1>
            <div class="topbar__sub">${dashboard.today_appointments || 0} today · ${dashboard.total_patients || 0} patients · Rating: ${dashboard.rating || 'N/A'}</div>
          </div>
          <div class="topbar__right">
            <div class="pulse-wrap"><div class="pulse-blob"></div><div class="avatar">${initials(user.first_name + ' ' + user.last_name)}</div></div>
          </div>
        </div>

        <div class="bento">
          <!-- Doctor Profile Card -->
          <div class="tile tile--w2 tile--peach">
            <div class="tile__head"><h3>My Profile</h3><button class="btn btn--sm btn--ghost" id="editProfileBtn">Edit</button></div>
            <div style="display:flex;gap:16px;align-items:center;margin-top:8px">
              <div class="avatar" style="width:64px;height:64px;font-size:24px;background:var(--terracotta)">${initials(user.first_name + ' ' + user.last_name)}</div>
              <div>
                <div style="font-size:18px;font-weight:700">Dr. ${escapeHtml(user.first_name || '')} ${escapeHtml(user.last_name || '')}</div>
                <div style="font-size:14px;color:var(--ink-soft);margin-top:2px">${escapeHtml(profile.specialization || 'General Physician')}</div>
                <div style="font-size:13px;color:var(--ink-soft);margin-top:4px">${profile.experience_years || 0} years experience · License: ${escapeHtml(profile.license_number || 'N/A')}</div>
                <div style="font-size:13px;color:var(--terracotta-deep);font-weight:600;margin-top:4px">₹${profile.consultation_fee || 0} per consultation</div>
              </div>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <span class="badge badge--completed">Available</span>
              <span class="badge badge--completed">Rating: ${profile.rating || 'N/A'}/5</span>
            </div>
          </div>

          <!-- Today's Appointments -->
          <div class="tile tile--w2">
            <div class="tile__head"><h3>Today's Appointments</h3><a href="video_consult.html" class="tile-link">All Consultations</a></div>
            <div class="list" id="appointmentList">${todayList}</div>
          </div>

          <!-- Patient Profile Viewer (hidden until patient selected) -->
          <div class="tile tile--w3" id="patientProfilePanel" style="opacity:.4;pointer-events:none">
            <div class="tile__head"><h3>Patient Profile</h3><span style="font-size:12px;color:var(--ink-soft)" id="selectedPatientName">Select a patient from appointments</span></div>
            <div id="patientProfileContent" style="margin-top:10px">
              <p style="color:var(--ink-soft);font-size:13px">Click on an appointment to view patient details.</p>
            </div>
          </div>

          <!-- Prescription Creator -->
          <div class="tile tile--w3 tile--h2" id="prescriptionPanel" style="opacity:.4;pointer-events:none">
            <div class="tile__head"><h3>Create Prescription</h3></div>
            <div class="field">
              <label>Diagnosis</label>
              <textarea id="diagnosis" rows="2" placeholder="Enter diagnosis..."></textarea>
            </div>
            <div class="field">
              <label>Medicines</label>
              <div id="medicineList">
                <div class="medicine-row" style="display:flex;gap:8px;margin-bottom:8px">
                  <input type="text" class="med-name" placeholder="Medicine name" style="flex:2">
                  <input type="text" class="med-dosage" placeholder="Dosage" style="flex:1">
                  <input type="text" class="med-frequency" placeholder="Frequency" style="flex:1">
                  <input type="text" class="med-duration" placeholder="Duration" style="flex:1">
                  <button type="button" class="btn btn--sm btn--ghost remove-med" style="padding:6px 10px">×</button>
                </div>
              </div>
              <button class="btn btn--sm btn--ghost" id="addMedBtn" style="margin-top:4px">+ Add Medicine</button>
            </div>
            <div class="field">
              <label>Notes</label>
              <textarea id="prescriptionNotes" rows="2" placeholder="Additional notes..."></textarea>
            </div>
            <div class="field">
              <label>Follow-up Date</label>
              <input type="date" id="followUpDate">
            </div>
            <button class="btn btn--primary" id="submitPrescriptionBtn" disabled>Send Prescription to Patient</button>
            <div class="form-error" id="prescriptionError"></div>
          </div>

          <!-- Dietary Recommendations (Optional) -->
          <div class="tile tile--w2" id="dietaryPanel" style="opacity:.4;pointer-events:none">
            <div class="tile__head"><h3>Dietary Recommendations</h3><span style="font-size:11px;color:var(--ink-soft)">Optional</span></div>
            <div class="field">
              <label>Diet Plan</label>
              <textarea id="dietPlan" rows="3" placeholder="Suggest diet plan for patient..."></textarea>
            </div>
            <div class="field">
              <label>Foods to Avoid</label>
              <textarea id="foodsToAvoid" rows="2" placeholder="List foods to avoid..."></textarea>
            </div>
            <div class="field">
              <label>Lifestyle Tips</label>
              <textarea id="lifestyleTips" rows="2" placeholder="Exercise, sleep, hydration tips..."></textarea>
            </div>
            <button class="btn btn--sage" id="sendDietaryBtn" disabled>Send Recommendations</button>
          </div>

          <!-- Quick Stats -->
          <div class="tile tile--w1">
            <div class="eyebrow">Total Patients</div>
            <div class="stat__value">${dashboard.total_patients || 0}</div>
            <div class="stat__label">All time</div>
          </div>

          <div class="tile tile--w1">
            <div class="eyebrow">Rating</div>
            <div class="stat__value">${profile.rating || '—'}</div>
            <div class="stat__label">Out of 5</div>
          </div>
        </div>
      </div>`;
}

function attachListeners(){
  // Appointment click - load patient profile
  document.querySelectorAll('.appt-item').forEach(item => {
    item.addEventListener('click', async () => {
      document.querySelectorAll('.appt-item').forEach(i => i.style.background = 'transparent');
      item.style.background = 'var(--peach)';
      selectedAppointment = item.dataset.id;
      selectedPatient = item.dataset.patient;
      const patientName = item.dataset.patientName;

      document.getElementById('selectedPatientName').textContent = patientName;
      document.getElementById('patientProfilePanel').style.opacity = '1';
      document.getElementById('patientProfilePanel').style.pointerEvents = 'auto';
      document.getElementById('prescriptionPanel').style.opacity = '1';
      document.getElementById('prescriptionPanel').style.pointerEvents = 'auto';
      document.getElementById('dietaryPanel').style.opacity = '1';
      document.getElementById('dietaryPanel').style.pointerEvents = 'auto';
      document.getElementById('submitPrescriptionBtn').disabled = false;
      document.getElementById('sendDietaryBtn').disabled = false;

      await loadPatientProfile(selectedPatient);
    });
  });

  // Add medicine row
  document.getElementById('addMedBtn').addEventListener('click', () => {
    const list = document.getElementById('medicineList');
    const row = document.createElement('div');
    row.className = 'medicine-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
    row.innerHTML = `
      <input type="text" class="med-name" placeholder="Medicine name" style="flex:2">
      <input type="text" class="med-dosage" placeholder="Dosage" style="flex:1">
      <input type="text" class="med-frequency" placeholder="Frequency" style="flex:1">
      <input type="text" class="med-duration" placeholder="Duration" style="flex:1">
      <button type="button" class="btn btn--sm btn--ghost remove-med" style="padding:6px 10px">×</button>
    `;
    list.appendChild(row);
    row.querySelector('.remove-med').addEventListener('click', () => row.remove());
  });

  // Remove medicine row
  document.querySelectorAll('.remove-med').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.medicine-row').remove());
  });

  // Submit prescription
  document.getElementById('submitPrescriptionBtn').addEventListener('click', async () => {
    const btn = document.getElementById('submitPrescriptionBtn');
    const errorBox = document.getElementById('prescriptionError');
    errorBox.classList.remove('is-visible');
    btn.disabled = true; btn.textContent = 'Sending...';

    const medicines = [];
    document.querySelectorAll('.medicine-row').forEach(row => {
      const name = row.querySelector('.med-name').value.trim();
      if (name) {
        medicines.push({
          name: name,
          dosage: row.querySelector('.med-dosage').value,
          frequency: row.querySelector('.med-frequency').value,
          duration: row.querySelector('.med-duration').value,
        });
      }
    });

    const payload = {
      patient: parseInt(selectedPatient),
      diagnosis: document.getElementById('diagnosis').value,
      notes: document.getElementById('prescriptionNotes').value,
      follow_up_date: document.getElementById('followUpDate').value,
      medicines: medicines
    };

    try {
      await apiCall('/prescriptions/create/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Prescription sent to patient!', 'success');
      // Clear form
      document.getElementById('diagnosis').value = '';
      document.getElementById('prescriptionNotes').value = '';
      document.getElementById('followUpDate').value = '';
      document.querySelectorAll('.medicine-row').forEach((row, i) => { if (i > 0) row.remove(); });
      document.querySelectorAll('.medicine-row input').forEach(input => input.value = '');
    } catch (err) {
      errorBox.textContent = err.message || 'Failed to send prescription.';
      errorBox.classList.add('is-visible');
    }
    btn.disabled = false; btn.textContent = 'Send Prescription to Patient';
  });

  // Send dietary recommendations
  document.getElementById('sendDietaryBtn').addEventListener('click', async () => {
    const btn = document.getElementById('sendDietaryBtn');
    btn.disabled = true; btn.textContent = 'Sending...';

    try {
      // Store dietary recommendations as part of prescription notes or separate endpoint
      await apiCall('/prescriptions/create/', {
        method: 'POST',
        body: JSON.stringify({
          patient: parseInt(selectedPatient),
          diagnosis: 'Dietary Recommendations',
          notes: `DIET PLAN:
${document.getElementById('dietPlan').value}

FOODS TO AVOID:
${document.getElementById('foodsToAvoid').value}

LIFESTYLE TIPS:
${document.getElementById('lifestyleTips').value}`,
          medicines: []
        })
      });
      showToast('Dietary recommendations sent!', 'success');
      document.getElementById('dietPlan').value = '';
      document.getElementById('foodsToAvoid').value = '';
      document.getElementById('lifestyleTips').value = '';
    } catch (err) {
      showToast('Failed to send recommendations', 'error');
    }
    btn.disabled = false; btn.textContent = 'Send Recommendations';
  });
}

async function loadPatientProfile(patientId){
  const content = document.getElementById('patientProfileContent');
  content.innerHTML = '<p style="color:var(--ink-soft);font-size:13px">Loading patient profile...</p>';

  try {
    const patient = await UsersAPI.patient(patientId);
    const vitals = await HealthAPI.latestVitals().catch(() => null);
    const records = await HealthAPI.records().catch(() => []);

    const vitalsHtml = vitals ? `
      <div class="vitals-grid" style="margin-top:8px">
        <div class="vital"><div class="vital__num">${vitals.blood_pressure_systolic || '—'}/${vitals.blood_pressure_diastolic || '—'}</div><div class="vital__lab">BP</div></div>
        <div class="vital"><div class="vital__num">${vitals.heart_rate || '—'}</div><div class="vital__lab">HR</div></div>
        <div class="vital"><div class="vital__num">${vitals.temperature || '—'}°C</div><div class="vital__lab">Temp</div></div>
        <div class="vital"><div class="vital__num">${vitals.oxygen_saturation || '—'}%</div><div class="vital__lab">SpO2</div></div>
      </div>` : '<p style="font-size:12px;color:var(--ink-soft)">No vitals recorded.</p>';

    const recentRecords = records.slice(0, 3).map(r => `
      <div style="font-size:12px;color:var(--ink-soft);margin-top:4px">• ${escapeHtml(r.title)} (${formatDate(r.record_date)})</div>
    `).join('') || '<p style="font-size:12px;color:var(--ink-soft)">No recent records.</p>';

    content.innerHTML = `
      <div style="display:flex;gap:16px;align-items:flex-start">
        <div class="avatar" style="width:56px;height:56px;font-size:20px;background:var(--sage)">${initials(patient.first_name + ' ' + patient.last_name)}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700">${escapeHtml(patient.first_name || '')} ${escapeHtml(patient.last_name || '')}</div>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:2px">Age: ${calculateAge(patient.date_of_birth) || 'N/A'} · ${patient.gender || 'N/A'} · Blood: ${patient.blood_group || 'N/A'}</div>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:2px">Phone: ${escapeHtml(patient.phone || 'N/A')} · Emergency: ${escapeHtml(patient.emergency_contact || 'N/A')}</div>
          <div style="font-size:12px;color:var(--terracotta-deep);margin-top:4px"><strong>Allergies:</strong> ${escapeHtml(patient.allergies || 'None listed')}</div>
          <div style="font-size:12px;color:var(--terracotta-deep);margin-top:2px"><strong>Chronic Conditions:</strong> ${escapeHtml(patient.chronic_conditions || 'None listed')}</div>
        </div>
      </div>
      <div style="margin-top:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Latest Vitals</div>
        ${vitalsHtml}
      </div>
      <div style="margin-top:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Recent Records</div>
        ${recentRecords}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);font-size:13px">Failed to load patient profile.</p>`;
  }
}

function calculateAge(dob){
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

init();
