(function () {
  'use strict';

  /* ---------- Yapılandırma ---------- */
  const IBU_CONFIG = {
    apiUrl: 'https://YOUR-NEXTJS-APP.vercel.app/api/chat', // ← DEĞİŞTİRİN
    primaryColor: '#1a3a6b',     // IBU lacivert
    accentColor:  '#c8a951',     // IBU altın sarısı
    botName:      'IBU Asistan',
    theme:        'default',     // 'default', 'emerald', 'royal', 'midnight', 'crimson', 'sunset', 'custom'
    tooltipTr:    'IBU Dijital Asistanı sorularınızı yanıtlamaya hazır. 👋',
    tooltipEn:    'IBU Digital Assistant is ready to answer your questions. 👋',
    welcomeTr:    'Merhaba! 👋 Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.',
    welcomeEn:    'Hello! 👋 I can answer your questions about enrollment, scholarships, programs, or campus life.',
    placeholderTr:'Sorunuzu yazın...',
    placeholderEn:'Type your question...',
    quickRepliesTr: ['📅 Kayıt tarihleri', '🎓 Burs imkânları', '📚 Programlar', '🏠 Yurt & konaklama'],
    quickRepliesEn: ['📅 Enrollment dates', '🎓 Scholarships', '📚 Programs', '🏠 Dormitory'],
  };

  /* ---------- Premium Temalar ---------- */
  const THEMES = {
    default:  { primary: '#1a3a6b', accent: '#c8a951' },
    emerald:  { primary: '#064e3b', accent: '#34d399' },
    royal:    { primary: '#4c1d95', accent: '#fcd34d' },
    midnight: { primary: '#0f172a', accent: '#06b6d4' },
    crimson:  { primary: '#991b1b', accent: '#cbd5e1' },
    sunset:   { primary: '#7c2d12', accent: '#f59e0b' }
  };

  const themeName = IBU_CONFIG.theme || 'default';
  let primaryColor = IBU_CONFIG.primaryColor || '#1a3a6b';
  let accentColor = IBU_CONFIG.accentColor || '#c8a951';

  if (themeName !== 'custom' && THEMES[themeName]) {
    primaryColor = THEMES[themeName].primary;
    accentColor = THEMES[themeName].accent;
  }

  // Dynamic asset loading
  const logoUrl = IBU_CONFIG.apiUrl.replace('/api/chat', '/logoicon.ico');

  // Load Premium Typography from Google Fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap';
  document.head.appendChild(fontLink);

  /* ---------- Yardımcı: Renk Parlaklığı (Gradient için) ---------- */
  function adjustBrightness(hex, percent) {
    let hexClean = hex.replace('#', '');
    if (hexClean.length === 3) {
      hexClean = hexClean[0] + hexClean[0] + hexClean[1] + hexClean[1] + hexClean[2] + hexClean[2];
    }
    let R = parseInt(hexClean.substring(0, 2), 16);
    let G = parseInt(hexClean.substring(2, 4), 16);
    let B = parseInt(hexClean.substring(4, 6), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

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
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -15)} 100%);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    }
    #ibu-chat-fab:hover { transform: scale(1.08) rotate(3deg); box-shadow: 0 8px 24px rgba(0,0,0,0.28); }
    #ibu-chat-fab img { width: 28px; height: 28px; object-fit: contain; }
    #ibu-chat-fab .ibu-badge {
      position: absolute; top: -3px; right: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid white;
      display: none;
    }

    #ibu-chat-tooltip {
      position: fixed; bottom: 32px; right: 96px; z-index: 99997;
      background: white; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 12px 14px; max-width: 230px;
      box-shadow: 0 6px 24px rgba(30, 41, 59, 0.12);
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 12.5px; color: #334155; line-height: 1.45;
      display: flex; gap: 8px; align-items: flex-start;
      opacity: 0; transform: translateX(10px); pointer-events: none;
      transition: opacity .35s, transform .35s cubic-bezier(.34,1.56,.64,1);
    }
    #ibu-chat-tooltip.ibu-show {
      opacity: 1; transform: translateX(0); pointer-events: all;
    }
    #ibu-chat-tooltip::after {
      content: ''; position: absolute; right: -6px; top: calc(50% - 6px);
      width: 10px; height: 10px; background: white;
      border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;
      transform: rotate(45deg);
    }
    .ibu-tooltip-close {
      background: none; border: none; color: #94a3b8; cursor: pointer;
      font-size: 14px; font-weight: bold; line-height: 1; padding: 0 2px;
      margin-top: -1px;
    }
    .ibu-tooltip-close:hover { color: #64748b; }

    #ibu-chat-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 99999;
      width: 360px; height: 530px;
      background: #fff; border-radius: 20px;
      display: flex; flex-direction: column;
      box-shadow: 0 12px 48px rgba(30, 41, 59, 0.18);
      border: 1px solid rgba(0,0,0,0.04);
      transform: scale(0.8) translateY(20px);
      transform-origin: bottom right;
      opacity: 0; pointer-events: none;
      transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s;
      font-family: 'Inter', -apple-system, sans-serif;
      overflow: hidden;
    }
    #ibu-chat-window.ibu-open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    .ibu-header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -25)} 100%);
      border-bottom: 2.5px solid ${accentColor};
      padding: 16px;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .ibu-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .ibu-avatar img { width: 26px; height: 26px; object-fit: contain; }
    .ibu-header-info { flex: 1; }
    .ibu-header-name {
      color: #fff; font-family: 'Outfit', sans-serif;
      font-size: 15px; font-weight: 700; margin: 0;
      letter-spacing: -0.01em;
    }
    .ibu-header-status {
      color: rgba(255,255,255,0.8); font-size: 11px; margin: 3px 0 0;
      display: flex; align-items: center; gap: 5px;
    }
    .ibu-status-dot {
      width: 6px; height: 6px; background: #22c55e;
      border-radius: 50%; display: inline-block;
      animation: ibu-pulse 2s infinite;
    }
    @keyframes ibu-pulse {
      0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; }
    }
    .ibu-close-btn {
      background: rgba(255,255,255,0.14); border: none; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 18px; line-height: 1;
      transition: background .15s, transform .15s;
    }
    .ibu-close-btn:hover { background: rgba(255,255,255,0.22); transform: scale(1.05); }

    .ibu-messages {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 14px;
      background: #f8fafc;
      scroll-behavior: smooth;
    }
    .ibu-messages::-webkit-scrollbar { width: 4px; }
    .ibu-messages::-webkit-scrollbar-track { background: transparent; }
    .ibu-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    .ibu-msg { display: flex; gap: 10px; max-width: 86%; align-items: flex-start; }
    .ibu-msg.ibu-bot { align-self: flex-start; }
    .ibu-msg.ibu-user { align-self: flex-end; flex-direction: row-reverse; }

    .ibu-msg-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: #ffffff; border: 1.5px solid #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .ibu-msg-avatar img { width: 18px; height: 18px; object-fit: contain; }

    .ibu-bubble-wrapper { display: flex; flex-direction: column; flex: 1; }

    .ibu-bubble {
      padding: 10px 14px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.55;
      word-break: break-word;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .ibu-bot .ibu-bubble {
      background: #ffffff; color: #1e293b;
      border: 1px solid #e2e8f0;
      border-top-left-radius: 3px;
    }
    .ibu-user .ibu-bubble {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -12)} 100%);
      color: #fff;
      border-top-right-radius: 3px;
      box-shadow: 0 3px 10px ${primaryColor}22;
    }
    .ibu-time {
      font-size: 10px; color: #94a3b8;
      margin-top: 5px; padding: 0 3px;
    }
    .ibu-user .ibu-time { text-align: right; }

    .ibu-typing-bubble {
      display: flex; gap: 5px; align-items: center; padding: 12px 16px;
      background: #ffffff; border-radius: 16px; border-top-left-radius: 3px;
      border: 1px solid #e2e8f0;
      max-width: 65px;
    }
    .ibu-typing-bubble span {
      width: 7px; height: 7px; background: #cbd5e1;
      border-radius: 50%; animation: ibu-bounce 1.3s infinite;
    }
    .ibu-typing-bubble span:nth-child(2) { animation-delay: .2s; }
    .ibu-typing-bubble span:nth-child(3) { animation-delay: .4s; }
    @keyframes ibu-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* Suggestions options buttons container */
    .ibu-suggestions-container {
      display: flex; flex-direction: column; gap: 6px;
      margin-top: 8px; padding-left: 40px;
      animation: ibu-slide-in .3s ease-out;
    }
    .ibu-suggestions-label {
      font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;
    }
    .ibu-suggestion-btn {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 13px;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: all .2s cubic-bezier(0.16, 1, 0.3, 1);
      width: fit-content;
      max-width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .ibu-suggestion-btn:hover {
      background: ${primaryColor}0a;
      border-color: ${primaryColor}55;
      color: ${primaryColor};
      transform: translateX(4px);
      box-shadow: 0 3px 8px rgba(0,0,0,0.05);
    }

    .ibu-quick-replies {
      padding: 8px 14px 10px;
      display: flex; flex-wrap: wrap; gap: 6px;
      background: #f8fafc;
      border-top: 1px solid rgba(0,0,0,0.02);
    }
    .ibu-qr {
      background: #ffffff; border: 1.5px solid ${primaryColor}33;
      color: ${primaryColor}; border-radius: 18px;
      padding: 6px 13px; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all .2s; white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .ibu-qr:hover { background: ${primaryColor}; color: white; border-color: ${primaryColor}; transform: translateY(-1px); }

    .ibu-input-row {
      padding: 12px 14px 14px;
      border-top: 1px solid #e2e8f0;
      display: flex; gap: 8px; align-items: flex-end;
      background: #fff; flex-shrink: 0;
    }
    .ibu-input {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 22px;
      padding: 9px 15px; font-size: 13.5px;
      background: #f8fafc; color: #1e293b;
      outline: none; resize: none; max-height: 90px; min-height: 40px;
      line-height: 1.4; font-family: inherit;
      transition: all .15s;
      overflow-y: auto;
    }
    .ibu-input:focus { border-color: ${primaryColor}; background: #fff; box-shadow: 0 0 0 3px ${primaryColor}1a; }
    .ibu-input::placeholder { color: #94a3b8; }
    .ibu-send {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -12)} 100%);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .15s, transform .15s;
      box-shadow: 0 3px 8px ${primaryColor}25;
    }
    .ibu-send:hover { opacity: .92; transform: scale(1.05); }
    .ibu-send:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
    .ibu-send svg { width: 17px; height: 17px; fill: white; }

    .ibu-powered {
      text-align: center; font-size: 10px; color: #94a3b8;
      padding: 4px 0 8px; flex-shrink: 0;
      background: #ffffff;
      border-top: 1px solid rgba(0,0,0,0.01);
      font-weight: 500;
    }

    @keyframes ibu-slide-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      #ibu-chat-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; height: calc(100vh - 100px); }
      #ibu-chat-fab { right: 16px; bottom: 16px; }
      #ibu-chat-tooltip { right: 84px; bottom: 24px; max-width: 200px; }
    }
  `;
  document.head.appendChild(style);

  /* ---------- HTML ---------- */
  const fab = document.createElement('button');
  fab.id = 'ibu-chat-fab';
  fab.setAttribute('aria-label', 'IBU Chatbot');
  fab.innerHTML = `
    <img src="${logoUrl}" alt="IBU" />
    <span class="ibu-badge"></span>
  `;

  // Closed Welcoming Notification Tooltip next to FAB
  const tooltip = document.createElement('div');
  tooltip.id = 'ibu-chat-tooltip';
  tooltip.innerHTML = `
    <div style="flex: 1; font-weight: 600;">
      ${currentLang === 'tr' ? IBU_CONFIG.tooltipTr : IBU_CONFIG.tooltipEn}
    </div>
    <button class="ibu-tooltip-close" aria-label="Kapat">✕</button>
  `;

  const win = document.createElement('div');
  win.id = 'ibu-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'IBU Chatbot');
  win.innerHTML = `
    <div class="ibu-header">
      <div class="ibu-avatar">
        <img src="${logoUrl}" alt="IBU" />
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
  document.body.appendChild(tooltip);
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

  function renderSuggestions(botDiv, list) {
    if (botDiv.querySelector('.ibu-suggestions-container')) return;

    const container = document.createElement('div');
    container.className = 'ibu-suggestions-container';

    const label = document.createElement('div');
    label.className = 'ibu-suggestions-label';
    label.textContent = currentLang === 'tr' ? 'Bununla ilgili şunları da sorabilirsiniz:' : 'Related questions you can ask:';
    container.appendChild(label);

    list.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'ibu-suggestion-btn';
      btn.textContent = q;
      btn.onclick = (e) => {
        e.stopPropagation();
        container.remove();
        sendMessage(q);
      };
      container.appendChild(btn);
    });

    botDiv.appendChild(container);
    scrollDown();
  }

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `ibu-msg ibu-${role}`;
    
    if (role === 'bot') {
      // Robot avatar next to bot message bubble
      div.innerHTML = `
        <div class="ibu-msg-avatar">
          <img src="${logoUrl}" alt="Bot" />
        </div>
        <div class="ibu-bubble-wrapper">
          <div class="ibu-bubble">${text.replace(/\n/g, '<br>')}</div>
          <div class="ibu-time">${now()}</div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="ibu-bubble-wrapper">
          <div class="ibu-bubble">${text.replace(/\n/g, '<br>')}</div>
          <div class="ibu-time">${now()}</div>
        </div>
      `;
    }
    
    messagesEl.appendChild(div);
    scrollDown();
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ibu-msg ibu-bot';
    div.id = 'ibu-typing';
    div.innerHTML = `
      <div class="ibu-msg-avatar">
        <img src="${logoUrl}" alt="Bot" />
      </div>
      <div class="ibu-bubble-wrapper">
        <div class="ibu-typing-bubble"><span></span><span></span><span></span></div>
      </div>
    `;
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
    if (isTyping) return;
    isTyping = true;
    sendBtn.disabled = true;

    // 1. Kullanıcı mesajı ekle
    addMessage(text, 'user');
    qrEl.innerHTML = '';

    // Clear previous suggestion bubbles to prevent screen clutter
    document.querySelectorAll('.ibu-suggestions-container').forEach(c => c.remove());

    // Dil algıla ve placeholder/quick replies güncelle
    const detected = detectLang(text);
    if (detected !== currentLang) {
      currentLang = detected;
      inputEl.placeholder = currentLang === 'tr' ? IBU_CONFIG.placeholderTr : IBU_CONFIG.placeholderEn;
    }

    // 2. Yazıyor animasyonunu göster
    showTyping();

    // 3. API çağrısı
    try {
      const historyPayload = history.map(h => ({ role: h.role, content: h.content }));
      history.push({ role: 'user', content: text });

      const resp = await fetch(IBU_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          history: historyPayload,
          lang: currentLang,
        }),
      });

      if (!resp.ok) throw new Error('API request failed');

      removeTyping();

      // Bot mesaj balonu (streaming için)
      const botDiv = document.createElement('div');
      botDiv.className = 'ibu-msg ibu-bot';
      botDiv.innerHTML = `
        <div class="ibu-msg-avatar">
          <img src="${logoUrl}" alt="Bot" />
        </div>
        <div class="ibu-bubble-wrapper">
          <div class="ibu-bubble"></div>
          <div class="ibu-time">${now()}</div>
        </div>
      `;
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
              if (data.suggestions && data.suggestions.length > 0) {
                renderSuggestions(botDiv, data.suggestions);
              }
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
    
    // Hide welcome tooltip upon open
    tooltip.classList.remove('ibu-show');
    
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

  // Tooltip close button handler
  tooltip.querySelector('.ibu-tooltip-close').addEventListener('click', (e) => {
    e.stopPropagation();
    tooltip.classList.remove('ibu-show');
    localStorage.setItem('ibu-chat-tooltip-dismissed', 'true');
  });

  // Display closed welcome notification after a small delay
  setTimeout(() => {
    if (!isOpen && !localStorage.getItem('ibu-chat-tooltip-dismissed')) {
      tooltip.classList.add('ibu-show');
    }
  }, 3000);

})();
