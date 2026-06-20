/* ===================================================================
   Medfinity — Video Consultation
=================================================================== */

const user = requireAuth();
if (!user) throw new Error('Not authenticated');

let jitsiApi = null;

function init(){
  const app = document.getElementById('app');
  app.innerHTML = renderVideoPage();
  loadAppointments();
}

function renderVideoPage(){
  const role = user.user_type;
  return `
    <div class="app">
      ${renderSidebar('video', role)}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Consultation</div>
            <h1 class="topbar__title">Video Consultation</h1>
          </div>
        </div>

        <div class="bento">
          <div class="tile tile--w3 tile--h2" style="display:flex;flex-direction:column">
            <div class="tile__head"><h3>Video Call</h3></div>
            <div id="jitsi-container" style="flex:1;background:var(--ink);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;min-height:400px">
              <p style="color:var(--cream);opacity:.6">Select an appointment to start the video call.</p>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn btn--primary" id="startBtn" disabled>Start Call</button>
              <button class="btn btn--danger" id="endBtn" disabled>End Call</button>
            </div>
          </div>

          <div class="tile tile--w1">
            <div class="tile__head"><h3>Appointments</h3></div>
            <div class="list" id="appointmentList">${skeletonRows(3)}</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function loadAppointments(){
  try {
    const appointments = await AppointmentsAPI.upcoming();
    const list = document.getElementById('appointmentList');
    if (!appointments.length) {
      list.innerHTML = emptyState('No upcoming appointments', 'Book or wait for appointments.', '');
      return;
    }
    list.innerHTML = appointments.map(a => `
      <div class="list-row appt-item" data-id="${a.id}" style="cursor:pointer">
        <div class="list-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
        <div class="list-row__body">
          <div class="list-row__title">${user.user_type === 'doctor' ? escapeHtml(a.patient_name || 'Patient') : 'Dr. ' + escapeHtml(a.doctor_name || 'Doctor')}</div>
          <div class="list-row__meta">${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</div>
        </div>
      </div>`).join('');

    document.querySelectorAll('.appt-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.appt-item').forEach(i => i.style.background = 'transparent');
        item.style.background = 'var(--peach)';
        selectedAppointment = item.dataset.id;
        document.getElementById('startBtn').disabled = false;
      });
    });
  } catch (err) {
    document.getElementById('appointmentList').innerHTML = '<p style="color:var(--danger);font-size:13px">Failed to load.</p>';
  }
}

let selectedAppointment = null;

function startJitsi(roomName){
  const container = document.getElementById('jitsi-container');
  container.innerHTML = '';

  jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
    roomName: roomName,
    parentNode: container,
    width: '100%',
    height: '100%',
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_BRAND_WATERMARK: false,
    }
  });
}

document.addEventListener('click', async (e) => {
  if (e.target.id === 'startBtn') {
    if (!selectedAppointment) return;
    try {
      const result = await apiCall(`/consultations/room/${selectedAppointment}/`, { method: 'POST' });
      if (result.jitsi_link) {
        const roomName = result.roomName || result.jitsi_link.split('/').pop();
        startJitsi(roomName);
        document.getElementById('endBtn').disabled = false;
        showToast('Video call started', 'success');
      }
    } catch (err) {
      showToast('Failed to start call', 'error');
    }
  }

  if (e.target.id === 'endBtn') {
    if (jitsiApi) {
      jitsiApi.dispose();
      jitsiApi = null;
    }
    document.getElementById('jitsi-container').innerHTML = '<p style="color:var(--cream);opacity:.6">Call ended. Select another appointment to start.</p>';
    document.getElementById('startBtn').disabled = true;
    document.getElementById('endBtn').disabled = true;
    showToast('Call ended', 'success');
  }
});

init();
