// ============================================================
// CHATBOT.JS — AI Chatbot (Anthropic Claude API)
// ============================================================

const CHATBOT_SYSTEM_PROMPT = `You are CropBot, a friendly and knowledgeable agricultural AI assistant specializing in rice and pulse crop diseases. 

You help farmers and researchers with:
- Identifying crop diseases from descriptions
- Providing treatment and prevention advice
- Explaining the science behind plant diseases
- Discussing best agricultural practices
- Information about rice, pulse, cassava diseases
- EfficientNetB2 and deep learning concepts in agriculture

You are part of the "Crop Disease Detection" platform which uses an EfficientNetB2 CNN model trained on Transfer Learning to detect diseases like Rice Blast, Brown Spot, Leaf Blight, Tungro, Sheath Blight, Fusarium Wilt, Powdery Mildew, Cassava Mosaic, and more.

Be concise, friendly, and practical. Use emojis occasionally to stay approachable. If asked about something outside agriculture or this platform, politely redirect.`;

let chatHistory = [];
let chatOpen = false;

// ---- Toggle chatbot ----
function toggleChatbot() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chatbot-panel');
  const btn = document.getElementById('chatbot-btn');
  if (panel) {
    panel.style.display = chatOpen ? 'flex' : 'none';
    if (chatOpen && chatHistory.length === 0) sendWelcomeMessage();
  }
  if (btn) btn.innerHTML = chatOpen ? '✕' : '🤖';
}

// ---- Welcome message ----
function sendWelcomeMessage() {
  appendMessage('assistant', `👋 Hi! I'm **CropBot**, your agricultural AI assistant!\n\nI can help you with:\n• 🌾 Crop disease identification\n• 💊 Treatment recommendations\n• 🛡️ Prevention strategies\n• 🧠 Model & technology questions\n\nWhat would you like to know?`);
}

// ---- Append message to chat ----
function appendMessage(role, content, isLoading = false) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  div.id = isLoading ? 'chat-loading' : '';

  const avatar = role === 'assistant' ? '🌿' : '👤';
  const formattedContent = formatChatMessage(content);

  div.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-bubble">${isLoading ? '<span class="chat-typing"><span></span><span></span><span></span></span>' : formattedContent}</div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

// ---- Format message (basic markdown) ----
function formatChatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '• ');
}

// ---- Send user message ----
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  if (!input || !input.value.trim()) return;

  const userMessage = input.value.trim();
  input.value = '';
  input.style.height = 'auto';

  appendMessage('user', userMessage);
  chatHistory.push({ role: 'user', content: userMessage });

  // Show loading
  appendMessage('assistant', '', true);
  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: CHATBOT_SYSTEM_PROMPT,
        messages: chatHistory,
      })
    });

    const data = await response.json();
    console.log('Chat API response:', data);

    // Remove loading bubble
    const loadingEl = document.getElementById('chat-loading');
    if (loadingEl) loadingEl.remove();

    let reply = 'Sorry, I could not process that. Please try again.';
    if (data.content && data.content[0] && data.content[0].text) {
      reply = data.content[0].text;
    } else if (data.error) {
      reply = `Error: ${data.error.message || JSON.stringify(data.error)}`;
    }

    appendMessage('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });

    // Keep history manageable
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-16);

  } catch (err) {
    console.error('Chatbot error:', err);
    const loadingEl = document.getElementById('chat-loading');
    if (loadingEl) loadingEl.remove();
    appendMessage('assistant', '⚠️ Connection error. Please check your internet and try again.');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ---- Quick suggestion chips ----
function sendQuickMessage(text) {
  const input = document.getElementById('chat-input');
  if (input) input.value = text;
  sendChatMessage();
}

// ---- Init chatbot ----
function initChatbot() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
}

// ---- Clear chat ----
function clearChat() {
  chatHistory = [];
  const messages = document.getElementById('chat-messages');
  if (messages) messages.innerHTML = '';
  sendWelcomeMessage();
}

document.addEventListener('DOMContentLoaded', initChatbot);
