/* ===================================================================
   Medfinity — Video Consult page
   Uses the browser's WebRTC APIs (getUserMedia) for camera/mic preview.
   Peer-to-peer signalling would require a backend WebSocket/WebRTC server
   (e.g. Django Channels) — this page implements the full UI and local
   camera stream ready for that integration.
=================================================================== */

const user = requireAuth(['patient', 'doctor']);

const ICONS = {
  video:     '<path d="M15 10l5-3v10l-5-3M3 6h12v12H3z"/>',
  videoOff:  '<path d="M16 16L4 4M3 6h9M3 6v12h12v-3"/><path d="M20 7l-5 3 5 3V7z"/>',
  mic:       '<path d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z"/><path d="M19 11a7 7 0 01-14 0M12 19v4M8 23h8"/>',
  micOff:    '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/>',
  phone:     '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.8.4 1.7.7 2.5a2 2 0 01-.5 2L8.1 9.9a16 16 0 006 6l1.7-1.2a2 2 0 012-.5c.8.3 1.7.6 2.5.7a2 2 0 011.7 2z"/>',
  calendar:  '<path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  screen:    '<path d="M2 3h20v13H2zM8 21l4-5 4 5M12 16v5"/>',
  notes:     '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  check:     '<path d="M20 6L9 17l-5-5"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ── State ──────────────────────────────────────────────── */
let localStream    = null;
let isMicOn        = true;
let isCamOn        = true;
let callTimer      = null;
let callSeconds    = 0;
let currentAppt    = null;

/* ── Render Shell ───────────────────────────────────────── */
if (document.getElementById('app')) {
  const isDoctor = user.user_type === 'doctor';
  document.getElementById('app').innerHTML = `
    ${renderSidebar('video', isDoctor ? 'doctor' : 'patient')}
    <main class="main" style="padding-bottom:0;display:flex;flex-direction:column;">
      ${renderTopbar({
        title: 'Video Consult',
        sub: isDoctor ? 'Start or join a video consultation with your patient.' : 'Connect with your doctor via video.',
        user,
        hideSearch: isDoctor
      })}

      <div class="video-layout" style="flex:1;min-height:0;">

        <!-- Left: Video stage -->
        <div class="video-stage" id="videoStage">
          <!-- Status bar -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:rgba(0,0,0,.25);position:absolute;top:0;left:0;right:0;z-index:10;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span id="callStatusDot" style="width:10px;height:10px;border-radius:50%;background:#6b7570;display:inline-block;"></span>
              <span id="callStatusLabel" style="color:rgba(255,255,255,.85);font-size:13px;font-weight:600;">Not connected</span>
            </div>
            <div id="callTimer" style="color:rgba(255,255,255,.7);font-size:14px;font-weight:700;font-family:var(--font-display);letter-spacing:.05em;display:none;">00:00</div>
          </div>

          <!-- Remote / waiting feed -->
          <div class="video-stage__feed" id="remoteFeed">
            <div id="waitingState" style="text-align:center;color:rgba(255,255,255,.5);">
              <div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                ${icon('video', 'style="width:36px;height:36px;color:rgba(255,255,255,.4);"')}
              </div>
              <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Waiting for ${isDoctor ? 'patient' : 'doctor'}…</div>
              <div style="font-size:13px;opacity:.6;">Make sure your camera and microphone are allowed.</div>
              <button class="btn btn--primary" id="joinCallBtn" style="margin-top:24px;">${icon('video')} Join Call</button>
            </div>
            <video id="remoteVideo" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:none;"></video>
          </div>

          <!-- Self preview (PiP) -->
          <div class="video-stage__self" id="selfPip">
            <video id="localVideo" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;background:#1a2332;"></video>
            <div id="camOffLabel" style="display:none;position:absolute;inset:0;background:#1a2332;align-items:center;justify-content:center;color:rgba(255,255,255,.5);font-size:11px;font-weight:700;flex-direction:column;gap:6px;">
              ${icon('videoOff', 'style="width:22px;height:22px;"')}
              <span>Camera off</span>
            </div>
          </div>

          <!-- Controls bar -->
          <div class="video-stage__controls" id="ctrlBar">
            <button class="vctrl vctrl--active" id="micBtn" title="Toggle microphone">
              ${icon('mic')}
            </button>
            <button class="vctrl vctrl--active" id="camBtn" title="Toggle camera">
              ${icon('video')}
            </button>
            <button class="vctrl vctrl--end" id="endBtn" title="End call">
              ${icon('phone')}
            </button>
          </div>
        </div>

        <!-- Right panel -->
        <div class="video-panel">

          <!-- Appointment info -->
          <div class="video-panel-card" id="apptInfoCard">
            <h3>${icon('calendar','style="width:15px;height:15px;color:var(--emerald-hover);display:inline;margin-right:6px;"')} Appointment Details</h3>
            <div id="apptDetails">${skeletonApptRows(3)}</div>
          </div>

          <!-- Upcoming video appointments -->
          <div class="video-panel-card" style="flex:1;overflow:hidden;">
            <h3>${icon('clock','style="width:15px;height:15px;color:var(--emerald-hover);display:inline;margin-right:6px;"')} Video Appointments</h3>
            <div class="list" id="videoApptList" style="flex:1;overflow-y:auto;margin-top:4px;">${skeletonRows(3)}</div>
          </div>

          <!-- Notes -->
          <div class="video-panel-card">
            <h3>${icon('notes','style="width:15px;height:15px;color:var(--emerald-hover);display:inline;margin-right:6px;"')} Session Notes</h3>
            <textarea class="video-notes-area" id="sessionNotes" placeholder="Jot down notes during the consultation…"></textarea>
            <button class="btn btn--primary btn--sm" id="saveNotes">${icon('check')} Save Notes</button>
          </div>

        </div>
      </div>
    </main>
  `;

  initVideo();
}

/* ── Init ───────────────────────────────────────────────── */
function initVideo() {
  loadVideoAppointments();

  document.getElementById('joinCallBtn').addEventListener('click', startLocalStream);
  document.getElementById('micBtn').addEventListener('click', toggleMic);
  document.getElementById('camBtn').addEventListener('click', toggleCam);
  document.getElementById('endBtn').addEventListener('click', endCall);
  document.getElementById('saveNotes').addEventListener('click', saveNotes);
}

/* ── Local stream ───────────────────────────────────────── */
async function startLocalStream() {
  const joinBtn = document.getElementById('joinCallBtn');
  joinBtn.disabled = true; joinBtn.textContent = 'Connecting…';

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = localStream;

    // Hide waiting state, update status
    document.getElementById('waitingState').style.display = 'none';
    setCallStatus('connected', 'Connected');
    startCallTimer();
    joinBtn.style.display = 'none';
  } catch (err) {
    joinBtn.disabled = false; joinBtn.textContent = '🎥 Join Call';
    let msg = 'Could not access camera/mic.';
    if (err.name === 'NotAllowedError') msg = 'Permission denied. Please allow camera and microphone access in your browser.';
    else if (err.name === 'NotFoundError') msg = 'No camera or microphone found on this device.';
    showToast(msg, 'error');
  }
}

/* ── Mic / Cam toggles ──────────────────────────────────── */
function toggleMic() {
  if (!localStream) { showToast('Join the call first.', 'default'); return; }
  isMicOn = !isMicOn;
  localStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
  const btn = document.getElementById('micBtn');
  btn.className = `vctrl ${isMicOn ? 'vctrl--active' : 'vctrl--default'}`;
  btn.innerHTML = icon(isMicOn ? 'mic' : 'micOff');
  btn.title = isMicOn ? 'Mute microphone' : 'Unmute microphone';
}

function toggleCam() {
  if (!localStream) { showToast('Join the call first.', 'default'); return; }
  isCamOn = !isCamOn;
  localStream.getVideoTracks().forEach(t => t.enabled = isCamOn);
  const btn  = document.getElementById('camBtn');
  const label= document.getElementById('camOffLabel');
  btn.className = `vctrl ${isCamOn ? 'vctrl--active' : 'vctrl--default'}`;
  btn.innerHTML = icon(isCamOn ? 'video' : 'videoOff');
  btn.title = isCamOn ? 'Turn off camera' : 'Turn on camera';
  label.style.display = isCamOn ? 'none' : 'flex';
}

/* ── End call ───────────────────────────────────────────── */
function endCall() {
  if (!localStream && !confirm('Are you sure you want to leave?')) return;
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  stopCallTimer();
  setCallStatus('idle', 'Call ended');

  document.getElementById('localVideo').srcObject = null;
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('remoteVideo').style.display = 'none';
  document.getElementById('waitingState').style.display = 'flex';
  document.getElementById('joinCallBtn').style.display = 'inline-flex';
  document.getElementById('joinCallBtn').disabled = false;
  document.getElementById('joinCallBtn').innerHTML = `${icon('video')} Rejoin Call`;
  document.getElementById('camOffLabel').style.display = 'none';
  isMicOn = true; isCamOn = true;
  document.getElementById('micBtn').className = 'vctrl vctrl--active';
  document.getElementById('micBtn').innerHTML = icon('mic');
  document.getElementById('camBtn').className = 'vctrl vctrl--active';
  document.getElementById('camBtn').innerHTML = icon('video');
  showToast('Call ended.', 'default');
}

/* ── Timer ──────────────────────────────────────────────── */
function startCallTimer() {
  callSeconds = 0;
  const display = document.getElementById('callTimer');
  display.style.display = 'block';
  callTimer = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    display.textContent = `${m}:${s}`;
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimer); callTimer = null;
  document.getElementById('callTimer').style.display = 'none';
}

function setCallStatus(state, label) {
  const dot = document.getElementById('callStatusDot');
  const lbl = document.getElementById('callStatusLabel');
  lbl.textContent = label;
  dot.style.background = state === 'connected' ? '#22c55e' : state === 'idle' ? '#9ca3af' : '#f59e0b';
  if (state === 'connected') dot.style.animation = 'breathe 2s ease-in-out infinite';
  else dot.style.animation = '';
}

/* ── Appointments ───────────────────────────────────────── */
async function loadVideoAppointments() {
  const list  = document.getElementById('videoApptList');
  const info  = document.getElementById('apptDetails');
  try {
    const data  = await AppointmentsAPI.upcoming();
    const items = (data.results || data).filter(a => a.appointment_type === 'video');

    if (!items.length) {
      list.innerHTML = emptyState('No video appointments', 'Book one from the Appointments page.', icon('video'));
      info.innerHTML = `<div style="color:var(--ink-soft);font-size:13px;text-align:center;padding:12px 0;">No upcoming video appointment.</div>`;
      return;
    }

    // Show the soonest appointment in info panel
    currentAppt = items[0];
    const apptPerson = user.user_type === 'doctor'
      ? escapeHtml(currentAppt.patient_name  || 'Patient')
      : `Dr. ${escapeHtml(currentAppt.doctor_name || 'Doctor')}`;
    info.innerHTML = `
      <div class="appt-detail-row"><span>With</span><span>${apptPerson}</span></div>
      <div class="appt-detail-row"><span>Date</span><span>${formatDate(currentAppt.appointment_date)}</span></div>
      <div class="appt-detail-row"><span>Time</span><span>${formatTime(currentAppt.appointment_time || '00:00')}</span></div>
      <div class="appt-detail-row"><span>Type</span><span>Video Consultation</span></div>
      <div class="appt-detail-row"><span>Status</span><span><span class="badge badge--${currentAppt.status}">${currentAppt.status.replace(/_/g,' ')}</span></span></div>
    `;

    list.innerHTML = items.map(a => {
      const person = user.user_type === 'doctor'
        ? escapeHtml(a.patient_name  || 'Patient')
        : `Dr. ${escapeHtml(a.doctor_name || 'Doctor')}`;
      return `
        <div class="list-row" style="cursor:pointer;" onclick="selectAppt(${JSON.stringify(a).replace(/"/g,'&quot;')})">
          <div class="list-row__icon">${icon('video')}</div>
          <div class="list-row__body">
            <div class="list-row__title">${person}</div>
            <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time || '00:00')}</div>
          </div>
          <span class="badge badge--${a.status}" style="font-size:10px;">${a.status.replace(/_/g,' ')}</span>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = emptyState("Couldn't load appointments", 'Check that the backend is running.', icon('video'));
    info.innerHTML = `<div style="color:var(--ink-soft);font-size:13px;padding:8px 0;">Could not load appointment details.</div>`;
  }
}

function selectAppt(a) {
  currentAppt = a;
  const info = document.getElementById('apptDetails');
  const apptPerson = user.user_type === 'doctor'
    ? escapeHtml(a.patient_name  || 'Patient')
    : `Dr. ${escapeHtml(a.doctor_name || 'Doctor')}`;
  info.innerHTML = `
    <div class="appt-detail-row"><span>With</span><span>${apptPerson}</span></div>
    <div class="appt-detail-row"><span>Date</span><span>${formatDate(a.appointment_date)}</span></div>
    <div class="appt-detail-row"><span>Time</span><span>${formatTime(a.appointment_time || '00:00')}</span></div>
    <div class="appt-detail-row"><span>Type</span><span>Video Consultation</span></div>
    <div class="appt-detail-row"><span>Status</span><span><span class="badge badge--${a.status}">${a.status.replace(/_/g,' ')}</span></span></div>
  `;
}

/* ── Notes ──────────────────────────────────────────────── */
function saveNotes() {
  const notes = document.getElementById('sessionNotes').value.trim();
  if (!notes) { showToast('Nothing to save.', 'default'); return; }
  // Persist to localStorage keyed by appointment
  const key = `medfinity_notes_${currentAppt?.id || 'general'}`;
  localStorage.setItem(key, notes);
  showToast('Notes saved locally.', 'success');
}

/* ── Skeleton helpers ───────────────────────────────────── */
function skeletonApptRows(n) {
  return Array.from({length: n}).map(() => `
    <div class="appt-detail-row" style="pointer-events:none;">
      <div class="skeleton skel-line" style="width:35%;height:11px;"></div>
      <div class="skeleton skel-line" style="width:50%;height:11px;"></div>
    </div>`).join('');
}
