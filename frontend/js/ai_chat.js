/* ===================================================================
   Medfinity — AI Health Assistant chat page
=================================================================== */

const user = requireAuth(['patient', 'caregiver']);

const ICONS = {
  bot:      '<path d="M12 2a4 4 0 014 4v1h1a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h1V6a4 4 0 014-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17s1 1 3 1 3-1 3-1"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  heartbeat:'<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  doctor:   '<circle cx="11" cy="6" r="3"/><path d="M5 21v-2a6 6 0 0112 0v2"/><path d="M19 8l2 2-4 4"/>',
  send:     '<path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>',
  refresh:  '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9A9 9 0 0120.5 15M20.5 15A9 9 0 013.5 9"/>',
  x:        '<path d="M18 6L6 18M6 6l12 12"/>',
};
const icon = (name, attrs='') => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ── Modes ──────────────────────────────────────────────── */
const MODES = [
  {
    key: 'chat',
    label: 'General Chat',
    sub: 'Ask me anything about health',
    iconName: 'bot',
    bg: 'var(--green-tint)',
    col: 'var(--emerald-hover)',
    greeting: "Hello! I'm Medfinity's AI health assistant. Ask me anything about symptoms, medications, or general health questions — I'm here to help. 🌿",
    placeholder: 'Ask me about your health concerns…',
  },
  {
    key: 'symptoms',
    label: 'Symptom Checker',
    sub: 'Describe symptoms, get insights',
    iconName: 'heartbeat',
    bg: 'var(--rose-tint)',
    col: '#c0436b',
    greeting: "Tell me your symptoms and I'll help you understand what might be going on. Please be as specific as possible — duration, severity, and any related symptoms help a lot.",
    placeholder: 'Describe your symptoms in detail…',
  },
  {
    key: 'recommend',
    label: 'Find a Doctor',
    sub: 'Get specialist recommendations',
    iconName: 'doctor',
    bg: 'var(--blue-tint)',
    col: '#3b6fd1',
    greeting: "I can help you find the right specialist for your needs! Tell me what kind of health concern you're dealing with and I'll recommend the most suitable type of doctor.",
    placeholder: 'Describe your concern to find the right doctor…',
  },
];

/* ── State ──────────────────────────────────────────────── */
let activeMode = 'chat';
const history = { chat: [], symptoms: [], recommend: [] };

/* ── Render Shell ───────────────────────────────────────── */
if (document.getElementById('app')) {
  document.getElementById('app').innerHTML = `
    ${renderSidebar('ai', 'patient')}
    <main class="main" style="display:flex;flex-direction:column;padding-bottom:0;overflow:hidden;">
      ${renderTopbar({
        title: 'AI Health Assistant',
        sub: 'Powered by Gemini — your intelligent health companion.',
        user,
        hideSearch: false
      })}

      <div class="chat-layout" style="flex:1;min-height:0;">
        <!-- Sidebar: modes -->
        <div class="chat-sidebar">
          <div class="chat-sidebar__head">
            <h3>Medfinity AI</h3>
            <p>Choose a mode to get started</p>
          </div>
          <div class="chat-sidebar__list">
            ${MODES.map(m => `
              <div class="chat-mode${m.key === 'chat' ? ' is-active' : ''}" data-mode="${m.key}">
                <div class="chat-mode__icon" style="background:${m.bg};">
                  ${icon(m.iconName, `style="color:${m.col}"`)}
                </div>
                <div>
                  <div class="chat-mode__label">${m.label}</div>
                  <div class="chat-mode__sub">${m.sub}</div>
                </div>
              </div>`).join('')}
          </div>
          <div style="padding:14px 20px;border-top:1px solid var(--glass-border);">
            <button class="btn btn--ghost btn--sm btn--block" id="clearHistory">
              ${icon('x','style="width:13px;height:13px;"')} Clear conversation
            </button>
          </div>
        </div>

        <!-- Main chat area -->
        <div class="chat-main">
          <div class="chat-main__head" id="chatHead">
            <div class="chat-main__head-icon">
              ${icon('bot')}
            </div>
            <div>
              <div class="chat-main__title">General Chat</div>
              <div class="chat-main__sub">Ask me anything about health</div>
            </div>
          </div>

          <div class="chat-messages" id="chatMessages">
            <!-- Initial greeting -->
          </div>

          <div class="chat-input-bar">
            <textarea id="chatInput" rows="1" placeholder="Ask me about your health concerns…" maxlength="1000"></textarea>
            <button class="chat-send" id="sendBtn" title="Send">
              ${icon('send')}
            </button>
          </div>
        </div>
      </div>
    </main>
  `;

  initChat();
}

/* ── Init ───────────────────────────────────────────────── */
function initChat() {
  // Show greeting for default mode
  appendAiMessage(MODES[0].greeting, MODES[0]);

  // Mode switching
  document.querySelectorAll('.chat-mode').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.mode;
      if (key === activeMode) return;
      activeMode = key;

      document.querySelectorAll('.chat-mode').forEach(m => m.classList.remove('is-active'));
      el.classList.add('is-active');

      const mode = MODES.find(m => m.key === key);
      updateChatHead(mode);
      document.getElementById('chatInput').placeholder = mode.placeholder;

      // Restore or start history for this mode
      const msgs = document.getElementById('chatMessages');
      msgs.innerHTML = '';
      if (history[key].length) {
        history[key].forEach(entry => {
          if (entry.role === 'ai') appendAiMessage(entry.text, mode, false);
          else appendUserMessage(entry.text, false);
        });
        msgs.scrollTop = msgs.scrollHeight;
      } else {
        appendAiMessage(mode.greeting, mode, true);
      }
    });
  });

  // Send
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Auto-resize textarea
  document.getElementById('chatInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Clear
  document.getElementById('clearHistory').addEventListener('click', () => {
    if (!confirm('Clear this conversation?')) return;
    history[activeMode] = [];
    const msgs = document.getElementById('chatMessages');
    msgs.innerHTML = '';
    const mode = MODES.find(m => m.key === activeMode);
    appendAiMessage(mode.greeting, mode, true);
  });
}

/* ── Send message ───────────────────────────────────────── */
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;

  const mode = MODES.find(m => m.key === activeMode);
  const sendBtn = document.getElementById('sendBtn');

  appendUserMessage(text);
  history[activeMode].push({ role: 'user', text });
  input.value = ''; input.style.height = 'auto';
  sendBtn.disabled = true;

  // Show typing indicator
  const typingId = appendTyping();

  try {
    let response;
    if (activeMode === 'symptoms') {
      const data = await AiAPI.checkSymptoms({ symptoms: text });
      response = data.response || data.analysis || data.message || JSON.stringify(data);
    } else if (activeMode === 'recommend') {
      const data = await AiAPI.recommendDoctor({ symptoms: text });
      response = data.response || data.recommendation || data.message || JSON.stringify(data);
    } else {
      const data = await AiAPI.chat(text);
      response = data.response || data.message || data.reply || JSON.stringify(data);
    }

    removeTyping(typingId);
    appendAiMessage(response, mode);
    history[activeMode].push({ role: 'ai', text: response });
  } catch (err) {
    removeTyping(typingId);
    const errText = (err.message?.includes('404') || err.message?.includes('500') || err.message?.includes('API'))
      ? "I'm having trouble connecting to the AI service right now. Make sure the backend is running and GEMINI_API_KEY is set in the .env file."
      : (err.message || 'Something went wrong. Please try again.');
    appendAiMessage(errText, mode);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/* ── Message renderers ──────────────────────────────────── */
function appendUserMessage(text, scroll = true) {
  const msgs = document.getElementById('chatMessages');
  const userInitials = initials(user.name || `${user.first_name || ''} ${user.last_name || ''}` || 'U');
  const el = document.createElement('div');
  el.className = 'msg msg--user';
  el.innerHTML = `
    <div class="msg__avatar">${escapeHtml(userInitials)}</div>
    <div>
      <div class="msg__bubble">${escapeHtml(text)}</div>
      <div class="msg__time">${formatTime12(new Date())}</div>
    </div>`;
  msgs.appendChild(el);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function appendAiMessage(text, mode, scroll = true) {
  const msgs = document.getElementById('chatMessages');
  const m = mode || MODES.find(m => m.key === activeMode);
  const el = document.createElement('div');
  el.className = 'msg msg--ai';
  // Convert newlines to <br> and bold **text**
  const formatted = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  el.innerHTML = `
    <div class="msg__avatar" style="background:${m?.col || 'var(--emerald)'};color:white;font-size:11px;">AI</div>
    <div>
      <div class="msg__bubble">${formatted}</div>
      <div class="msg__time">${formatTime12(new Date())}</div>
    </div>`;
  msgs.appendChild(el);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById('chatMessages');
  const id = `typing-${Date.now()}`;
  const mode = MODES.find(m => m.key === activeMode);
  const el = document.createElement('div');
  el.className = 'msg msg--ai'; el.id = id;
  el.innerHTML = `
    <div class="msg__avatar" style="background:${mode?.col || 'var(--emerald)'};color:white;font-size:11px;">AI</div>
    <div class="msg__bubble typing-indicator"><span></span><span></span><span></span></div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

/* ── Helpers ─────────────────────────────────────────────── */
function updateChatHead(mode) {
  document.getElementById('chatHead').innerHTML = `
    <div class="chat-main__head-icon" style="background:${mode.bg};">
      ${icon(mode.iconName, `style="color:${mode.col}"`)}
    </div>
    <div>
      <div class="chat-main__title">${mode.label}</div>
      <div class="chat-main__sub">${mode.sub}</div>
    </div>`;
}

function formatTime12(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
