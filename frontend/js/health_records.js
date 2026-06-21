/* ===================================================================
   Medfinity — Health Records page
=================================================================== */

const user = requireAuth(['patient', 'doctor', 'caregiver']);

const ICONS = {
  heart:    '<path d="M12 21s-8-4.5-8-11a5 5 0 019-3 5 5 0 019 3c0 6.5-8 11-8 11z"/>',
  upload:   '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
  records:  '<path d="M9 2h6l1 2h3v2H4V4h3l2-2zM6 8h12v12H6z"/>',
  pill:     '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  file:     '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  drop:     '<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>',
  weight:   '<path d="M12 3a3 3 0 100 6 3 3 0 000-6z"/><path d="M20 21H4a1 1 0 01-1-1c0-4.4 3.6-8 8-8s8 3.6 8 8a1 1 0 01-1 1z"/>',
  eye:      '<path d="M1 12S4 4 12 4s11 8 11 8-3 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ── Render Shell ───────────────────────────────────────── */
if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('records', user.user_type === 'doctor' ? 'doctor' : 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'Health Records',
        sub: 'Your complete medical history, always at hand.',
        user
      })}

      <div class="bento" style="grid-template-columns:1fr;gap:20px;">

        <!-- Vitals summary row -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;" id="vitalsRow">
          ${skeletonVitalCards(5)}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

          <!-- Prescriptions -->
          <section class="tile" style="padding:20px 24px;">
            <div class="tile__head" style="margin-bottom:14px;">
              <h3>Prescriptions</h3>
              <span id="rxCount" style="font-size:12.5px;color:var(--ink-soft);font-weight:600;"></span>
            </div>
            <div class="list" id="rxList">${skeletonRows(3)}</div>
          </section>

          <!-- Appointment history -->
          <section class="tile" style="padding:20px 24px;">
            <div class="tile__head" style="margin-bottom:14px;">
              <h3>Visit History</h3>
            </div>
            <div class="list" id="visitList">${skeletonRows(3)}</div>
          </section>

        </div>

        <!-- Health records / documents -->
        <section class="tile" style="padding:20px 24px;">
          <div class="tile__head" style="margin-bottom:16px;">
            <h3>Medical Documents</h3>
            <button class="btn btn--primary btn--sm" id="uploadBtn">${icon('upload')} Upload Document</button>
          </div>

          <!-- Upload zone (hidden by default) -->
          <div class="upload-zone" id="uploadZone" style="display:none;margin-bottom:18px;">
            <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none;">
            ${icon('upload')}
            <p>Drag & drop or <strong style="color:var(--emerald-hover);cursor:pointer;" id="browseLabel">browse</strong> to upload</p>
            <span>PDF, JPG or PNG · max 10 MB</span>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
              <button class="btn btn--primary btn--sm" id="confirmUpload" style="display:none;">${icon('upload')} Upload</button>
              <button class="btn btn--ghost btn--sm" id="cancelUpload">Cancel</button>
            </div>
            <div id="uploadFileName" style="font-size:12.5px;color:var(--emerald-hover);margin-top:8px;font-weight:600;"></div>
          </div>

          <div class="records-grid" id="docsGrid">${skeletonDocCards(4)}</div>
        </section>

        <!-- Conditions & allergies -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <section class="tile" style="padding:20px 24px;">
            <div class="tile__head" style="margin-bottom:14px;">
              <h3>Chronic Conditions</h3>
            </div>
            <div id="conditionsList" style="font-size:13.5px;color:var(--forest-deep);line-height:1.7;">${skeletonRows(1)}</div>
          </section>
          <section class="tile" style="padding:20px 24px;">
            <div class="tile__head" style="margin-bottom:14px;">
              <h3>Allergies</h3>
            </div>
            <div id="allergiesList" style="font-size:13.5px;color:var(--forest-deep);line-height:1.7;">${skeletonRows(1)}</div>
          </section>
        </div>

      </div>
    </main>
  `;

  initPage();
}

/* ── Init ───────────────────────────────────────────────── */
function initPage() {
  loadVitals();
  loadPrescriptions();
  loadVisits();
  loadDocuments();
  loadProfile();
  setupUpload();
}

/* ── Vitals ─────────────────────────────────────────────── */
async function loadVitals() {
  const row = document.getElementById('vitalsRow');
  try {
    const v = await HealthAPI.latestVitals();
    const cards = [
      { icon: 'activity', label: 'Blood Pressure', val: v.blood_pressure || '—', unit: 'mmHg', bg: 'var(--rose-tint)', col: '#c0436b' },
      { icon: 'heart',    label: 'Heart Rate',     val: v.heart_rate    || '—', unit: 'bpm',  bg: 'var(--rose-tint)', col: '#c0436b' },
      { icon: 'drop',     label: 'Blood Group',    val: v.blood_group   || (user.blood_group || '—'), unit: '',     bg: 'var(--blue-tint)',  col: '#3b6fd1' },
      { icon: 'weight',   label: 'Weight',         val: v.weight        || '—', unit: 'kg',   bg: 'var(--peach-tint)', col: '#d98a3d' },
      { icon: 'eye',      label: 'Blood Sugar',    val: v.blood_sugar   || '—', unit: 'mg/dL',bg: 'var(--green-tint)', col: 'var(--emerald-hover)' },
    ];
    row.innerHTML = cards.map(c => `
      <div class="tile" style="padding:18px;gap:8px;background:${c.bg};border-color:transparent;">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;">
          ${icon(c.icon, `style="width:18px;height:18px;color:${c.col};"`)}
        </div>
        <div style="font-size:11.5px;font-weight:700;color:${c.col};text-transform:uppercase;letter-spacing:.05em;">${c.label}</div>
        <div style="font-size:26px;font-weight:800;color:var(--forest-deep);font-family:var(--font-display);line-height:1;">${escapeHtml(String(c.val))}</div>
        ${c.unit ? `<div style="font-size:11px;color:var(--ink-soft);font-weight:600;">${c.unit}</div>` : ''}
      </div>`).join('');
  } catch {
    const cards = [
      { label: 'Blood Pressure', val: '—' }, { label: 'Heart Rate', val: '—' },
      { label: 'Blood Group',    val: user.blood_group || '—' },
      { label: 'Weight',         val: '—' }, { label: 'Blood Sugar', val: '—' },
    ];
    row.innerHTML = cards.map(c => `
      <div class="tile" style="padding:18px;gap:8px;">
        <div style="font-size:11.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">${c.label}</div>
        <div style="font-size:26px;font-weight:800;color:var(--forest-deep);font-family:var(--font-display);">${escapeHtml(c.val)}</div>
      </div>`).join('');
  }
}

/* ── Prescriptions ──────────────────────────────────────── */
async function loadPrescriptions() {
  const list = document.getElementById('rxList');
  const count = document.getElementById('rxCount');
  try {
    const data = await PrescriptionsAPI.list();
    const items = data.results || data;
    count.textContent = `${items.length} total`;
    if (!items.length) { list.innerHTML = emptyState('No prescriptions yet', '', icon('pill')); return; }
    list.innerHTML = items.map(p => `
      <div class="list-row">
        <div class="list-row__icon" style="background:var(--lilac-tint);">${icon('pill', 'style="color:#7c5cbf;"')}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHtml(p.diagnosis || 'Prescription')}</div>
          <div class="list-row__meta">Dr. ${escapeHtml(p.doctor_name || 'Doctor')} · ${formatDate(p.created_at)}</div>
        </div>
        <span class="badge badge--${p.status || 'active'}">${(p.status || 'active').replace(/_/g,' ')}</span>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState("Couldn't load prescriptions", '', icon('pill'));
  }
}

/* ── Visit History ──────────────────────────────────────── */
async function loadVisits() {
  const list = document.getElementById('visitList');
  try {
    const data = await AppointmentsAPI.list();
    const items = (data.results || data).filter(a => a.status === 'completed').slice(0, 8);
    if (!items.length) { list.innerHTML = emptyState('No past visits', '', icon('calendar')); return; }
    list.innerHTML = items.map(a => `
      <div class="list-row">
        <div class="list-row__icon">${icon('calendar')}</div>
        <div class="list-row__body">
          <div class="list-row__title">Dr. ${escapeHtml(a.doctor_name || 'Doctor')}</div>
          <div class="list-row__meta">${escapeHtml(a.doctor_specialization || 'Specialist')} · ${formatDate(a.appointment_date)}</div>
        </div>
        <span class="badge badge--completed">Visited</span>
      </div>`).join('');
  } catch {
    list.innerHTML = emptyState("Couldn't load visits", '', icon('calendar'));
  }
}

/* ── Documents ──────────────────────────────────────────── */
async function loadDocuments() {
  const grid = document.getElementById('docsGrid');
  try {
    const data = await HealthAPI.records();
    const items = data.results || data;
    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;">${emptyState('No documents yet', 'Upload your first medical document above.', icon('file'))}</div>`;
      return;
    }
    grid.innerHTML = items.map(r => `
      <div class="record-card">
        <div class="record-card__icon">${icon('file')}</div>
        <div class="record-card__title">${escapeHtml(r.title || r.record_type || 'Document')}</div>
        <div class="record-card__sub">${formatDate(r.created_at || r.date)}</div>
        ${r.file_url ? `<a class="btn btn--ghost btn--sm" href="${escapeHtml(r.file_url)}" target="_blank" style="align-self:flex-start;">View</a>` : ''}
      </div>`).join('');
  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1;">${emptyState("Couldn't load documents", '', icon('file'))}</div>`;
  }
}

/* ── Profile (conditions/allergies) ────────────────────── */
async function loadProfile() {
  try {
    const p = await UsersAPI.profile();
    const conditions = document.getElementById('conditionsList');
    const allergies  = document.getElementById('allergiesList');

    conditions.innerHTML = p.chronic_conditions
      ? p.chronic_conditions.split(',').map(c => c.trim()).filter(Boolean)
          .map(c => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--glass-border);">${icon('shield','style="width:14px;height:14px;color:var(--emerald-hover);"')} ${escapeHtml(c)}</div>`).join('')
      : emptyState('No conditions recorded', 'Your doctor will add these.', icon('shield'));

    allergies.innerHTML = p.allergies
      ? p.allergies.split(',').map(a => a.trim()).filter(Boolean)
          .map(a => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--glass-border);"><span style="width:8px;height:8px;border-radius:50%;background:var(--danger);flex-shrink:0;display:inline-block;"></span> ${escapeHtml(a)}</div>`).join('')
      : emptyState('No allergies recorded', '', icon('shield'));
  } catch {
    document.getElementById('conditionsList').innerHTML = emptyState("Couldn't load", '', icon('shield'));
    document.getElementById('allergiesList').innerHTML  = emptyState("Couldn't load", '', icon('shield'));
  }
}

/* ── Upload ─────────────────────────────────────────────── */
function setupUpload() {
  const btn    = document.getElementById('uploadBtn');
  const zone   = document.getElementById('uploadZone');
  const input  = document.getElementById('fileInput');
  const browse = document.getElementById('browseLabel');
  const cancel = document.getElementById('cancelUpload');
  const confirm= document.getElementById('confirmUpload');
  const fname  = document.getElementById('uploadFileName');

  btn.addEventListener('click', () => { zone.style.display = 'block'; btn.style.display = 'none'; });
  cancel.addEventListener('click', () => { zone.style.display = 'none'; btn.style.display = ''; input.value = ''; fname.textContent = ''; confirm.style.display = 'none'; });
  browse.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    if (input.files[0]) {
      fname.textContent = input.files[0].name;
      confirm.style.display = 'inline-flex';
    }
  });

  ['dragover', 'dragenter'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('drag-over'); }));
  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) { input.files = e.dataTransfer.files; fname.textContent = file.name; confirm.style.display = 'inline-flex'; }
  });

  confirm.addEventListener('click', async () => {
    if (!input.files[0]) return;
    confirm.disabled = true; confirm.textContent = 'Uploading…';
    const form = new FormData();
    form.append('file', input.files[0]);
    form.append('title', input.files[0].name);
    try {
      await apiCall('/health-records/', { method: 'POST', body: form });
      showToast('Document uploaded!', 'success');
      cancel.click();
      loadDocuments();
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      confirm.disabled = false; confirm.textContent = 'Upload';
    }
  });
}

/* ── Skeleton helpers ───────────────────────────────────── */
function skeletonVitalCards(n) {
  return Array.from({length: n}).map(() => `
    <div class="tile" style="padding:18px;gap:8px;">
      <div class="skeleton" style="width:36px;height:36px;border-radius:10px;"></div>
      <div class="skeleton skel-line" style="width:60%;height:10px;"></div>
      <div class="skeleton skel-line" style="width:40%;height:22px;"></div>
    </div>`).join('');
}

function skeletonDocCards(n) {
  return Array.from({length: n}).map(() => `
    <div class="record-card" style="pointer-events:none;">
      <div class="skeleton" style="width:40px;height:40px;border-radius:10px;"></div>
      <div class="skeleton skel-line" style="width:70%;height:14px;"></div>
      <div class="skeleton skel-line" style="width:50%;height:11px;"></div>
    </div>`).join('');
}
