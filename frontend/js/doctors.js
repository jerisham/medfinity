/* ===================================================================
   Medfinity — Registered Doctors page
=================================================================== */

const user = requireAuth(['patient', 'doctor', 'caregiver']);

const ICONS = {
  calendar: '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  star:     '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  stethoscope: '<path d="M4.8 2.3A.3.3 0 104 3v3a6 6 0 006 6 6 6 0 006-6V3a.3.3 0 10-.8-.7"/><path d="M6 15v1a6 6 0 006 6 6 6 0 006-6v-4"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let allDoctors = [];
let activeSpecialty = 'all';

const SPECIALTIES = [
  { key: 'all',           label: 'All Specialties', color: 'var(--green-tint)',  text: 'var(--emerald-hover)' },
  { key: 'General',       label: 'General Medicine',color: 'var(--blue-tint)',   text: '#3b6fd1' },
  { key: 'Cardiology',    label: 'Cardiology',      color: 'var(--rose-tint)',   text: '#c0436b' },
  { key: 'Dermatology',   label: 'Dermatology',     color: 'var(--peach-tint)',  text: '#d98a3d' },
  { key: 'Neurology',     label: 'Neurology',       color: 'var(--lilac-tint)',  text: '#7c5cbf' },
  { key: 'Orthopedics',   label: 'Orthopedics',     color: 'var(--green-tint)',  text: 'var(--emerald-hover)' },
  { key: 'Pediatrics',    label: 'Pediatrics',      color: '#fff3e0',            text: '#e65100' },
];

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('doctors', user.user_type)}
    <main class="main">
      ${renderTopbar({
        title: 'Registered Doctors',
        sub: 'Browse, find and schedule appointments with our verified specialists.',
        user
      })}

      <div class="bento" style="grid-template-columns: 1fr; gap: 20px;">
        <!-- Search & Specialties Filter -->
        <section class="tile" style="padding: 18px 24px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div class="appt-searchbar">
              ${icon('search')}
              <input id="doctorSearch" placeholder="Search by name, specialization, or hospital…" autocomplete="off">
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

        <!-- Doctors Directory list -->
        <section class="tile" style="padding: 24px;">
          <div class="tile__head" style="margin-bottom: 20px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${icon('stethoscope', 'style="color:var(--emerald);width:20px;height:20px;"')}
              <h3 style="margin:0;">Registered Specialists</h3>
            </div>
            <span id="doctorCount" style="font-size: 13px; color: var(--ink-soft); font-weight: 600;"></span>
          </div>
          
          <div class="doctor-grid" id="doctorGrid">
            ${skeletonDoctors(6)}
          </div>
        </section>
      </div>
    </main>
  `;

  initPage();
}

function initPage() {
  loadDoctors();

  document.getElementById('doctorSearch').addEventListener('input', () => filterDoctors());
  document.getElementById('specialtyChips').addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeSpecialty = btn.dataset.specialty;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    filterDoctors();
  });

  // Pre-fill search from URL param (used by global topbar search)
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    const input = document.getElementById('doctorSearch');
    input.value = q;
    // filter once doctors are loaded
    input.dataset.pendingQ = q;
  }
}

async function loadDoctors() {
  try {
    // If we have a URL search param, use server-side search for initial load
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    let data;
    if (q) {
      data = await UsersAPI.doctorSearch(q);
    } else {
      data = await UsersAPI.doctors();
    }
    allDoctors = data.results || data;
    renderDoctors(allDoctors);
    // Apply pending search from URL param
    const input = document.getElementById('doctorSearch');
    if (input?.dataset.pendingQ) {
      filterDoctors();
    }
  } catch (err) {
    document.getElementById('doctorGrid').innerHTML = emptyState(
      'Could not load doctors',
      'Please check if the backend service is running.',
      icon('stethoscope')
    );
  }
}

function filterDoctors() {
  const q = document.getElementById('doctorSearch').value.toLowerCase();
  let list = allDoctors;
  if (activeSpecialty !== 'all') {
    list = list.filter(d => (d.specialization || '').toLowerCase().includes(activeSpecialty.toLowerCase()));
  }
  if (q) {
    list = list.filter(d => `${d.first_name} ${d.last_name} ${d.specialization}`.toLowerCase().includes(q));
  }
  renderDoctors(list);
}

function renderDoctors(docs) {
  const grid = document.getElementById('doctorGrid');
  const count = document.getElementById('doctorCount');
  count.textContent = `${docs.length} doctor${docs.length !== 1 ? 's' : ''} registered`;

  if (!docs.length) {
    grid.innerHTML = emptyState(
      'No specialists found',
      'Try searching with another specialty or doctor name.',
      icon('search')
    );
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
      <div class="doctor-card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div>
          <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 12px;">
            <div class="doctor-card__avatar" style="margin: 0;">${initials(name)}</div>
            <div style="flex: 1;">
              <div class="doctor-card__name" style="font-size: 16px; font-weight: 700; color: var(--forest-deep);">Dr. ${escapeHtml(name)}</div>
              <div class="doctor-card__spec" style="color: var(--emerald); font-weight: 600; font-size: 13px; margin: 2px 0 6px;">${escapeHtml(d.specialization || 'General Practitioner')}</div>
              <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--ink-soft);">
                ${starHtml}
                <span>(${rating > 0 ? rating.toFixed(1) : 'No reviews'})</span>
              </div>
            </div>
          </div>
          
          <div style="font-size: 13px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 14px;">
            Experienced specialist providing comprehensive diagnosis and personalized treatment plans.
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-color); margin-bottom: 14px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-soft); font-weight: 700;">Consultation Fee</div>
              <div style="font-size: 15px; font-weight: 700; color: var(--forest-deep);">${fee}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-soft); font-weight: 700;">Experience</div>
              <div style="font-size: 15px; font-weight: 700; color: var(--forest-deep); text-align: right;">${d.experience_years || 0} Years</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <a href="appointments.html?doctor=${d.id}" class="btn btn--primary btn--sm" style="flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              ${icon('calendar', 'style="width:14px;height:14px;"')} Book Consult
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function skeletonDoctors(n) {
  return Array.from({length: n}).map(() => `
    <div class="doctor-card" style="pointer-events:none; opacity: 0.7;">
      <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 12px;">
        <div class="skeleton" style="width:56px;height:56px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton skel-line" style="width:70%;height:14px;"></div>
          <div class="skeleton skel-line" style="width:50%;height:11px;margin-top:6px;"></div>
        </div>
      </div>
      <div class="skeleton skel-line" style="width:100%;height:10px;margin-top:14px;"></div>
      <div class="skeleton skel-line" style="width:85%;height:10px;margin-top:6px;"></div>
    </div>`).join('');
}
