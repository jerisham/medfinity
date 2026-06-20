health_records_js = 

const user = requireAuth();
if (!user) throw new Error('Not authenticated');

async function init(){
  const app = document.getElementById('app');
  app.innerHTML = renderSkeleton();

  try {
    const [records, vitals] = await Promise.all([
      HealthAPI.records().catch(() => []),
      HealthAPI.latestVitals().catch(() => null),
    ]);
    app.innerHTML = renderRecordsPage(records, vitals);
  } catch (err) {
    app.innerHTML = `<div class="main"><p style="color:var(--danger)">Failed to load records.</p></div>`;
  }
}

function renderSkeleton(){
  return `
    <div class="app">
      ${renderSidebar('records', user.user_type)}
      <div class="main">
        <div class="topbar"><h1 class="topbar__title">Health Records</h1></div>
        <div class="bento"><div class="tile tile--w4">${skeletonRows(3)}</div></div>
      </div>
    </div>`;
}

function renderRecordsPage(records, vitals){
  const role = user.user_type;
  const recordsList = records.length ? records.map(r => `
    <div class="list-row">
      <div class="list-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg></div>
      <div class="list-row__body">
        <div class="list-row__title">${escapeHtml(r.title)}</div>
        <div class="list-row__meta">${escapeHtml(r.record_type)} · ${formatDate(r.record_date)} · ${escapeHtml(r.hospital_name || 'Unknown hospital')}</div>
      </div>
      <a href="${r.file}" target="_blank" class="btn btn--sm btn--ghost">View</a>
    </div>`).join('') : emptyState('No health records', 'Upload your first medical record.', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>');

  const vitalsHtml = vitals ? `
    <div class="vitals-grid">
      <div class="vital"><div class="vital__num">${vitals.blood_pressure_systolic || '—'}/${vitals.blood_pressure_diastolic || '—'}</div><div class="vital__lab">Blood Pressure</div></div>
      <div class="vital"><div class="vital__num">${vitals.heart_rate || '—'}</div><div class="vital__lab">Heart Rate</div></div>
      <div class="vital"><div class="vital__num">${vitals.temperature || '—'}°C</div><div class="vital__lab">Temperature</div></div>
      <div class="vital"><div class="vital__num">${vitals.oxygen_saturation || '—'}%</div><div class="vital__lab">SpO2</div></div>
    </div>` : '<p style="color:var(--ink-soft);font-size:13px;margin-top:10px">No vitals recorded yet.</p>';

  return `
    <div class="app">
      ${renderSidebar('records', role)}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Health</div>
            <h1 class="topbar__title">Health Records</h1>
          </div>
        </div>

        <div class="bento">
          <div class="tile tile--w3">
            <div class="tile__head"><h3>Medical records</h3></div>
            <div class="list">${recordsList}</div>
          </div>

          <div class="tile tile--w1">
            <div class="tile__head"><h3>Latest vitals</h3></div>
            ${vitalsHtml}
            <a href="#" class="tile-link" style="margin-top:auto">View history</a>
          </div>
        </div>
      </div>
    </div>`;
}

init();

with open(f'{base_dir}/pages/health_records.html', 'w') as f:
    f.write(health_records_html)
with open(f'{base_dir}/js/health_records.js', 'w') as f:
    f.write(health_records_js)
