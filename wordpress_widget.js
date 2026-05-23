(function () {
  'use strict';

  const IBU_CONFIG = {
    apiUrl: 'https://YOUR-NEXTJS-APP.vercel.app/api/chat',
    primaryColor: '#1a3a6b',
    accentColor: '#c8a951',
    botName: 'IBU Asistan',
    theme: 'default',
    tooltipTr: 'Merhaba! 👋 IBU Dijital Asistanı sorularınızı yanıtlamaya hazır.',
    tooltipEn: 'Hello! 👋 IBU Digital Assistant is ready to help you.',
    welcomeTr: 'Merhaba! 👋 Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.',
    welcomeEn: 'Hello! 👋 I can answer your questions about enrollment, scholarships, programs, or campus life.',
    placeholderTr: 'Bir şeyler sorun...',
    placeholderEn: 'Ask me anything...',
    quickRepliesTr: ['📅 Kayıt tarihleri', '🎓 Burs imkânları', '📚 Programlar', '🏠 Yurt & konaklama'],
    quickRepliesEn: ['📅 Enrollment dates', '🎓 Scholarships', '📚 Programs', '🏠 Dormitory'],
  };

  const THEMES = {
    default: { primary: '#1a3a6b', accent: '#c8a951' },
    emerald: { primary: '#064e3b', accent: '#34d399' },
    royal: { primary: '#4c1d95', accent: '#fcd34d' },
    midnight: { primary: '#0f172a', accent: '#06b6d4' },
    crimson: { primary: '#991b1b', accent: '#cbd5e1' },
    sunset: { primary: '#7c2d12', accent: '#f59e0b' }
  };

  const t = IBU_CONFIG.theme || 'default';
  let pc = IBU_CONFIG.primaryColor || '#1a3a6b';
  let ac = IBU_CONFIG.accentColor || '#c8a951';
  if (t !== 'custom' && THEMES[t]) { pc = THEMES[t].primary; ac = THEMES[t].accent; }

  const logoUrl = IBU_CONFIG.apiUrl.replace('/api/chat', '/logoicon.ico');

  // Hex to RGB
  function hexRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  function detectLang(text) {
    return /[çğıöşüÇĞİÖŞÜ]|\b(ne|nasıl|hangi|kayıt|burs|üniversite)\b/i.test(text) ? 'tr' : 'en';
  }

  const [r,g,b] = hexRgb(pc);

  document.head.insertAdjacentHTML('beforeend',
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&family=Outfit:wght@600;700;800&display=swap">`
  );

  const css = `
#ibu-fab{position:fixed;bottom:24px;right:24px;z-index:99998;width:62px;height:62px;border-radius:50%;background:linear-gradient(145deg,${pc},rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)}));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(${r},${g},${b},.45),0 2px 8px rgba(0,0,0,.2);transition:all .35s cubic-bezier(.34,1.56,.64,1);}
#ibu-fab:hover{transform:scale(1.1);box-shadow:0 12px 40px rgba(${r},${g},${b},.55),0 4px 16px rgba(0,0,0,.25);}
#ibu-fab img{width:30px;height:30px;object-fit:contain;filter:brightness(0) invert(1);}

#ibu-tooltip{position:fixed;bottom:36px;right:100px;z-index:99997;max-width:230px;background:white;border-radius:18px;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:#1e293b;line-height:1.5;display:flex;align-items:flex-start;gap:10px;opacity:0;transform:scale(.9) translateX(10px);pointer-events:none;transition:all .4s cubic-bezier(.34,1.56,.64,1);}
#ibu-tooltip.show{opacity:1;transform:scale(1) translateX(0);pointer-events:all;}
#ibu-tooltip::after{content:'';position:absolute;right:-7px;top:50%;transform:translateY(-50%) rotate(45deg);width:12px;height:12px;background:white;box-shadow:2px -2px 6px rgba(0,0,0,.04);}
#ibu-tooltip .tc{background:#f1f5f9;border:none;width:22px;height:22px;min-width:22px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b;transition:all .2s;}
#ibu-tooltip .tc:hover{background:#e2e8f0;color:#1e293b;}

#ibu-win{position:fixed;bottom:100px;right:24px;z-index:99999;width:390px;height:600px;background:#ffffff;border-radius:28px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.08),0 0 0 1px rgba(0,0,0,.04);transform:scale(.88) translateY(24px);transform-origin:bottom right;opacity:0;pointer-events:none;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;font-family:'Inter',sans-serif;}
#ibu-win.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}

.ibu-hdr{background:linear-gradient(150deg,${pc} 0%,rgb(${Math.max(0,r-45)},${Math.max(0,g-45)},${Math.max(0,b-45)}) 100%);padding:20px 18px 18px;display:flex;align-items:center;gap:14px;flex-shrink:0;position:relative;overflow:hidden;}
.ibu-hdr::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='28'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none;}
.ibu-hdr::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${ac},transparent);opacity:.7;}
.ibu-av{width:46px;height:46px;min-width:46px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);}
.ibu-av img{width:26px;height:26px;object-fit:contain;filter:brightness(0) invert(1);}
.ibu-hdr-txt{flex:1;}
.ibu-hdr-name{font-family:'Outfit',sans-serif;font-size:17px;font-weight:700;color:#fff;letter-spacing:-.02em;margin:0;text-shadow:0 1px 3px rgba(0,0,0,.15);}
.ibu-hdr-sub{font-size:11px;color:rgba(255,255,255,.75);margin:3px 0 0;display:flex;align-items:center;gap:5px;font-weight:500;}
.ibu-dot{width:7px;height:7px;background:#34d399;border-radius:50%;animation:ibu-p 2s infinite;}
@keyframes ibu-p{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.4);}}
.ibu-xbtn{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.9);font-size:14px;transition:all .2s;backdrop-filter:blur(8px);}
.ibu-xbtn:hover{background:rgba(255,255,255,.25);transform:rotate(90deg);}

.ibu-msgs{flex:1;overflow-y:auto;padding:20px 16px 12px;display:flex;flex-direction:column;gap:0;scroll-behavior:smooth;background:linear-gradient(180deg,#f8faff 0%,#ffffff 100%);}
.ibu-msgs::-webkit-scrollbar{width:3px;}
.ibu-msgs::-webkit-scrollbar-track{background:transparent;}
.ibu-msgs::-webkit-scrollbar-thumb{background:rgba(${r},${g},${b},.15);border-radius:4px;}

/* Message groups */
.ibu-group{display:flex;flex-direction:column;margin-bottom:18px;}
.ibu-group.grp-usr{align-items:flex-end;}
.ibu-group.grp-bot{align-items:flex-start;}

.ibu-group-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:0 2px;}
.ibu-group.grp-usr .ibu-group-hd{flex-direction:row-reverse;}

/* Bot avatar — ring glow */
.ibu-bav{width:38px;height:38px;min-width:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2.5px ${pc},0 4px 16px rgba(${r},${g},${b},.25);flex-shrink:0;overflow:hidden;}
.ibu-bav img{width:24px;height:24px;object-fit:contain;}

.ibu-sender{font-size:11.5px;font-weight:700;color:${pc};letter-spacing:.01em;}

/* Bubble wraps */
.ibu-bub-wrap{display:flex;flex-direction:column;gap:3px;max-width:80%;}
.grp-usr .ibu-bub-wrap{align-items:flex-end;}
.grp-bot .ibu-bub-wrap{align-items:flex-start;padding-left:48px;}

/* Base bubble */
.ibu-bub{padding:13px 17px;font-size:14px;line-height:1.7;word-break:break-word;font-weight:400;animation:ibu-pop .28s cubic-bezier(.34,1.56,.64,1);letter-spacing:-.01em;}
@keyframes ibu-pop{from{opacity:0;transform:scale(.92) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}

/* Bot bubbles — white card with left accent bar */
.grp-bot .ibu-bub{background:#fff;color:#1e293b;border-radius:3px 20px 20px 20px;box-shadow:0 2px 16px rgba(15,23,42,.07),0 0 0 1px rgba(15,23,42,.04);border-left:3px solid ${pc};}
.grp-bot .ibu-bub + .ibu-bub{border-radius:3px 20px 20px 20px;margin-top:3px;}
.grp-bot .ibu-bub:last-child{border-radius:3px 20px 20px 20px;}

/* User bubbles — rich vibrant gradient */
.grp-usr .ibu-bub{background:linear-gradient(140deg,rgba(${r},${g},${b},1) 0%,rgba(${Math.max(0,r-55)},${Math.max(0,g-55)},${Math.max(0,b-55)},1) 100%);color:#fff;border-radius:20px 3px 20px 20px;box-shadow:0 6px 24px rgba(${r},${g},${b},.4),0 2px 8px rgba(${r},${g},${b},.25);}
.grp-usr .ibu-bub + .ibu-bub{border-radius:20px 3px 20px 20px;margin-top:3px;}
.grp-usr .ibu-bub:last-child{border-radius:20px 3px 20px 20px;}

/* Timestamp */
.ibu-ts-group{font-size:10px;color:#94a3b8;font-weight:500;margin-top:5px;padding:0 4px;letter-spacing:.01em;}
.grp-usr .ibu-ts-group{text-align:right;}

/* Date separator */
.ibu-day-sep{text-align:center;margin:16px 0 10px;}
.ibu-day-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(${r},${g},${b},.07);color:${pc};font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:20px;padding:5px 14px;}

/* Typing indicator */
.ibu-typing-wrap{display:flex;align-items:center;gap:10px;margin-bottom:14px;animation:ibu-pop .28s cubic-bezier(.34,1.56,.64,1);}
.ibu-typing-wrap .ibu-bav{flex-shrink:0;}
.ibu-typing{display:flex;gap:5px;align-items:center;padding:15px 19px;background:#fff;border-radius:3px 20px 20px 20px;box-shadow:0 2px 16px rgba(15,23,42,.07),0 0 0 1px rgba(15,23,42,.04);border-left:3px solid ${pc};}
.ibu-typing span{width:7px;height:7px;background:rgba(${r},${g},${b},.4);border-radius:50%;animation:ibu-b 1.4s infinite;}
.ibu-typing span:nth-child(2){animation-delay:.18s;}
.ibu-typing span:nth-child(3){animation-delay:.36s;}
@keyframes ibu-b{0%,60%,100%{transform:translateY(0);background:rgba(${r},${g},${b},.35);}30%{transform:translateY(-7px);background:rgba(${r},${g},${b},.8);}}

/* Suggestions */
.ibu-sug-wrap{padding-left:48px;margin-top:10px;margin-bottom:4px;animation:ibu-pop .3s cubic-bezier(.34,1.56,.64,1);}
.ibu-sug-lbl{font-size:10.5px;font-weight:700;color:rgba(${r},${g},${b},.55);letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;}
.ibu-sug-list{display:flex;flex-direction:column;gap:7px;}
.ibu-sug-btn{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid rgba(${r},${g},${b},.18);color:#1e293b;font-size:13px;font-weight:500;padding:10px 16px;border-radius:14px;cursor:pointer;text-align:left;transition:all .22s cubic-bezier(.16,1,.3,1);width:fit-content;max-width:100%;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(15,23,42,.05);}
.ibu-sug-btn::before{content:'→';font-size:13px;color:rgba(${r},${g},${b},.5);transition:transform .2s;flex-shrink:0;}
.ibu-sug-btn:hover{background:rgba(${r},${g},${b},.06);border-color:rgba(${r},${g},${b},.45);transform:translateX(5px);box-shadow:0 4px 14px rgba(${r},${g},${b},.12);}
.ibu-sug-btn:hover::before{transform:translateX(3px);color:${pc};}

/* Quick reply chips */
.ibu-qr-bar{padding:6px 14px 10px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;background:transparent;}
.ibu-qr-bar::-webkit-scrollbar{display:none;}
.ibu-qr-chip{background:#fff;border:1.5px solid rgba(${r},${g},${b},.18);color:${pc};border-radius:22px;padding:8px 16px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .25s cubic-bezier(.16,1,.3,1);box-shadow:0 2px 8px rgba(${r},${g},${b},.08);font-family:'Inter',sans-serif;letter-spacing:-.01em;}
.ibu-qr-chip:hover{background:${pc};color:#fff;border-color:${pc};box-shadow:0 6px 18px rgba(${r},${g},${b},.35);transform:translateY(-2px) scale(1.02);}

/* Input area */
.ibu-inp-zone{margin:8px 12px 14px;background:#fff;border-radius:26px;display:flex;align-items:flex-end;gap:8px;padding:10px 10px 10px 18px;border:1.5px solid rgba(15,23,42,.08);box-shadow:0 4px 20px rgba(15,23,42,.06);transition:all .25s;flex-shrink:0;}
.ibu-inp-zone:focus-within{border-color:rgba(${r},${g},${b},.5);box-shadow:0 0 0 4px rgba(${r},${g},${b},.1),0 6px 24px rgba(15,23,42,.08);}
.ibu-inp{flex:1;border:none;background:transparent;font-size:14px;color:#1e293b;outline:none;resize:none;max-height:110px;min-height:22px;line-height:1.5;font-family:'Inter',sans-serif;font-weight:400;}
.ibu-inp::placeholder{color:#b0bec5;}

/* Send button */
.ibu-send{width:40px;height:40px;border-radius:50%;background:linear-gradient(140deg,${pc},rgba(${Math.max(0,r-35)},${Math.max(0,g-35)},${Math.max(0,b-35)},1));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .25s cubic-bezier(.34,1.56,.64,1);box-shadow:0 4px 14px rgba(${r},${g},${b},.4);}
.ibu-send:hover{transform:scale(1.1) rotate(-10deg);box-shadow:0 6px 20px rgba(${r},${g},${b},.5);}
.ibu-send:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none;}
.ibu-send svg{width:16px;height:16px;fill:#fff;margin-left:2px;}

/* Footer */
.ibu-foot{text-align:center;font-size:10px;color:#b0bec5;padding:0 0 11px;flex-shrink:0;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:#ffffff;}

@media(max-width:480px){#ibu-win{width:calc(100vw - 12px);right:6px;bottom:82px;height:calc(100dvh - 100px);border-radius:22px;}#ibu-fab{right:14px;bottom:14px;}#ibu-tooltip{right:88px;bottom:28px;max-width:200px;}}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // FAB
  const fab = document.createElement('button');
  fab.id = 'ibu-fab';
  fab.setAttribute('aria-label', 'IBU Chatbot');
  fab.innerHTML = `<img src="${logoUrl}" alt="IBU">`;

  // Tooltip
  const tip = document.createElement('div');
  tip.id = 'ibu-tooltip';
  tip.innerHTML = `<div style="flex:1">${IBU_CONFIG.tooltipTr}</div><button class="tc" aria-label="Kapat">✕</button>`;

  // Window
  const win = document.createElement('div');
  win.id = 'ibu-win';
  win.setAttribute('role', 'dialog');
  win.innerHTML = `
<div class="ibu-hdr">
  <div class="ibu-av"><img src="${logoUrl}" alt="IBU"></div>
  <div class="ibu-hdr-txt">
    <p class="ibu-hdr-name">${IBU_CONFIG.botName}</p>
    <p class="ibu-hdr-sub"><span class="ibu-dot"></span> <span id="ibu-st">Çevrimiçi • Aktif Asistan</span></p>
  </div>
  <button class="ibu-xbtn" id="ibu-x">✕</button>
</div>
<div class="ibu-msgs" id="ibu-msgs"></div>
<div class="ibu-qr-bar" id="ibu-qr"></div>
<div class="ibu-inp-zone">
  <textarea class="ibu-inp" id="ibu-inp" rows="1" placeholder="${IBU_CONFIG.placeholderTr}"></textarea>
  <button class="ibu-send" id="ibu-s" aria-label="Gönder">
    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  </button>
</div>
<div class="ibu-foot">Powered by IBU AI ✦</div>`;

  document.body.appendChild(fab);
  document.body.appendChild(tip);
  document.body.appendChild(win);

  const msgsEl = document.getElementById('ibu-msgs');
  const inpEl  = document.getElementById('ibu-inp');
  const sBtn   = document.getElementById('ibu-s');
  const xBtn   = document.getElementById('ibu-x');
  const qrEl   = document.getElementById('ibu-qr');

  let open = false, typing = false, lang = 'tr';
  const hist = [];

  function ts() {
    return new Date().toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  function scroll() { setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30); }

  function addMsg(text, role) {
    const group = document.createElement('div');
    group.className = `ibu-group ${role === 'bot' ? 'grp-bot' : 'grp-usr'}`;
    if (role === 'bot') {
      group.innerHTML = `
        <div class="ibu-group-hd">
          <div class="ibu-bav"><img src="${logoUrl}" alt="IBU"></div>
          <span class="ibu-sender">${IBU_CONFIG.botName}</span>
        </div>
        <div class="ibu-bub-wrap">
          <div class="ibu-bub">${text.replace(/\n/g,'<br>')}</div>
          <div class="ibu-ts-group">${ts()}</div>
        </div>`;
    } else {
      group.innerHTML = `
        <div class="ibu-bub-wrap">
          <div class="ibu-bub">${text.replace(/\n/g,'<br>')}</div>
          <div class="ibu-ts-group">${ts()}</div>
        </div>`;
    }
    msgsEl.appendChild(group);
    scroll();
    return group;
  }

  function showTyp() {
    const wrap = document.createElement('div');
    wrap.id = 'ibu-typ';
    wrap.className = 'ibu-typing-wrap';
    wrap.innerHTML = `<div class="ibu-bav"><img src="${logoUrl}" alt="B"></div><div class="ibu-typing"><span></span><span></span><span></span></div>`;
    msgsEl.appendChild(wrap);
    scroll();
  }
  function hideTyp() { const t = document.getElementById('ibu-typ'); if (t) t.remove(); }

  function addSuggs(botGroup, list) {
    const wrap = document.createElement('div');
    wrap.className = 'ibu-sug-wrap';
    const lbl = document.createElement('div');
    lbl.className = 'ibu-sug-lbl';
    lbl.textContent = lang === 'tr' ? '💡 Bunları da sorabilirsiniz' : '💡 You can also ask';
    wrap.appendChild(lbl);
    const lst = document.createElement('div');
    lst.className = 'ibu-sug-list';
    list.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'ibu-sug-btn';
      btn.textContent = q;
      btn.onclick = () => { wrap.remove(); document.querySelectorAll('.ibu-sug-wrap').forEach(w=>w.remove()); send(q); };
      lst.appendChild(btn);
    });
    wrap.appendChild(lst);
    // Insert after the bot group
    botGroup.insertAdjacentElement('afterend', wrap);
    scroll();
  }

  function setQR(l) {
    const chips = l === 'tr' ? IBU_CONFIG.quickRepliesTr : IBU_CONFIG.quickRepliesEn;
    qrEl.innerHTML = '';
    chips.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ibu-qr-chip';
      btn.textContent = c;
      btn.onclick = () => { qrEl.innerHTML = ''; document.querySelectorAll('.ibu-sug-wrap').forEach(w=>w.remove()); send(c.replace(/^\S+\s/,'')); };
      qrEl.appendChild(btn);
    });
  }

  async function send(text) {
    if (typing) return;
    typing = true;
    sBtn.disabled = true;
    addMsg(text, 'user');
    qrEl.innerHTML = '';
    document.querySelectorAll('.ibu-sug-wrap').forEach(w=>w.remove());

    const dl = detectLang(text);
    if (dl !== lang) {
      lang = dl;
      inpEl.placeholder = lang === 'tr' ? IBU_CONFIG.placeholderTr : IBU_CONFIG.placeholderEn;
    }

    showTyp();

    try {
      const hp = hist.map(h=>({role:h.role,content:h.content}));
      hist.push({role:'user',content:text});

      const resp = await fetch(IBU_CONFIG.apiUrl, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: text, sessionId: 'sess_' + Math.random().toString(36).slice(2), history: hp, lang })
      });

      if (!resp.ok) throw new Error('fail');
      hideTyp();

      const botGroup = document.createElement('div');
      botGroup.className = 'ibu-group grp-bot';
      botGroup.innerHTML = `
        <div class="ibu-group-hd">
          <div class="ibu-bav"><img src="${logoUrl}" alt="IBU"></div>
          <span class="ibu-sender">${IBU_CONFIG.botName}</span>
        </div>
        <div class="ibu-bub-wrap">
          <div class="ibu-bub"></div>
          <div class="ibu-ts-group">${ts()}</div>
        </div>`;
      msgsEl.appendChild(botGroup);
      const bub = botGroup.querySelector('.ibu-bub');

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue;
          try {
            const d = JSON.parse(line.slice(5));
            if (d.text) { full += d.text; bub.innerHTML = full.replace(/\n/g,'<br>'); scroll(); }
            if (d.done) {
              lang = d.lang || lang;
              if (d.suggestions?.length) addSuggs(botGroup, d.suggestions);
            }
          } catch {}
        }
      }
      hist.push({role:'assistant',content:full});

    } catch {
      hideTyp();
      addMsg(lang==='tr'?'Bağlantı hatası. Lütfen tekrar deneyin.':'Connection error. Please try again.','bot');
    }

    typing = false;
    sBtn.disabled = false;
    inpEl.focus();
  }

  fab.addEventListener('click', () => {
    open = !open;
    win.classList.toggle('open', open);
    tip.classList.remove('show');
    if (open && msgsEl.children.length === 0) {
      addMsg(IBU_CONFIG.welcomeTr, 'bot');
      setQR('tr');
      setTimeout(() => inpEl.focus(), 350);
    }
  });

  xBtn.addEventListener('click', () => { open = false; win.classList.remove('open'); });
  sBtn.addEventListener('click', () => { const t = inpEl.value.trim(); if (t) { inpEl.value=''; inpEl.style.height='auto'; send(t); } });
  inpEl.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); const t=inpEl.value.trim(); if(t){inpEl.value='';inpEl.style.height='auto';send(t);} }
  });
  inpEl.addEventListener('input', () => { inpEl.style.height='auto'; inpEl.style.height=Math.min(inpEl.scrollHeight,100)+'px'; });
  document.addEventListener('keydown', e => { if(e.key==='Escape'&&open){open=false;win.classList.remove('open');} });
  tip.querySelector('.tc').addEventListener('click', e => {
    e.stopPropagation();
    tip.classList.remove('show');
    localStorage.setItem('ibu-tip-gone','1');
  });
  setTimeout(() => {
    if (!open && !localStorage.getItem('ibu-tip-gone')) tip.classList.add('show');
  }, 3000);
})();
