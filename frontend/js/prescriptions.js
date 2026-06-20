/* ===================================================================
   Medfinity — Prescriptions page
   Displays a list of all prescriptions for the patient
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  doctor: '<circle cx="11" cy="6" r="3"/><path d="M5 21v-2a6 6 0 0112 0v2"/><path d="M19 8l2 2-4 4"/>',
  file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let allPrescriptions = [];
let selectedPrescription = null;

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('prescriptions', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'My Prescriptions',
        sub: 'View active medications, diagnoses and follow-up guidance.',
        user
      })}

      <div class="bento" style="grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: start;">
        <!-- Left: Prescriptions List -->
        <section class="tile" style="padding: 20px 24px; min-height: 480px;">
          <div class="tile__head" style="margin-bottom: 18px;">
            <h3 style="display:flex;align-items:center;gap:8px;">
              ${icon('pill', 'style="color:var(--emerald);width:20px;height:20px;"')}
              Prescription History
            </h3>
          </div>
          <div class="list" id="prescriptionList">
            ${skeletonRows(4)}
          </div>
        </section>

        <!-- Right: Prescription Detail View -->
        <section class="tile" id="detailPanel" style="padding: 24px; min-height: 480px;">
          <div id="detailContent">
            <div class="empty">
              ${icon('pill', 'style="width:48px;height:48px;opacity:.25;"')}
              <div class="empty__title">No Prescription Selected</div>
              <div class="empty__sub">Select a prescription from the history to view detailed dosage, medicines and doctor remarks.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  `;

  initPage();
}

function initPage() {
  loadPrescriptions();
}

async function loadPrescriptions() {
  const list = document.getElementById('prescriptionList');
  try {
    const data = await PrescriptionsAPI.list();
    allPrescriptions = data.results || data;
    
    if (!allPrescriptions.length) {
      list.innerHTML = emptyState('No prescriptions found', 'You have no prescriptions recorded.', icon('pill'));
      document.getElementById('detailContent').innerHTML = `
        <div class="empty">
          ${icon('pill', 'style="width:48px;height:48px;opacity:.25;"')}
          <div class="empty__title">No Prescriptions Available</div>
        </div>`;
      return;
    }

    list.innerHTML = allPrescriptions.map(p => `
      <div class="list-row prescription-item" data-id="${p.id}" id="rx-item-${p.id}" style="cursor:pointer; padding: 14px 10px; border-radius: var(--radius-sm); transition: all 0.15s ease;">
        <div class="list-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('pill')}</div>
        <div class="list-row__body">
          <div class="list-row__title" style="font-weight:700;">${escapeHtml(p.diagnosis || 'Prescription')}</div>
          <div class="list-row__meta">Dr. ${escapeHtml(p.doctor_name || 'Specialist')} · ${formatDate(p.created_at)}</div>
        </div>
        ${icon('arrow', 'style="width:16px;height:16px;opacity:.5;"')}
      </div>`).join('');

    // Add click listeners to items
    allPrescriptions.forEach(p => {
      document.getElementById(`rx-item-${p.id}`).addEventListener('click', () => selectPrescription(p));
    });

    // Auto-select first prescription
    selectPrescription(allPrescriptions[0]);

  } catch (err) {
    list.innerHTML = emptyState("Couldn't load prescriptions", err.message, icon('pill'));
  }
}

function selectPrescription(p) {
  selectedPrescription = p;
  
  // Highlight active item
  document.querySelectorAll('.prescription-item').forEach(el => el.classList.remove('is-active', 'tile--peach'));
  const activeEl = document.getElementById(`rx-item-${p.id}`);
  if (activeEl) {
    activeEl.classList.add('is-active', 'tile--peach');
  }

  const detail = document.getElementById('detailContent');
  
  const medicines = p.medicines || [];
  const medsTable = medicines.length ? `
    <div style="margin-top:20px; overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13.5px;">
        <thead>
          <tr style="border-bottom:2px solid var(--glass-border);color:var(--ink-soft);font-weight:700;">
            <th style="padding:10px 8px;">Medicine Name</th>
            <th style="padding:10px 8px;">Dosage</th>
            <th style="padding:10px 8px;">Frequency</th>
            <th style="padding:10px 8px;">Duration</th>
            <th style="padding:10px 8px;">Timing</th>
          </tr>
        </thead>
        <tbody>
          ${medicines.map(m => `
            <tr style="border-bottom:1px solid var(--glass-border);">
              <td style="padding:12px 8px; font-weight:700; color:var(--forest-deep);">${escapeHtml(m.name)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.dosage)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.frequency)}</td>
              <td style="padding:12px 8px; color:var(--ink);">${escapeHtml(m.duration)}</td>
              <td style="padding:12px 8px; color:var(--emerald-hover); font-weight:600;">${escapeHtml(m.timing || 'As directed')}</td>
            </tr>
            ${m.instructions ? `
              <tr style="border-bottom:1px solid var(--glass-border);background:var(--bg-canvas);">
                <td colspan="5" style="padding:8px 12px; font-size:12px; color:var(--ink-soft);">
                  <strong>Instructions:</strong> ${escapeHtml(m.instructions)}
                </td>
              </tr>` : ''}
          `).join('')}
        </tbody>
      </table>
    </div>` : `<div style="padding:16px 0;color:var(--ink-soft);font-size:13.5px;">No medications specified in this prescription.</div>`;

  detail.innerHTML = `
    <div style="display:flex;justify-content:between;align-items:start;flex-wrap:wrap;gap:14px;border-bottom:1px solid var(--glass-border);padding-bottom:16px;">
      <div>
        <h2 class="display" style="font-size:22px;color:var(--forest-deep);">${escapeHtml(p.diagnosis || 'Prescription Details')}</h2>
        <div style="display:flex;align-items:center;gap:16px;margin-top:6px;font-size:13px;color:var(--ink-soft);">
          <span style="display:flex;align-items:center;gap:4px;">${icon('doctor','style="width:14px;height:14px;"')} Dr. ${escapeHtml(p.doctor_name || 'Specialist')}</span>
          <span style="display:flex;align-items:center;gap:4px;">${icon('calendar','style="width:14px;height:14px;"')} ${formatDate(p.created_at)}</span>
        </div>
      </div>
      <span class="badge badge--completed" style="margin-left:auto;">${p.is_active ? 'Active' : 'Inactive'}</span>
    </div>

    <div style="margin-top:20px;">
      <h4 style="font-size:14px;margin-bottom:6px;color:var(--forest-deep);font-weight:700;">Prescribed Medications</h4>
      ${medsTable}
    </div>

    ${p.notes ? `
      <div style="margin-top:24px;background:var(--green-tint);border-radius:var(--radius-sm);padding:16px;border-left:4px solid var(--emerald);">
        <h4 style="font-size:13.5px;margin:0 0 6px;color:var(--forest-deep);font-weight:700;">Doctor Notes / Remarks</h4>
        <p style="margin:0;font-size:13px;color:var(--forest-soft);line-height:1.5;">${escapeHtml(p.notes)}</p>
      </div>` : ''}

    ${p.follow_up_date ? `
      <div style="margin-top:20px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-soft);font-weight:600;">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--blue-tint);color:#3b6fd1;display:flex;align-items:center;justify-content:center;">
          ${icon('calendar','style="width:12px;height:12px;"')}
        </div>
        <span>Recommended follow-up visit: <strong>${formatDate(p.follow_up_date)}</strong></span>
      </div>` : ''}
  `;
}
