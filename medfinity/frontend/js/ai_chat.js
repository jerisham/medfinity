/* ===================================================================
   Medfinity — AI Health Assistant
=================================================================== */

const user = requireAuth();
if (!user) throw new Error('Not authenticated');

const chatHistory = [];

function init(){
  const app = document.getElementById('app');
  app.innerHTML = renderChatPage();
  attachListeners();
}

function renderChatPage(){
  const role = user.user_type;
  return `
    <div class="app">
      ${renderSidebar('ai', role)}
      <div class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">AI Assistant</div>
            <h1 class="topbar__title">Health Assistant</h1>
            <div class="topbar__sub">Describe symptoms or ask health questions</div>
          </div>
        </div>

        <div class="bento">
          <div class="tile tile--w4 tile--h2" style="display:flex;flex-direction:column">
            <div class="tile__head"><h3>Chat</h3></div>
            <div id="chatMessages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:10px 0">
              <div class="bubble bubble--ai">Hello! I'm your Medfinity AI assistant. How can I help you today?</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <input type="text" id="chatInput" placeholder="Type your symptoms or question…" style="flex:1;padding:11px 13px;border:1px solid var(--sand);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:14px">
              <button class="btn btn--primary" id="sendBtn">Send</button>
            </div>
          </div>

          <div class="tile tile--w2">
            <div class="tile__head"><h3>Symptom Checker</h3></div>
            <p style="font-size:13px;color:var(--ink-soft);margin-bottom:10px">Enter symptoms to get possible conditions and doctor recommendations.</p>
            <div class="field">
              <input type="text" id="symptomsInput" placeholder="e.g., headache, fever, cough">
            </div>
            <button class="btn btn--primary" id="checkSymptomsBtn">Check Symptoms</button>
            <div id="symptomResult" style="margin-top:12px;font-size:13px"></div>
          </div>

          <div class="tile tile--w2">
            <div class="tile__head"><h3>Doctor Recommendation</h3></div>
            <p style="font-size:13px;color:var(--ink-soft);margin-bottom:10px">Get recommended specialty based on your symptoms.</p>
            <div class="field">
              <input type="text" id="recommendInput" placeholder="e.g., chest pain, skin rash">
            </div>
            <button class="btn btn--sage" id="recommendBtn">Recommend Doctor</button>
            <div id="recommendResult" style="margin-top:12px;font-size:13px"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function attachListeners(){
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const messages = document.getElementById('chatMessages');

  async function sendMessage(){
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    messages.innerHTML += `<div class="bubble bubble--user">${escapeHtml(text)}</div>`;
    messages.scrollTop = messages.scrollHeight;

    sendBtn.disabled = true; sendBtn.textContent = '…';
    try {
      const result = await AiAPI.chat(text);
      messages.innerHTML += `<div class="bubble bubble--ai">${escapeHtml(result.text || result.response || 'I'm not sure how to help with that.')}</div>`;
      messages.scrollTop = messages.scrollHeight;
    } catch (err) {
      messages.innerHTML += `<div class="bubble bubble--ai" style="color:var(--danger)">Sorry, I couldn't process that. Please try again.</div>`;
    }
    sendBtn.disabled = false; sendBtn.textContent = 'Send';
  }

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  document.getElementById('checkSymptomsBtn').addEventListener('click', async () => {
    const symptoms = document.getElementById('symptomsInput').value.trim().split(',').map(s => s.trim());
    if (!symptoms[0]) return;
    const btn = document.getElementById('checkSymptomsBtn');
    const resultBox = document.getElementById('symptomResult');
    btn.disabled = true; btn.textContent = 'Checking…';
    try {
      const result = await AiAPI.checkSymptoms({ symptoms });
      resultBox.innerHTML = `<div style="background:var(--peach);padding:12px;border-radius:var(--radius-sm)">
        <strong>Possible conditions:</strong> ${(result.conditions || []).map(c => c.name).join(', ') || 'None identified'}<br>
        <strong>Recommended specialty:</strong> ${result.recommended_specialty || 'General Physician'}<br>
        <strong>Emergency:</strong> ${result.emergency || 'No'}
      </div>`;
    } catch (err) {
      resultBox.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
    btn.disabled = false; btn.textContent = 'Check Symptoms';
  });

  document.getElementById('recommendBtn').addEventListener('click', async () => {
    const symptoms = document.getElementById('recommendInput').value.trim().split(',').map(s => s.trim());
    if (!symptoms[0]) return;
    const btn = document.getElementById('recommendBtn');
    const resultBox = document.getElementById('recommendResult');
    btn.disabled = true; btn.textContent = 'Analyzing…';
    try {
      const result = await AiAPI.recommendDoctor({ symptoms });
      resultBox.innerHTML = `<div style="background:var(--peach);padding:12px;border-radius:var(--radius-sm)">
        <strong>Primary specialty:</strong> ${result.primary_specialty || 'General Physician'}<br>
        <strong>Reasoning:</strong> ${result.reasoning || 'Based on your symptoms'}
      </div>`;
    } catch (err) {
      resultBox.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
    btn.disabled = false; btn.textContent = 'Recommend Doctor';
  });
}

init();
