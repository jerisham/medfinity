/* ===================================================================
   Medfinity — Patient Records & Prescription Writing
   Dedicated to doctors to view patients and manage prescriptions.
=================================================================== */

const user = requireAuth(['doctor']);

const ICONS = {
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  records: '<path d="M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z"/>',
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let patientsList = [];
let selectedPatient = null;
let patientAppointments = [];
let patientPrescriptions = [];

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('records', 'doctor')}
    <main class="main">
      ${renderTopbar({
        title: 'Patient Records',
        sub: 'Review patient medical histories and prescribe treatments.',
        user,
        hideSearch: true
      })}

      <div class="bento bento--rx">
        <!-- Left: Patients List -->
        <section class="tile" style="padding: 20px 24px; min-height: 520px;">
          <div class="tile__head" style="margin-bottom: 18px;">
            <h3 style="display:flex;align-items:center;gap:8px;">
              ${icon('records', 'style="color:var(--emerald);width:20px;height:20px;"')}
              My Patients
            </h3>
          </div>
          <div class="list" id="patientList">
            ${skeletonRows(4)}
          </div>
        </section>

        <!-- Right: Patient Detail View -->
        <section class="tile" id="detailPanel" style="padding: 24px; min-height: 520px;">
          <div id="detailContent">
            <div class="empty">
              ${icon('records', 'style="width:48px;height:48px;opacity:.25;"')}
              <div class="empty__title">No Patient Selected</div>
              <div class="empty__sub">Select a patient on the left to view vitals, allergies, appointment history, and write prescriptions.</div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Write Prescription Modal -->
    <div class="modal-overlay" id="rxModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
      <div class="tile" style="background:#fff; width:100%; max-width:680px; padding:28px; border-radius:var(--radius-lg); position:relative;">
        <button id="closeRxModal" style="position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:var(--ink-soft);">${icon('x', 'style="width:20px;height:20px;"')}</button>
        <h3 style="margin-bottom:6px; font-size:20px; color:var(--forest-deep);" id="rxModalTitle">Write Prescription</h3>
        <p style="font-size:13px; color:var(--ink-soft); margin:0 0 20px;" id="rxModalSub">Enter diagnosis, follow-up, and medications.</p>
        
        <form id="rxForm">
          <input type="hidden" id="rxApptId">
          <div class="field">
            <label for="rxDiagnosis">Diagnosis / Reason</label>
            <input id="rxDiagnosis" required placeholder="e.g. Acute Viral Bronchitis">
          </div>
          <div class="field">
            <label for="rxNotes">Remarks / Special Instructions</label>
            <textarea id="rxNotes" rows="2" placeholder="e.g. Bed rest, avoid cold drinks..."></textarea>
          </div>
          <div class="field">
            <label for="rxFollowUp">Follow-up Date (Optional)</label>
            <input type="date" id="rxFollowUp">
          </div>
          
          <div style="margin-top:20px; border-top:1px solid var(--glass-border); padding-top:16px;">
            <div style="display:flex; justify-content:between; align-items:center; margin-bottom:12px;">
              <h4 style="font-size:14px; margin:0; color:var(--forest-deep); font-weight:700;">Prescribed Medications</h4>
              <button type="button" class="btn btn--sage btn--sm" id="addMedBtn" style="margin-left:auto;">
                ${icon('plus', 'style="width:13px;height:13px;"')} Add Medicine
              </button>
            </div>
            
            <div id="medicinesContainer" style="display:flex; flex-direction:column; gap:10px;">
              <!-- Dynamic Medicine Rows -->
            </div>
          </div>
          
          <div id="rxFormError" class="form-error" style="margin-top:16px;"></div>
          
          <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px; border-top:1px solid var(--glass-border); padding-top:18px;">
            <button type="button" class="btn btn--ghost btn--sm" id="cancelRxBtn">Cancel</button>
            <button type="submit" class="btn btn--primary btn--sm" id="submitRxBtn">${icon('pill')} Submit Prescription</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initPage();
}

function initPage() {
  loadPatients();

  document.getElementById('closeRxModal').addEventListener('click', hideModal);
  document.getElementById('cancelRxBtn').addEventListener('click', hideModal);
  document.getElementById('addMedBtn').addEventListener('click', () => addMedicineRow());
  document.getElementById('rxForm').addEventListener('submit', handleRxSubmit);
}

async function loadPatients() {
  const list = document.getElementById('patientList');
  try {
    const data = await AppointmentsAPI.patients();
    patientsList = data.results || data;

    if (!patientsList.length) {
      list.innerHTML = emptyState('No patients found', 'Patients you have appointments with will appear here.', icon('records'));
      return;
    }

    list.innerHTML = patientsList.map(p => `
      <div class="list-row patient-item" data-id="${p.id}" id="pt-item-${p.id}" style="cursor:pointer; padding:14px 10px; border-radius:var(--radius-sm); transition:all 0.15s ease;">
        <div class="list-row__icon" style="background:var(--blue-tint);color:#3b6fd1;">${initials(p.full_name || p.first_name || 'P')}</div>
        <div class="list-row__body">
          <div class="list-row__title" style="font-weight:700;">${escapeHtml(p.full_name)}</div>
          <div class="list-row__meta">${p.phone || p.email || 'No contact'} · ${p.total_visits} visit${p.total_visits !== 1 ? 's' : ''}</div>
        </div>
        ${icon('arrow', 'style="width:16px;height:16px;opacity:.5;"')}
      </div>`).join('');

    patientsList.forEach(p => {
      document.getElementById(`pt-item-${p.id}`).addEventListener('click', () => selectPatient(p));
    });

    // If we arrived here from the appointments queue with a specific patient
    // in mind (?patient=ID), open their record straight away.
    const params = new URLSearchParams(window.location.search);
    const wantedId = params.get('patient');
    if (wantedId) {
      const target = patientsList.find(p => String(p.id) === String(wantedId));
      if (target) selectPatient(target);
    }

  } catch (err) {
    list.innerHTML = emptyState("Couldn't load patients", err.message, icon('records'));
  }
}

async function selectPatient(p) {
  selectedPatient = p;

  document.querySelectorAll('.patient-item').forEach(el => el.classList.remove('is-active', 'tile--peach'));
  const activeEl = document.getElementById(`pt-item-${p.id}`);
  if (activeEl) activeEl.classList.add('is-active', 'tile--peach');

  const detail = document.getElementById('detailContent');
  detail.innerHTML = skeletonRows(3);

  try {
    // Fetch patient appointments and prescriptions
    const appts = await AppointmentsAPI.forPatient(p.id);
    const rxs = await PrescriptionsAPI.forPatient(p.id);
    
    patientAppointments = appts.results || appts;
    patientPrescriptions = rxs.results || rxs;

    renderPatientDetail(p);
  } catch (err) {
    detail.innerHTML = emptyState("Error loading details", err.message, icon('records'));
  }
}

function renderPatientDetail(p) {
  const detail = document.getElementById('detailContent');

  // Vitals
  const vitalsHtml = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-top:14px;">
      <div style="background:var(--bg-canvas); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--glass-border);">
        <div style="font-size:10px; color:var(--ink-soft); text-transform:uppercase; font-weight:700;">Blood Group</div>
        <div style="font-size:18px; font-weight:800; color:var(--forest-deep); margin-top:2px;">${escapeHtml(p.blood_group || 'O+')}</div>
      </div>
      <div style="background:var(--bg-canvas); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--glass-border);">
        <div style="font-size:10px; color:var(--ink-soft); text-transform:uppercase; font-weight:700;">Age</div>
        <div style="font-size:18px; font-weight:800; color:var(--forest-deep); margin-top:2px;">${p.date_of_birth ? calculateAge(p.date_of_birth) + 'y' : '—'}</div>
      </div>
      <div style="background:var(--bg-canvas); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--glass-border);">
        <div style="font-size:10px; color:var(--ink-soft); text-transform:uppercase; font-weight:700;">Total Visits</div>
        <div style="font-size:18px; font-weight:800; color:var(--forest-deep); margin-top:2px;">${p.total_visits}</div>
      </div>
    </div>
  `;

  // Chronic conditions
  const conditionsHtml = p.chronic_conditions
    ? p.chronic_conditions.split(',').map(c => `<span class="badge badge--in_progress" style="font-size:11px; margin: 2px;">${escapeHtml(c.trim())}</span>`).join('')
    : '<span style="font-size:13px; color:var(--ink-soft);">None recorded</span>';

  // Allergies
  const allergiesHtml = p.allergies
    ? p.allergies.split(',').map(a => `<span class="badge badge--cancelled" style="font-size:11px; margin: 2px;">${escapeHtml(a.trim())}</span>`).join('')
    : '<span style="font-size:13px; color:var(--ink-soft);">None recorded</span>';

  // Appointment table with Prescription capability
  const apptsTable = patientAppointments.length ? `
    <div style="overflow-x:auto; margin-top:14px;">
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--glass-border);color:var(--ink-soft);font-weight:700;">
            <th style="padding:8px;">Date</th>
            <th style="padding:8px;">Type</th>
            <th style="padding:8px;">Reason / Notes</th>
            <th style="padding:8px;">Status</th>
            <th style="padding:8px; text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${patientAppointments.map(a => {
            const rxWritten = patientPrescriptions.some(rx => rx.appointment == a.id);
            let actionBtn = '';
            if (a.status === 'completed') {
              if (rxWritten) {
                actionBtn = '<span class="badge badge--completed" style="font-size:10.5px;">Rx Sent</span>';
              } else {
                actionBtn = `<button class="btn btn--primary btn--sm" style="font-size:11px; padding:5px 10px;" onclick="showRxModal(${a.id}, '${escapeHtml(p.full_name)}')">Write Rx</button>`;
              }
            } else if (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress') {
              actionBtn = `<button class="btn btn--sage btn--sm" style="font-size:11px; padding:5px 10px;" onclick="completeAppointment(${a.id})">Complete</button>`;
            }
            return `
            <tr style="border-bottom:1px solid var(--glass-border);">
              <td style="padding:10px 8px; font-weight:600;">${formatDate(a.appointment_date)} at ${formatTime(a.appointment_time)}</td>
              <td style="padding:10px 8px; text-transform:capitalize;">${a.appointment_type.replace('_',' ')}</td>
              <td style="padding:10px 8px; color:var(--ink-soft); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(a.symptoms || a.notes || 'No notes')}</td>
              <td style="padding:10px 8px;"><span class="badge badge--${a.status}" style="font-size:11px;">${a.status.replace('_',' ')}</span></td>
              <td style="padding:10px 8px; text-align:right;">${actionBtn}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : `<div style="color:var(--ink-soft);font-size:13px;padding:12px 0;">No appointments found.</div>`;

  detail.innerHTML = `
    <div style="border-bottom:1px solid var(--glass-border); padding-bottom:16px;">
      <h2 class="display" style="font-size:24px; color:var(--forest-deep);">${escapeHtml(p.full_name)}</h2>
      <p style="margin:4px 0 0; font-size:13px; color:var(--ink-soft); font-weight:500;">
        Email: ${escapeHtml(p.email || '—')} · Phone: ${escapeHtml(p.phone || '—')}
      </p>
    </div>

    <div style="margin-top:20px;">
      <h4 style="font-size:13.5px; color:var(--forest-deep); font-weight:700; margin-bottom:6px;">Vitals & Info</h4>
      ${vitalsHtml}
    </div>

    <div class="grid-2col" style="margin-top:20px;">
      <div>
        <h4 style="font-size:13.5px; color:var(--forest-deep); font-weight:700; margin-bottom:6px;">Chronic Conditions</h4>
        <div style="display:flex; flex-wrap:wrap;">${conditionsHtml}</div>
      </div>
      <div>
        <h4 style="font-size:13.5px; color:var(--forest-deep); font-weight:700; margin-bottom:6px;">Known Allergies</h4>
        <div style="display:flex; flex-wrap:wrap;">${allergiesHtml}</div>
      </div>
    </div>

    <div style="margin-top:24px; border-top:1px solid var(--glass-border); padding-top:20px;">
      <h3 style="font-size:16px; color:var(--forest-deep); font-weight:700;">Appointment History</h3>
      ${apptsTable}
    </div>
  `;
}

/* ── Prescription Modal Controls ────────────────────────── */
window.showRxModal = function(apptId, patientName) {
  document.getElementById('rxApptId').value = apptId;
  document.getElementById('rxModalTitle').textContent = `Write Prescription for ${patientName}`;
  document.getElementById('rxFormError').classList.remove('is-visible');
  document.getElementById('rxForm').reset();
  
  const container = document.getElementById('medicinesContainer');
  container.innerHTML = '';
  // Add first medicine row by default
  addMedicineRow();

  const modal = document.getElementById('rxModal');
  modal.style.display = 'flex';
};

function hideModal() {
  document.getElementById('rxModal').style.display = 'none';
}

function addMedicineRow() {
  const container = document.getElementById('medicinesContainer');
  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'field-row med-row';
  row.style.gap = '8px';
  row.style.alignItems = 'flex-end';
  row.style.marginBottom = '8px';
  row.innerHTML = `
    <div class="field" style="margin-bottom:0; flex:2;">
      <label style="font-size:11px;">Medicine Name</label>
      <input class="med-name" required placeholder="e.g. Paracetamol 650">
    </div>
    <div class="field" style="margin-bottom:0; flex:1;">
      <label style="font-size:11px;">Dosage</label>
      <input class="med-dosage" required placeholder="e.g. 1 tab">
    </div>
    <div class="field" style="margin-bottom:0; flex:1.2;">
      <label style="font-size:11px;">Frequency</label>
      <input class="med-freq" required placeholder="e.g. Twice daily">
    </div>
    <div class="field" style="margin-bottom:0; flex:1;">
      <label style="font-size:11px;">Duration</label>
      <input class="med-dur" required placeholder="e.g. 5 days">
    </div>
    <button type="button" class="btn btn--ghost" style="padding:10px; border-color:var(--danger); color:var(--danger);" onclick="this.parentElement.remove()">
      ${icon('x', 'style="width:14px;height:14px;"')}
    </button>
  `;
  container.appendChild(row);
}

async function handleRxSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitRxBtn');
  const errBox = document.getElementById('rxFormError');
  errBox.classList.remove('is-visible');

  const apptId = document.getElementById('rxApptId').value;
  const diagnosis = document.getElementById('rxDiagnosis').value.trim();
  const notes = document.getElementById('rxNotes').value.trim();
  const followUp = document.getElementById('rxFollowUp').value;

  const medRows = document.querySelectorAll('.med-row');
  const medicines = [];
  medRows.forEach(row => {
    medicines.push({
      name: row.querySelector('.med-name').value.trim(),
      dosage: row.querySelector('.med-dosage').value.trim(),
      frequency: row.querySelector('.med-freq').value.trim(),
      duration: row.querySelector('.med-dur').value.trim(),
    });
  });

  if (!medicines.length) {
    errBox.textContent = 'Please add at least one medication.';
    errBox.classList.add('is-visible');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const payload = {
    appointment: parseInt(apptId, 10),
    patient: selectedPatient.id,
    diagnosis,
    notes,
    follow_up_date: followUp || null,
    medicines
  };

  try {
    await PrescriptionsAPI.create(payload);
    showToast('Prescription submitted successfully! 💊', 'success');
    hideModal();
    // Reload patient details to show updated Rx status
    selectPatient(selectedPatient);
  } catch (err) {
    errBox.textContent = err.message || 'Failed to submit prescription. Try again.';
    errBox.classList.add('is-visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon('pill')} Submit Prescription`;
  }
}

/* ── Complete Appointment Action ────────────────────────── */
window.completeAppointment = async function(apptId) {
  if (!confirm('Mark this appointment as completed?')) return;
  try {
    await AppointmentsAPI.updateStatus(apptId, 'completed');
    showToast('Appointment completed! ✅', 'success');
    if (selectedPatient) selectPatient(selectedPatient);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

/* ── Helpers ─────────────────────────────────────────────── */
function calculateAge(dobString) {
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
