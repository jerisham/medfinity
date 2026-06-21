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
let localStream    = null; // Not needed for Jitsi API, but we keep/use for interface states
let jitsiApi       = null;
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
            <div id="waitingState" style="text-align:center;color:rgba(255,255,255,.5);z-index:20;">
              <div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                ${icon('video', 'style="width:36px;height:36px;color:rgba(255,255,255,.4);"')}
              </div>
              <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Waiting for ${isDoctor ? 'patient' : 'doctor'}…</div>
              <div style="font-size:13px;opacity:.6;">Make sure your camera and microphone are allowed.</div>
              <button class="btn btn--primary" id="joinCallBtn" style="margin-top:29px;">${icon('video')} Join Call</button>
            </div>
          </div>

          <!-- Self preview (PiP) - Hidden during Jitsi API use to avoid double layouts -->
          <div class="video-stage__self" id="selfPip" style="display:none;">
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
            <h3>${icon('notes','style="width:8px;height:8px;color:var(--emerald-hover);display:inline;margin-right:6px;"')} Session Notes</h3>
            <textarea class="video-notes-area" id="sessionNotes" placeholder="Note down notes during the consultation…"></textarea>
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

/* ── Dynamically load the right Jitsi External API script ─ */
const loadedJitsiScripts = new Set();
function loadJitsiScript(domain) {
  return new Promise((resolve, reject) => {
    if (loadedJitsiScripts.has(domain) || (window.JitsiMeetExternalAPI && document.querySelector(`script[data-jitsi-domain="${domain}"]`))) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[data-jitsi-domain="${domain}"]`);
    if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.dataset.jitsiDomain = domain;
    script.onload = () => { loadedJitsiScripts.add(domain); resolve(); };
    script.onerror = () => reject(new Error(`Could not load the video call service from ${domain}.`));
    document.head.appendChild(script);
  });
}

/* ── Local stream (Jitsi / JaaS Integration) ────────────── */
async function startLocalStream() {
  const joinBtn = document.getElementById('joinCallBtn');
  joinBtn.disabled = true; joinBtn.textContent = 'Connecting…';

  try {
    if (!currentAppt) {
      throw new Error('Select an appointment from the list on the right first.');
    }

    // Clean up old Jitsi instance if it exists
    if (jitsiApi) {
      jitsiApi.dispose();
      jitsiApi = null;
    }

    // Ensure a room exists for this appointment (creates it on first join).
    await ConsultationsAPI.createRoom(currentAppt.id);
    // Fetch a per-user signed JWT: the doctor always joins as moderator, so the
    // room never blocks waiting for one — this is what removes the
    // "waiting for a moderator" screen patients used to see.
    const join = await ConsultationsAPI.joinToken(currentAppt.id);

    const domain = join.domain || 'meet.jit.si';
    await loadJitsiScript(domain);

    const options = {
      roomName: join.room_name,
      jwt: join.jwt || undefined, // omitted entirely when JaaS isn't configured yet
      parentNode: document.getElementById('remoteFeed'),
      width: '100%',
      height: '100%',
      configOverwrite: {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        // Hide standard Jitsi control UI so our webpage buttons have complete control
        toolbarButtons: [],
        settingsMap: {
          deviceSelection: false,
          moderator: false,
          profile: false,
          calendar: false
        }
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [],
        SETTINGS_SECTIONS: []
      },
      userInfo: {
        displayName: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
      }
    };

    // Load Jitsi API
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      throw new Error('Jitsi External API script is not loaded. Verify the script tag in the page.');
    }

    document.getElementById('waitingState').style.display = 'none';

    jitsiApi = new JitsiMeetExternalAPI(domain, options);

    // Sync current UI button status on start
    isMicOn = true;
    isCamOn = true;
    updateMicButton();
    updateCamButton();

    jitsiApi.addEventListener('videoConferenceJoined', () => {
      setCallStatus('connected', 'Connected via Jitsi');
      startCallTimer();
      joinBtn.style.display = 'none';
      // Mark the consultation as started server-side (also flips appointment to in_progress).
      ConsultationsAPI.start(currentAppt.id).catch(() => {});
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      endCall(false);
    });
  } catch (err) {
    joinBtn.disabled = false; joinBtn.textContent = '🎥 Join Call';
    document.getElementById('waitingState').style.display = 'flex';
    showToast('Could not start the video call: ' + err.message, 'error');
  }
}

/* ── Mic / Cam toggles (Programmatic Controls) ──────────── */
function toggleMic() {
  if (!jitsiApi) { showToast('Join the call first.', 'default'); return; }
  isMicOn = !isMicOn;
  jitsiApi.executeCommand('toggleAudio');
  updateMicButton();
}

function updateMicButton() {
  const btn = document.getElementById('micBtn');
  btn.className = `vctrl ${isMicOn ? 'vctrl--active' : 'vctrl--default'}`;
  btn.innerHTML = icon(isMicOn ? 'mic' : 'micOff');
  btn.title = isMicOn ? 'Mute microphone' : 'Unmute microphone';
}

function toggleCam() {
  if (!jitsiApi) { showToast('Join the call first.', 'default'); return; }
  isCamOn = !isCamOn;
  jitsiApi.executeCommand('toggleVideo');
  updateCamButton();
}

function updateCamButton() {
  const btn = document.getElementById('camBtn');
  btn.className = `vctrl ${isCamOn ? 'vctrl--active' : 'vctrl--default'}`;
  btn.innerHTML = icon(isCamOn ? 'video' : 'videoOff');
  btn.title = isCamOn ? 'Turn off camera' : 'Turn on camera';
}

/* ── End call ───────────────────────────────────────────── */
function endCall(confirmLeave = true) {
  if (confirmLeave && !confirm('Are you sure you want to end the call?')) return;

  if (jitsiApi) {
    jitsiApi.executeCommand('hangup');
    jitsiApi.dispose();
    jitsiApi = null;
  }

  if (currentAppt) {
    ConsultationsAPI.end(currentAppt.id).catch(() => {});
  }

  stopCallTimer();
  setCallStatus('idle', 'Call ended');

  const remoteFeed = document.getElementById('remoteFeed');
  remoteFeed.innerHTML = `
    <div id="waitingState" style="text-align:center;color:rgba(255,255,255,.5);z-index:20;">
      <div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        ${icon('video', 'style="width:36px;height:36px;color:rgba(255,255,255,.4);"')}
      </div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Waiting for consultation…</div>
      <div style="font-size:13px;opacity:.6;">Make sure your camera and microphone are allowed.</div>
      <button class="btn btn--primary" id="joinCallBtn" style="margin-top:24px;">${icon('video')} Join Call</button>
    </div>
  `;

  // Re-bind click handler to the newly created button
  document.getElementById('joinCallBtn').addEventListener('click', startLocalStream);

  isMicOn = true; isCamOn = true;
  updateMicButton();
  updateCamButton();
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