/* ===================================================================
   Medfinity — Medicine Reminders (Patient)
   CRUD for daily medicine reminders, plus a client-side clock that
   fires a browser notification (and in-app toast) at the scheduled time.
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  pill: '<path d="M4.5 10.5l7-7a3.5 3.5 0 015 5l-7 7a3.5 3.5 0 01-5-5z"/><path d="M8 8l5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const FREQUENCIES = [
  ['daily', 'Once daily'],
  ['twice_daily', 'Twice daily'],
  ['thrice_daily', 'Three times daily'],
  ['weekly', 'Weekly'],
];

let allReminders = [];

if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('reminders', 'patient')}
    <main class="main">
      ${renderTopbar({
        title: 'Medicine Reminders',
        sub: "Never miss a dose — we'll notify you right on this device at the scheduled time.",
        user
      })}

      <section class="tile" style="padding:20px 24px;">
        <div class="tile__head" style="margin-bottom:16px;">
          <h3 style="display:flex;align-items:center;gap:8px;">
            ${icon('clock', 'style="color:var(--emerald);width:20px;height:20px;"')}
            Your Reminders
          </h3>
          <button class="btn btn--primary btn--sm" id="addReminderBtn">${icon('plus','style="width:14px;height:14px;"')} Add Reminder</button>
        </div>
        <div id="reminderList">${skeletonRows(3)}</div>
      </section>
    </main>

    <div class="modal-overlay" id="reminderModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:20px;">
      <div class="tile" style="background:#fff; width:100%; max-width:480px; padding:28px; border-radius:var(--radius-lg); position:relative;">
        <button id="closeReminderModal" style="position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:var(--ink-soft);">${icon('x', 'style="width:20px;height:20px;"')}</button>
        <h3 id="reminderModalTitle" style="margin-bottom:18px; font-size:20px; color:var(--forest-deep);">Add Reminder</h3>
        <form id="reminderForm">
          <input type="hidden" id="reminderId">
          <div class="field">
            <label for="medicine_name">Medicine name</label>
            <input id="medicine_name" required placeholder="e.g. Metformin">
          </div>
          <div class="field-row">
            <div class="field">
              <label for="dosage">Dosage</label>
              <input id="dosage" required placeholder="e.g. 500mg">
            </div>
            <div class="field">
              <label for="time">Time</label>
              <input id="time" type="time" required>
            </div>
          </div>
          <div class="field">
            <label for="frequency">Frequency</label>
            <select id="frequency">${FREQUENCIES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="start_date">Start date</label>
              <input id="start_date" type="date" required>
            </div>
            <div class="field">
              <label for="end_date">End date (optional)</label>
              <input id="end_date" type="date">
            </div>
          </div>
          <div class="field">
            <label for="notes">Notes (optional)</label>
            <textarea id="notes" rows="2" placeholder="e.g. Take with food"></textarea>
          </div>
          <div id="reminderFormError" class="form-error"></div>
          <button class="btn btn--primary btn--block" id="saveReminderBtn" type="submit">Save Reminder</button>
        </form>
      </div>
    </div>
  `;

  initPage();
}

function initPage() {
  document.getElementById('start_date').value = new Date().toISOString().slice(0, 10);

  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  document.getElementById('addReminderBtn').addEventListener('click', () => openModal());
  document.getElementById('closeReminderModal').addEventListener('click', closeModal);
  document.getElementById('reminderModal').addEventListener('click', (e) => {
    if (e.target.id === 'reminderModal') closeModal();
  });
  document.getElementById('reminderForm').addEventListener('submit', saveReminder);

  loadReminders();
  setInterval(checkDueReminders, 30000); // check every 30s for a due dose
}

function openModal(reminder = null) {
  const modal = document.getElementById('reminderModal');
  document.getElementById('reminderModalTitle').textContent = reminder ? 'Edit Reminder' : 'Add Reminder';
  document.getElementById('reminderId').value = reminder?.id || '';
  document.getElementById('medicine_name').value = reminder?.medicine_name || '';
  document.getElementById('dosage').value = reminder?.dosage || '';
  document.getElementById('time').value = reminder?.time?.slice(0,5) || '';
  document.getElementById('frequency').value = reminder?.frequency || 'daily';
  document.getElementById('start_date').value = reminder?.start_date || new Date().toISOString().slice(0, 10);
  document.getElementById('end_date').value = reminder?.end_date || '';
  document.getElementById('notes').value = reminder?.notes || '';
  document.getElementById('reminderFormError').classList.remove('is-visible');
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('reminderModal').style.display = 'none';
}

async function loadReminders() {
  const list = document.getElementById('reminderList');
  try {
    const data = await NotificationsAPI.reminders();
    allReminders = data.results || data;
    renderReminders();
  } catch (err) {
    list.innerHTML = emptyState("Couldn't load reminders", err.message, icon('pill'));
  }
}

function renderReminders() {
  const list = document.getElementById('reminderList');
  if (!allReminders.length) {
    list.innerHTML = emptyState('No reminders set', 'Add one so we can prompt you when it\'s time for a dose.', icon('pill'));
    return;
  }

  const freqLabel = (v) => (FREQUENCIES.find(f => f[0] === v) || [v, v])[1];

  list.innerHTML = allReminders.map(r => `
    <div class="list-row">
      <div class="list-row__icon" style="background:var(--green-tint);color:var(--emerald-hover);">${icon('pill')}</div>
      <div class="list-row__body">
        <div class="list-row__title">${escapeHtml(r.medicine_name)} · ${escapeHtml(r.dosage)}</div>
        <div class="list-row__meta">${formatTime(r.time)} · ${freqLabel(r.frequency)}${r.end_date ? ` · until ${formatDate(r.end_date)}` : ''}</div>
      </div>
      <button class="btn btn--ghost btn--sm" data-edit="${r.id}">Edit</button>
      <button class="btn btn--ghost btn--sm" data-delete="${r.id}" style="border-color:var(--danger);color:var(--danger);">${icon('trash','style="width:13px;height:13px;"')}</button>
    </div>`).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openModal(allReminders.find(r => r.id == btn.dataset.edit)));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this reminder?')) return;
      try {
        await NotificationsAPI.deleteReminder(btn.dataset.delete);
        showToast('Reminder deleted', 'default');
        loadReminders();
      } catch (err) {
        showToast(err.message || 'Could not delete reminder.', 'error');
      }
    });
  });
}

async function saveReminder(e) {
  e.preventDefault();
  const errBox = document.getElementById('reminderFormError');
  errBox.classList.remove('is-visible');
  const btn = document.getElementById('saveReminderBtn');

  const id = document.getElementById('reminderId').value;
  const payload = {
    medicine_name: document.getElementById('medicine_name').value.trim(),
    dosage: document.getElementById('dosage').value.trim(),
    time: document.getElementById('time').value,
    frequency: document.getElementById('frequency').value,
    start_date: document.getElementById('start_date').value,
    end_date: document.getElementById('end_date').value || null,
    notes: document.getElementById('notes').value.trim(),
    is_active: true,
  };

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    if (id) {
      await NotificationsAPI.updateReminder(id, payload);
      showToast('Reminder updated', 'success');
    } else {
      await NotificationsAPI.createReminder(payload);
      showToast('Reminder added', 'success');
    }
    closeModal();
    loadReminders();
  } catch (err) {
    errBox.textContent = err.message || 'Could not save this reminder.';
    errBox.classList.add('is-visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Reminder';
  }
}

/* ── Live dose alerts ───────────────────────────────────────
   Every 30s, check whether any active reminder's scheduled time matches
   "now" (within a 1-minute window) and the reminder is within its active
   date range — if so, fire a browser notification + in-app toast. */
const remindedToday = new Set();

function checkDueReminders() {
  if (!allReminders.length) return;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  allReminders.forEach(r => {
    if (!r.is_active) return;
    if (r.start_date && r.start_date > todayStr) return;
    if (r.end_date && r.end_date < todayStr) return;

    const [h, m] = r.time.split(':').map(Number);
    const diffMins = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    const key = `${r.id}-${todayStr}`;

    if (diffMins >= 0 && diffMins < 1 && !remindedToday.has(key)) {
      remindedToday.add(key);
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Medicine Reminder', {
          body: `Time to take ${r.medicine_name} (${r.dosage}).`,
          icon: '/favicon.ico',
        });
      }
      showToast(`💊 Time to take ${r.medicine_name} (${r.dosage})`, 'default');
    }
  });
}
