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
    placeholderTr:'Sorunuzu buraya yazın...',
    placeholderEn:'Type your question here...',
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

  // Load Premium Typography from Google Fonts (Outfit & Plus Jakarta Sans)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap';
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
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -15)} 100%);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.25);
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
    }
    #ibu-chat-fab:hover { transform: scale(1.08) rotate(5deg); box-shadow: 0 12px 35px rgba(15, 23, 42, 0.35); }
    #ibu-chat-fab img { width: 28px; height: 28px; object-fit: contain; }
    #ibu-chat-fab .ibu-badge {
      position: absolute; top: -3px; right: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid white;
      display: none;
    }

    #ibu-chat-tooltip {
      position: fixed; bottom: 32px; right: 100px; z-index: 99997;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 16px; padding: 12px 16px; max-width: 240px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      font-size: 13px; color: #1e293b; line-height: 1.5;
      display: flex; gap: 10px; align-items: center;
      opacity: 0; transform: translateX(15px); pointer-events: none;
      transition: all .4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #ibu-chat-tooltip.ibu-show {
      opacity: 1; transform: translateX(0); pointer-events: all;
    }
    #ibu-chat-tooltip::after {
      content: ''; position: absolute; right: -6px; top: calc(50% - 6px);
      width: 10px; height: 10px; background: rgba(255, 255, 255, 0.95);
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      border-right: 1px solid rgba(15, 23, 42, 0.08);
      transform: rotate(45deg);
    }
    .ibu-tooltip-close {
      background: #f1f5f9; border: none; color: #64748b; cursor: pointer;
      font-size: 11px; font-weight: bold; width: 20px; height: 20px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.2s;
    }
    .ibu-tooltip-close:hover { background: #e2e8f0; color: #0f172a; }

    #ibu-chat-window {
      position: fixed; bottom: 96px; right: 24px; z-index: 99999;
      width: 380px; height: 580px;
      background: #ffffff; border-radius: 24px;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
      border: 1px solid rgba(15, 23, 42, 0.06);
      transform: scale(0.9) translateY(30px);
      transform-origin: bottom right;
      opacity: 0; pointer-events: none;
      transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .25s;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      overflow: hidden;
    }
    #ibu-chat-window.ibu-open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    .ibu-header {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      flex-shrink: 0;
      z-index: 10;
    }
    .ibu-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: #ffffff;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
      border: 1.5px solid ${accentColor}44;
      overflow: hidden;
    }
    .ibu-avatar img { width: 26px; height: 26px; object-fit: contain; }
    .ibu-header-info { flex: 1; }
    .ibu-header-name {
      color: #0f172a; font-family: 'Outfit', sans-serif;
      font-size: 16px; font-weight: 700; margin: 0;
      letter-spacing: -0.02em;
    }
    .ibu-header-status {
      color: #64748b; font-size: 11px; margin: 4px 0 0;
      display: flex; align-items: center; gap: 6px;
      font-weight: 500;
    }
    .ibu-status-dot {
      width: 6px; height: 6px; background: #10b981;
      border-radius: 50%; display: inline-block;
      animation: ibu-pulse 2s infinite;
    }
    @keyframes ibu-pulse {
      0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.4; }
    }
    .ibu-close-btn {
      background: #f1f5f9; border: none; border-radius: 50%;
      width: 32px; height: 32px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #475569; font-size: 12px; font-weight: bold;
      transition: all .2s;
    }
    .ibu-close-btn:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

    .ibu-messages {
      flex: 1; overflow-y: auto; padding: 20px 18px;
      display: flex; flex-direction: column; gap: 18px;
      background-color: #f8fafc;
      background-image: radial-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      background-size: 16px 16px;
      scroll-behavior: smooth;
    }
    .ibu-messages::-webkit-scrollbar { width: 4px; }
    .ibu-messages::-webkit-scrollbar-track { background: transparent; }
    .ibu-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    .ibu-msg { display: flex; gap: 12px; max-width: 86%; align-items: flex-start; }
    .ibu-msg.ibu-bot { align-self: flex-start; }
    .ibu-msg.ibu-user { align-self: flex-end; flex-direction: row-reverse; }

    .ibu-msg-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #ffffff; border: 1.5px solid rgba(15, 23, 42, 0.06);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
      position: relative;
    }
    .ibu-msg-avatar::after {
      content: ''; position: absolute; inset: -2px; border-radius: 50%;
      border: 1px solid ${accentColor}33;
    }
    .ibu-msg-avatar img { width: 18px; height: 18px; object-fit: contain; }

    .ibu-bubble-wrapper { display: flex; flex-direction: column; flex: 1; }

    .ibu-bubble {
      padding: 12px 16px; border-radius: 20px;
      font-size: 13.5px; line-height: 1.6;
      word-break: break-word;
      font-weight: 450;
      letter-spacing: -0.01em;
    }
    .ibu-bot .ibu-bubble {
      background: #ffffff; color: #1e293b;
      border: 1px solid rgba(15, 23, 42, 0.04);
      border-top-left-radius: 4px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
    }
    .ibu-user .ibu-bubble {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -15)} 100%);
      color: #fff;
      border-top-right-radius: 4px;
      box-shadow: 0 4px 14px ${primaryColor}25;
    }
    .ibu-time {
      font-size: 10px; color: #94a3b8;
      margin-top: 6px; padding: 0 4px;
      font-weight: 500;
    }
    .ibu-user .ibu-time { text-align: right; }

    .ibu-typing-bubble {
      display: flex; gap: 5px; align-items: center; padding: 12px 18px;
      background: #ffffff; border-radius: 18px; border-top-left-radius: 4px;
      border: 1px solid rgba(15, 23, 42, 0.04);
      max-width: 68px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
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

    /* Suggestions follow-up options */
    .ibu-suggestions-container {
      display: flex; flex-direction: column; gap: 8px;
      margin-top: 10px; padding-left: 44px;
      animation: ibu-slide-in .3s ease-out;
    }
    .ibu-suggestions-label {
      font-size: 10.5px; font-weight: 700; color: #94a3b8;
      letter-spacing: 0.04em; text-transform: uppercase;
      margin-bottom: 2px;
    }
    .ibu-suggestion-btn {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #334155;
      font-size: 12.5px;
      font-weight: 500;
      padding: 9px 14px;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      transition: all .25s cubic-bezier(0.16, 1, 0.3, 1);
      width: fit-content;
      max-width: 100%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .ibu-suggestion-btn:hover {
      background: ${primaryColor}0a;
      border-color: ${primaryColor}66;
      color: ${primaryColor};
      transform: translateX(5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .ibu-quick-replies {
      padding: 6px 16px 12px;
      display: flex; gap: 8px;
      background: #f8fafc;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      flex-shrink: 0;
    }
    .ibu-quick-replies::-webkit-scrollbar { display: none; }
    .ibu-qr {
      background: #ffffff; border: 1.5px solid rgba(15, 23, 42, 0.08);
      color: #334155; border-radius: 18px;
      padding: 7px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer;
      transition: all .25s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      flex-shrink: 0;
    }
    .ibu-qr:hover {
      background: ${primaryColor};
      color: white;
      border-color: ${primaryColor};
      transform: translateY(-2px);
      box-shadow: 0 6px 12px ${primaryColor}22;
    }

    /* Floating Pill Input Wrapper */
    .ibu-input-wrapper {
      margin: 12px 16px 16px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 24px;
      padding: 6px 6px 6px 16px;
      display: flex; gap: 10px; align-items: center;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      transition: all 0.2s ease-in-out;
      flex-shrink: 0;
    }
    .ibu-input-wrapper:focus-within {
      border-color: ${primaryColor};
      box-shadow: 0 0 0 4px ${primaryColor}1a, 0 6px 16px rgba(15, 23, 42, 0.06);
    }
    .ibu-input {
      flex: 1; border: none; background: transparent;
      font-size: 13.5px; color: #1e293b;
      outline: none; resize: none; max-height: 90px; min-height: 24px;
      line-height: 1.5; font-family: inherit;
    }
    .ibu-input::placeholder { color: #94a3b8; }
    
    .ibu-send {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -15)} 100%);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .2s;
      box-shadow: 0 3px 8px ${primaryColor}33;
    }
    .ibu-send:hover { transform: scale(1.05); }
    .ibu-send:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
    .ibu-send svg { width: 15px; height: 15px; fill: white; }

    .ibu-powered {
      text-align: center; font-size: 10px; color: #94a3b8;
      padding: 0 0 10px; flex-shrink: 0;
      background: #ffffff;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    @keyframes ibu-slide-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      #ibu-chat-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; height: calc(100vh - 100px); border-radius: 20px; }
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
    <div class="ibu-input-wrapper">
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
