/**
 * ============================================================
 * IBU CHATBOT WIDGET — WordPress footer.php'ye yapıştırın
 * </body> etiketinden HEMEN ÖNCE ekleyin
 * ============================================================
 * 
 * KURULUM:
 * 1. IBU_CONFIG içindeki apiUrl'i kendi Next.js URL'niz ile değiştirin
 * 2. Aşağıdaki tüm <script> bloğunu WordPress'e ekleyin:
 *    - Yöntem A: footer.php dosyasına </body>'den önce yapıştır
 *    - Yöntem B: Görünüm > Özelleştir > Ek CSS yerine "Ek JS" plugin'i kullan
 *    - Yöntem C: WPCode veya Code Snippets plugin'i ile ekle
 * ============================================================
 */

(function () {
  'use strict';

  /* ---------- Yapılandırma ---------- */
  const IBU_CONFIG = {
    apiUrl: 'https://YOUR-NEXTJS-APP.vercel.app/api/chat', // ← DEĞİŞTİRİN
    primaryColor: '#1a3a6b',     // IBU lacivert
    accentColor:  '#c8a951',     // IBU altın sarısı
    botName:      'IBU Asistan',
    welcomeTr:    'Merhaba! 👋 Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.',
    welcomeEn:    'Hello! 👋 I can answer your questions about enrollment, scholarships, programs, or campus life.',
    placeholderTr:'Sorunuzu yazın...',
    placeholderEn:'Type your question...',
    quickRepliesTr: ['📅 Kayıt tarihleri', '🎓 Burs imkânları', '📚 Programlar', '🏠 Yurt & konaklama'],
    quickRepliesEn: ['📅 Enrollment dates', '🎓 Scholarships', '📚 Programs', '🏠 Dormitory'],
  };

  /* ---------- Yardımcı: Dil tespiti ---------- */
  function detectLang(text) {
    return /[çğıöşüÇĞİÖŞÜ]|\b(ne|nasıl|hangi|kayıt|burs|üniversite)\b/i.test(text) ? 'tr' : 'en';
  }

  /* ---------- State ---------- */
  let sessionId   = 'sess_' + Math.random().toString(36).slice(2);
  let history     = [];
  let isOpen      = false;
  let isTyping    = false;
  let currentLang = document.documentElement.lang?.startsWith('tr') ? 'tr' : 'en';

  /* ---------- CSS ---------- */
  const style = document.createElement('style');
  style.textContent = `
    #ibu-chat-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 99998;
      width: 58px; height: 58px; border-radius: 50%;
      background: ${IBU_CONFIG.primaryColor};
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      transition: transform .2s, box-shadow .2s;
    }
    #ibu-chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
    #ibu-chat-fab svg { width: 26px; height: 26px; fill: white; }
    #ibu-chat-fab .ibu-badge {
      position: absolute; top: -3px; right: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid white;
      display: none;
    }

    #ibu-chat-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 99999;
      width: 360px; height: 520px;
      background: #fff; border-radius: 18px;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      transform: scale(0.8) translateY(20px);
      transform-origin: bottom right;
      opacity: 0; pointer-events: none;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    #ibu-chat-window.ibu-open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    .ibu-header {
      background: ${IBU_CONFIG.primaryColor};
      padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .ibu-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ibu-avatar svg { width: 20px; height: 20px; fill: white; }
    .ibu-header-info { flex: 1; }
    .ibu-header-name { color: #fff; font-size: 14px; font-weight: 600; margin: 0; }
    .ibu-header-status {
      color: rgba(255,255,255,0.75); font-size: 11px; margin: 2px 0 0;
      display: flex; align-items: center; gap: 5px;
    }
    .ibu-status-dot {
      width: 6px; height: 6px; background: #4ade80;
      border-radius: 50%; display: inline-block;
      animation: ibu-pulse 2s infinite;
    }
    @keyframes ibu-pulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }
    .ibu-close-btn {
      background: rgba(255,255,255,0.15); border: none; border-radius: 8px;
      width: 30px; height: 30px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 18px; line-height: 1;
      transition: background .15s;
    }
    .ibu-close-btn:hover { background: rgba(255,255,255,0.25); }

    .ibu-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    .ibu-messages::-webkit-scrollbar { width: 4px; }
    .ibu-messages::-webkit-scrollbar-track { background: transparent; }
    .ibu-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

    .ibu-msg { display: flex; flex-direction: column; max-width: 84%; }
    .ibu-msg.ibu-bot { align-self: flex-start; }
    .ibu-msg.ibu-user { align-self: flex-end; }

    .ibu-bubble {
      padding: 9px 13px; border-radius: 14px;
      font-size: 13.5px; line-height: 1.55;
      word-break: break-word;
    }
    .ibu-bot .ibu-bubble {
      background: #f1f5f9; color: #1e293b;
      border-bottom-left-radius: 3px;
    }
    .ibu-user .ibu-bubble {
      background: ${IBU_CONFIG.primaryColor}; color: #fff;
      border-bottom-right-radius: 3px;
    }
    .ibu-time {
      font-size: 10px; color: #94a3b8;
      margin-top: 3px; padding: 0 4px;
    }
    .ibu-user .ibu-time { text-align: right; }

    .ibu-typing-bubble {
      display: flex; gap: 5px; align-items: center; padding: 12px 14px;
      background: #f1f5f9; border-radius: 14px; border-bottom-left-radius: 3px;
      max-width: 60px;
    }
    .ibu-typing-bubble span {
      width: 7px; height: 7px; background: #94a3b8;
      border-radius: 50%; animation: ibu-bounce 1.3s infinite;
    }
    .ibu-typing-bubble span:nth-child(2) { animation-delay: .2s; }
    .ibu-typing-bubble span:nth-child(3) { animation-delay: .4s; }
    @keyframes ibu-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    .ibu-quick-replies {
      padding: 4px 12px 8px;
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .ibu-qr {
      background: none; border: 1px solid ${IBU_CONFIG.primaryColor};
      color: ${IBU_CONFIG.primaryColor}; border-radius: 16px;
      padding: 5px 11px; font-size: 11.5px; cursor: pointer;
      transition: background .15s, color .15s; white-space: nowrap;
    }
    .ibu-qr:hover { background: ${IBU_CONFIG.primaryColor}; color: white; }

    .ibu-input-row {
      padding: 10px 12px 12px;
      border-top: 1px solid #e2e8f0;
      display: flex; gap: 8px; align-items: flex-end;
      background: #fff; flex-shrink: 0;
    }
    .ibu-input {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 20px;
      padding: 9px 14px; font-size: 13.5px;
      background: #f8fafc; color: #1e293b;
      outline: none; resize: none; max-height: 90px; min-height: 38px;
      line-height: 1.4; font-family: inherit;
      transition: border-color .15s;
      overflow-y: auto;
    }
    .ibu-input:focus { border-color: ${IBU_CONFIG.primaryColor}; background: #fff; }
    .ibu-input::placeholder { color: #94a3b8; }
    .ibu-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: ${IBU_CONFIG.primaryColor}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .15s, transform .15s;
    }
    .ibu-send:hover { opacity: .88; transform: scale(1.05); }
    .ibu-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .ibu-send svg { width: 17px; height: 17px; fill: white; }

    .ibu-powered {
      text-align: center; font-size: 10px; color: #94a3b8;
      padding: 4px 0 8px; flex-shrink: 0;
    }

    @media (max-width: 480px) {
      #ibu-chat-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; }
      #ibu-chat-fab { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  /* ---------- HTML ---------- */
  const fab = document.createElement('button');
  fab.id = 'ibu-chat-fab';
  fab.setAttribute('aria-label', 'IBU Chatbot');
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6V10h12v2zm0-4H6V6h12v2z"/>
    </svg>
    <span class="ibu-badge"></span>
  `;

  const win = document.createElement('div');
  win.id = 'ibu-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'IBU Chatbot');
  win.innerHTML = `
    <div class="ibu-header">
      <div class="ibu-avatar">
        <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
      </div>
      <div class="ibu-header-info">
        <p class="ibu-header-name">${IBU_CONFIG.botName}</p>
        <p class="ibu-header-status">
          <span class="ibu-status-dot"></span>
          <span id="ibu-status-text">Çevrimiçi</span>
        </p>
      </div>
      <button class="ibu-close-btn" id="ibu-close" aria-label="Kapat">✕</button>
    </div>
    <div class="ibu-messages" id="ibu-messages"></div>
    <div class="ibu-quick-replies" id="ibu-qr"></div>
    <div class="ibu-input-row">
      <textarea class="ibu-input" id="ibu-input" rows="1"
        placeholder="${IBU_CONFIG.placeholderTr}"></textarea>
      <button class="ibu-send" id="ibu-send" aria-label="Gönder">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="ibu-powered">Powered by IBU AI</div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(win);

  /* ---------- DOM refs ---------- */
  const messagesEl = document.getElementById('ibu-messages');
  const inputEl    = document.getElementById('ibu-input');
  const sendBtn    = document.getElementById('ibu-send');
  const closeBtn   = document.getElementById('ibu-close');
  const qrEl       = document.getElementById('ibu-qr');

  /* ---------- Yardımcılar ---------- */
  function now() {
    return new Date().toLocaleTimeString(currentLang === 'tr' ? 'tr-TR' : 'en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  function scrollDown() {
    setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
  }

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `ibu-msg ibu-${role}`;
    div.innerHTML = `
      <div class="ibu-bubble">${text.replace(/\n/g, '<br>')}</div>
      <div class="ibu-time">${now()}</div>
    `;
    messagesEl.appendChild(div);
    scrollDown();
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ibu-msg ibu-bot';
    div.id = 'ibu-typing';
    div.innerHTML = `<div class="ibu-typing-bubble"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function removeTyping() {
    const t = document.getElementById('ibu-typing');
    if (t) t.remove();
  }

  function setQuickReplies(lang) {
    const replies = lang === 'tr' ? IBU_CONFIG.quickRepliesTr : IBU_CONFIG.quickRepliesEn;
    qrEl.innerHTML = '';
    replies.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'ibu-qr';
      btn.textContent = r;
      btn.onclick = () => { qrEl.innerHTML = ''; sendMessage(r.replace(/^[^\s]+\s/, '')); };
      qrEl.appendChild(btn);
    });
  }

  /* ---------- Mesaj gönder (streaming) ---------- */
  async function sendMessage(text) {
    if (isTyping || !text.trim()) return;
    isTyping = true;
    sendBtn.disabled = true;
    qrEl.innerHTML = '';

    const detected = detectLang(text);
    currentLang = detected;
    inputEl.placeholder = detected === 'tr' ? IBU_CONFIG.placeholderTr : IBU_CONFIG.placeholderEn;

    addMessage(text, 'user');
    history.push({ role: 'user', content: text });

    showTyping();

    try {
      const resp = await fetch(IBU_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    text,
          session_id: sessionId,
          page_url:   window.location.href,
          history:    history.slice(-8),
        }),
      });

      if (!resp.ok) throw new Error('API hatası: ' + resp.status);

      removeTyping();

      // Bot mesaj balonu (streaming için)
      const botDiv = document.createElement('div');
      botDiv.className = 'ibu-msg ibu-bot';
      botDiv.innerHTML = `<div class="ibu-bubble"></div><div class="ibu-time">${now()}</div>`;
      messagesEl.appendChild(botDiv);
      const bubbleEl = botDiv.querySelector('.ibu-bubble');

      // SSE stream oku
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const data = JSON.parse(line.slice(5));
            if (data.text) {
              fullText += data.text;
              bubbleEl.innerHTML = fullText.replace(/\n/g, '<br>');
              scrollDown();
            }
            if (data.done) {
              currentLang = data.lang || currentLang;
            }
          } catch {}
        }
      }

      history.push({ role: 'assistant', content: fullText });

    } catch (err) {
      removeTyping();
      const errMsg = currentLang === 'tr'
        ? 'Bağlantı hatası oluştu. Lütfen tekrar deneyin veya info@ibu.edu.mk adresine yazın.'
        : 'Connection error. Please try again or email info@ibu.edu.mk';
      addMessage(errMsg, 'bot');
      console.error('IBU Chat Error:', err);
    }

    isTyping = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  /* ---------- Event Listeners ---------- */
  fab.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('ibu-open', isOpen);
    if (isOpen && messagesEl.children.length === 0) {
      // İlk açılışta hoşgeldin mesajı + hızlı cevaplar
      addMessage(IBU_CONFIG.welcomeTr, 'bot');
      setQuickReplies('tr');
      setTimeout(() => inputEl.focus(), 300);
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    win.classList.remove('ibu-open');
  });

  sendBtn.addEventListener('click', () => {
    const text = inputEl.value.trim();
    if (text) { inputEl.value = ''; sendMessage(text); }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (text) { inputEl.value = ''; sendMessage(text); }
    }
  });

  // Textarea auto-resize
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
  });

  // ESC ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      win.classList.remove('ibu-open');
    }
  });

})();
