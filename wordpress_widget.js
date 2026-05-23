(function () {
    'use strict';

    const IBU_CONFIG = {
        apiUrl: 'https://YOUR-NEXTJS-APP.vercel.app/api/chat',
        primaryColor: '#1a3a6b',
        accentColor: '#c8a951',
        botName: 'IBU Asistan',
        theme: 'default',
        tooltipTr: 'Merhaba! IBU Dijital Asistanı sorularınızı yanıtlamaya hazır.',
        tooltipEn: 'Hello! IBU Digital Assistant is ready to help you.',
        welcomeTr: 'Merhaba. Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.',
        welcomeEn: 'Hello. I can answer your questions about enrollment, scholarships, programs, or campus life.',
        placeholderTr: 'Bir şeyler sorun...',
        placeholderEn: 'Ask me anything...',
        quickRepliesTr: ['Kayıt tarihleri', 'Burs imkânları', 'Programlar', 'Yurt & konaklama'],
        quickRepliesEn: ['Enrollment dates', 'Scholarships', 'Programs', 'Dormitory'],
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

    // Hex to RGB
    function hexRgb(hex) {
        let h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }

    function detectLang(text) {
        return /[çğıöşüÇĞİÖŞÜ]|\b(ne|nasıl|hangi|kayıt|burs|üniversite)\b/i.test(text) ? 'tr' : 'en';
    }

    const [r, g, b] = hexRgb(pc);
    const [ar, ag, ab] = hexRgb(ac);

    document.head.insertAdjacentHTML('beforeend',
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap">`
    );

    const css = `
@keyframes ibu-pulse{0%,100%{box-shadow:0 0 0 0 rgba(${r},${g},${b},.4);}70%{box-shadow:0 0 0 10px rgba(${r},${g},${b},0);}}
@keyframes ibu-pop{from{opacity:0;transform:scale(.92) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes ibu-dots{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
@keyframes ibu-slide{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
@keyframes ibu-enter{from{opacity:0;transform:scale(.93) translateY(24px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes ibu-fadeIn{from{opacity:0;}to{opacity:1;}}

/* ── FAB ── */
#ibu-fab{
  position:fixed;bottom:24px;right:24px;z-index:99998;
  width:58px;height:58px;border-radius:16px;
  background:linear-gradient(145deg,${pc},rgb(${Math.max(0, r - 45)},${Math.max(0, g - 45)},${Math.max(0, b - 45)}));
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(${r},${g},${b},.45),0 2px 8px rgba(0,0,0,.12);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s ease;
  animation:ibu-pulse 2.8s ease-out 3.5s 3;
}
#ibu-fab:hover{
  transform:scale(1.06);
  box-shadow:0 12px 32px rgba(${r},${g},${b},.55),0 4px 12px rgba(0,0,0,.14);
}
#ibu-fab svg{display:block;flex-shrink:0;}

/* ── TOOLTIP ── */
#ibu-tooltip{
  position:fixed;bottom:36px;right:90px;z-index:99997;
  max-width:230px;
  background:#fff;
  border-radius:14px;
  padding:12px 14px;
  box-shadow:0 12px 40px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.06);
  font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:500;
  color:#1e293b;line-height:1.5;
  display:flex;align-items:flex-start;gap:8px;
  opacity:0;transform:translateX(10px) scale(.95);
  pointer-events:none;
  transition:opacity .3s ease,transform .3s cubic-bezier(.34,1.56,.64,1);
}
#ibu-tooltip.show{opacity:1;transform:translateX(0) scale(1);pointer-events:all;}
#ibu-tooltip::after{
  content:'';position:absolute;right:-5px;top:50%;
  transform:translateY(-50%) rotate(45deg);
  width:10px;height:10px;
  background:#fff;
  box-shadow:2px -2px 4px rgba(0,0,0,.04);
}
#ibu-tooltip .tc{
  background:transparent;border:none;
  width:20px;height:20px;min-width:20px;
  border-radius:50%;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:#94a3b8;transition:color .2s;padding:0;
}
#ibu-tooltip .tc:hover{color:#475569;}

/* ── MAIN WINDOW ── */
#ibu-win{
  position:fixed;bottom:96px;right:24px;z-index:99999;
  width:380px;height:580px;
  border-radius:20px;
  display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 24px 64px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.08),0 0 0 1px rgba(0,0,0,.06);
  transform:scale(.9) translateY(20px);transform-origin:bottom right;
  opacity:0;pointer-events:none;
  transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .22s ease;
  font-family:'DM Sans',sans-serif;
  background:#f8f9fc;
}
#ibu-win.open{
  transform:scale(1) translateY(0);opacity:1;pointer-events:all;
  animation:ibu-enter .35s cubic-bezier(.34,1.56,.64,1);
}

/* ── HEADER ── */
.ibu-hdr{
  background:linear-gradient(148deg,${pc} 0%,rgb(${Math.max(0, r - 55)},${Math.max(0, g - 55)},${Math.max(0, b - 55)}) 100%);
  padding:16px 18px;
  display:flex;align-items:center;gap:0;
  flex-shrink:0;position:relative;overflow:hidden;
}
.ibu-hdr::before{
  content:'';position:absolute;top:-60px;right:-30px;
  width:180px;height:180px;
  background:radial-gradient(circle,rgba(255,255,255,.08) 0%,transparent 65%);
  pointer-events:none;
}
.ibu-hdr::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(${ar},${ag},${ab},.7),transparent);
}
.ibu-hdr-txt{flex:1;min-width:0;}
.ibu-hdr-name{
  font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;
  color:#fff;letter-spacing:-.02em;margin:0;line-height:1.2;
}
.ibu-hdr-sub{
  font-size:10px;color:rgba(255,255,255,.65);margin:3px 0 0;
  display:flex;align-items:center;gap:5px;font-weight:400;
}
.ibu-dot{
  width:6px;height:6px;background:#4ade80;border-radius:50%;
  box-shadow:0 0 5px rgba(74,222,128,.8);
  animation:ibu-pulse 2.5s infinite;flex-shrink:0;
}

/* Close button */
.ibu-xbtn{
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);
  border-radius:8px;width:30px;height:30px;flex-shrink:0;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.75);transition:all .2s;
}
.ibu-xbtn:hover{background:rgba(255,255,255,.22);color:#fff;}

/* ── MESSAGES ── */
.ibu-msgs{
  flex:1;overflow-y:auto;
  padding:18px 14px 10px;
  display:flex;flex-direction:column;gap:0;
  scroll-behavior:smooth;
  background:#f8f9fc;
}
.ibu-msgs::-webkit-scrollbar{width:3px;}
.ibu-msgs::-webkit-scrollbar-thumb{background:rgba(${r},${g},${b},.12);border-radius:4px;}
.ibu-msgs::-webkit-scrollbar-track{background:transparent;}

.ibu-group{display:flex;flex-direction:column;margin-bottom:16px;}
.ibu-group.grp-usr{align-items:flex-end;}
.ibu-group.grp-bot{align-items:flex-start;}

.ibu-bub-wrap{display:flex;flex-direction:column;gap:3px;max-width:84%;}
.grp-usr .ibu-bub-wrap{align-items:flex-end;}
.grp-bot .ibu-bub-wrap{align-items:flex-start;padding-left:0;}

.ibu-bub{
  padding:11px 15px;font-size:13.5px;line-height:1.65;
  word-break:break-word;font-weight:400;
  animation:ibu-pop .28s cubic-bezier(.34,1.56,.64,1);
  letter-spacing:-.01em;
}
.grp-bot .ibu-bub{
  background:#fff;color:#1e293b;
  border-radius:6px 18px 18px 18px;
  box-shadow:0 1px 4px rgba(0,0,0,.06);
  border:1px solid rgba(0,0,0,.06);
}
.grp-usr .ibu-bub{
  background:linear-gradient(138deg,${pc} 0%,rgb(${Math.max(0, r - 50)},${Math.max(0, g - 50)},${Math.max(0, b - 50)}) 100%);
  color:#fff;
  border-radius:16px 4px 16px 16px;
  box-shadow:0 4px 18px rgba(${r},${g},${b},.38),0 2px 6px rgba(${r},${g},${b},.18);
}
.ibu-ts-group{
  font-size:9.5px;color:#b0bec5;font-weight:400;
  margin-top:3px;padding:0 3px;
}
.grp-usr .ibu-ts-group{text-align:right;}

/* ── TYPING ── */
.ibu-typing-wrap{
  display:flex;align-items:flex-start;
  margin-bottom:14px;
  animation:ibu-fadeIn .22s ease;
}
.ibu-typing{
  display:flex;gap:4px;align-items:center;
  padding:12px 16px;
  background:#fff;
  border-radius:4px 16px 16px 16px;
  box-shadow:0 1px 4px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.05);
}
.ibu-typing span{
  width:6px;height:6px;border-radius:50%;
  animation:ibu-dots 1.5s infinite;
}
.ibu-typing span:nth-child(1){background:rgba(${r},${g},${b},.35);animation-delay:0s;}
.ibu-typing span:nth-child(2){background:rgba(${r},${g},${b},.6);animation-delay:.18s;}
.ibu-typing span:nth-child(3){background:rgba(${r},${g},${b},.85);animation-delay:.36s;}

/* ── SUGGESTIONS ── */
.ibu-sug-wrap{
  padding-left:0;margin-top:8px;margin-bottom:4px;
  animation:ibu-slide .28s ease;
}
.ibu-sug-lbl{
  font-size:10px;font-weight:600;
  color:rgba(${r},${g},${b},.5);
  letter-spacing:.06em;text-transform:uppercase;
  margin-bottom:8px;padding-left:2px;
}
.ibu-sug-list{display:flex;flex-direction:column;gap:6px;}
.ibu-sug-btn{
  display:inline-flex;align-items:center;justify-content:space-between;gap:10px;
  background:#fff;
  border:1.5px solid rgba(${r},${g},${b},.14);
  color:#334155;font-size:12.5px;font-weight:500;
  padding:9px 13px;border-radius:10px;
  cursor:pointer;text-align:left;
  transition:all .2s cubic-bezier(.16,1,.3,1);
  width:fit-content;max-width:100%;
  font-family:'DM Sans',sans-serif;
  box-shadow:0 1px 4px rgba(0,0,0,.04);
}
.ibu-sug-btn:hover{
  background:rgba(${r},${g},${b},.05);
  border-color:rgba(${r},${g},${b},.35);
  transform:translateX(4px);
  box-shadow:0 3px 12px rgba(${r},${g},${b},.12);
  color:${pc};
}
.ibu-sug-btn svg{
  color:rgba(${r},${g},${b},.35);flex-shrink:0;
  transition:transform .2s,color .2s;
}
.ibu-sug-btn:hover svg{
  transform:translateX(2px);color:${pc};
}

/* ── QUICK REPLIES ── */
.ibu-qr-bar{
  padding:6px 12px 10px;display:flex;gap:7px;
  overflow-x:auto;scrollbar-width:none;flex-shrink:0;background:transparent;
}
.ibu-qr-bar::-webkit-scrollbar{display:none;}
.ibu-qr-chip{
  background:#fff;
  border:1.5px solid rgba(${r},${g},${b},.16);
  color:${pc};border-radius:8px;
  padding:7px 13px;font-size:12px;font-weight:600;
  cursor:pointer;white-space:nowrap;flex-shrink:0;
  transition:all .22s ease;
  box-shadow:0 1px 4px rgba(${r},${g},${b},.07);
  font-family:'DM Sans',sans-serif;
}
.ibu-qr-chip:hover{
  background:${pc};color:#fff;border-color:${pc};
  box-shadow:0 4px 14px rgba(${r},${g},${b},.32);
  transform:translateY(-1px);
}

/* ── INPUT ── */
.ibu-inp-zone{
  margin:6px 10px 12px;background:#fff;
  border-radius:14px;
  display:flex;align-items:flex-end;gap:8px;
  padding:8px 8px 8px 16px;
  border:1.5px solid rgba(15,23,42,.07);
  box-shadow:0 2px 12px rgba(15,23,42,.06);
  transition:border-color .22s,box-shadow .22s;flex-shrink:0;
}
.ibu-inp-zone:focus-within{
  border-color:rgba(${r},${g},${b},.4);
  box-shadow:0 0 0 3px rgba(${r},${g},${b},.08),0 4px 16px rgba(15,23,42,.07);
}
.ibu-inp{
  flex:1;border:none;background:transparent;
  font-size:13.5px;color:#1e293b;outline:none;resize:none;
  max-height:100px;min-height:20px;line-height:1.5;
  font-family:'DM Sans',sans-serif;font-weight:400;
}
.ibu-inp::placeholder{color:#c4cdd6;}
.ibu-send{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  background:linear-gradient(140deg,${pc},rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)}));
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  box-shadow:0 3px 12px rgba(${r},${g},${b},.38);
}
.ibu-send:hover{transform:scale(1.08);box-shadow:0 5px 18px rgba(${r},${g},${b},.5);}
.ibu-send:disabled{opacity:.25;cursor:not-allowed;transform:none;box-shadow:none;}
.ibu-send svg{display:block;}

/* ── FOOTER ── */
.ibu-foot{
  text-align:center;font-size:9px;color:#c8d0db;
  padding:0 0 10px;flex-shrink:0;
  font-weight:500;letter-spacing:.08em;text-transform:uppercase;
  background:#f8f9fc;
}

@media(max-width:480px){
  #ibu-win{width:calc(100vw - 16px);right:8px;bottom:80px;height:calc(100dvh - 96px);border-radius:18px;}
  #ibu-fab{right:16px;bottom:16px;}
  #ibu-tooltip{right:84px;bottom:26px;max-width:195px;}
}
`;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── FAB ──
    const fab = document.createElement('button');
    fab.id = 'ibu-fab';
    fab.setAttribute('aria-label', 'IBU Chatbot');
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" width="24" height="24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

    // ── TOOLTIP ──
    const tip = document.createElement('div');
    tip.id = 'ibu-tooltip';
    tip.innerHTML = `
    <div style="flex:1">${IBU_CONFIG.tooltipTr}</div>
    <button class="tc" aria-label="Kapat">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

    // ── WINDOW ──
    const win = document.createElement('div');
    win.id = 'ibu-win';
    win.setAttribute('role', 'dialog');
    win.innerHTML = `
<div class="ibu-hdr">
  <div class="ibu-hdr-txt">
    <p class="ibu-hdr-name">${IBU_CONFIG.botName}</p>
    <p class="ibu-hdr-sub"><span class="ibu-dot"></span><span id="ibu-st">Çevrimiçi · Aktif Asistan</span></p>
  </div>
  <div id="ibu-lang" style="display:flex;border:1px solid rgba(255,255,255,.2);border-radius:20px;overflow:hidden;font-size:9px;font-weight:700;margin-right:8px;">
    <button id="ibu-tr" style="padding:3px 9px;background:rgba(255,255,255,.25);color:white;border:none;cursor:pointer;">TR</button>
    <button id="ibu-en" style="padding:3px 9px;background:transparent;color:rgba(255,255,255,.7);border:none;cursor:pointer;">EN</button>
  </div>
  <button class="ibu-xbtn" id="ibu-x">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
</div>
<div class="ibu-msgs" id="ibu-msgs"></div>
<div class="ibu-qr-bar" id="ibu-qr"></div>
<div class="ibu-inp-zone">
  <textarea class="ibu-inp" id="ibu-inp" rows="1" placeholder="${IBU_CONFIG.placeholderTr}"></textarea>
  <button class="ibu-send" id="ibu-s" aria-label="Gönder">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
  </button>
</div>
<div class="ibu-foot">IBU · AI Asistan</div>`;

    document.body.appendChild(fab);
    document.body.appendChild(tip);
    document.body.appendChild(win);

    const msgsEl = document.getElementById('ibu-msgs');
    const inpEl = document.getElementById('ibu-inp');
    const sBtn = document.getElementById('ibu-s');
    const xBtn = document.getElementById('ibu-x');
    const qrEl = document.getElementById('ibu-qr');
    const trBtn = document.getElementById('ibu-tr');
    const enBtn = document.getElementById('ibu-en');

    let open = false, typing = false, lang = 'tr';
    const hist = [];

    // TR / EN switch
    document.getElementById('ibu-tr').onclick = () => { lang='tr'; inpEl.placeholder=IBU_CONFIG.placeholderTr; document.getElementById('ibu-tr').style.background='rgba(255,255,255,.25)'; document.getElementById('ibu-en').style.background='transparent'; document.getElementById('ibu-st').textContent = 'Çevrimiçi · Aktif Asistan'; }
    document.getElementById('ibu-en').onclick = () => { lang='en'; inpEl.placeholder=IBU_CONFIG.placeholderEn; document.getElementById('ibu-en').style.background='rgba(255,255,255,.25)'; document.getElementById('ibu-tr').style.background='transparent'; document.getElementById('ibu-st').textContent = 'Online · Active Assistant'; }

    function ts() {
        return new Date().toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    function scroll() { setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30); }

    function addMsg(text, role) {
        const group = document.createElement('div');
        group.className = `ibu-group ${role === 'bot' ? 'grp-bot' : 'grp-usr'}`;
        group.innerHTML = `
      <div class="ibu-bub-wrap">
        <div class="ibu-bub">${text.replace(/\n/g, '<br>')}</div>
        <div class="ibu-ts-group">${ts()}</div>
      </div>`;
        msgsEl.appendChild(group);
        scroll();
        return group;
    }

    function showTyp() {
        const wrap = document.createElement('div');
        wrap.id = 'ibu-typ';
        wrap.className = 'ibu-typing-wrap';
        wrap.innerHTML = `<div class="ibu-typing"><span></span><span></span><span></span></div>`;
        msgsEl.appendChild(wrap);
        scroll();
    }
    function hideTyp() { const el = document.getElementById('ibu-typ'); if (el) el.remove(); }

    function addSuggs(botGroup, list) {
        const wrap = document.createElement('div');
        wrap.className = 'ibu-sug-wrap';
        const lbl = document.createElement('div');
        lbl.className = 'ibu-sug-lbl';
        lbl.textContent = lang === 'tr' ? 'İlgili konular' : 'Related topics';
        wrap.appendChild(lbl);
        const lst = document.createElement('div');
        lst.className = 'ibu-sug-list';
        list.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'ibu-sug-btn';
            btn.innerHTML = `<span>${q}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="9 18 15 12 9 6"/></svg>`;
            btn.onclick = () => { wrap.remove(); document.querySelectorAll('.ibu-sug-wrap').forEach(w => w.remove()); send(q); };
            lst.appendChild(btn);
        });
        wrap.appendChild(lst);
        botGroup.insertAdjacentElement('afterend', wrap);
        scroll();
    }

    function setQR(l) {
        const chips = l === 'tr' ? IBU_CONFIG.quickRepliesTr : IBU_CONFIG.quickRepliesEn;
        qrEl.innerHTML = '';
        chips.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'ibu-qr-chip';
            btn.textContent = c.replace(/^\p{Emoji}\s*/u, '');
            btn.onclick = () => { qrEl.innerHTML = ''; document.querySelectorAll('.ibu-sug-wrap').forEach(w => w.remove()); send(c); };
            qrEl.appendChild(btn);
        });
    }

    async function send(text) {
        if (typing) return;
        typing = true;
        sBtn.disabled = true;
        addMsg(text, 'user');
        qrEl.innerHTML = '';
        document.querySelectorAll('.ibu-sug-wrap').forEach(w => w.remove());

        const dl = detectLang(text);
        if (dl !== lang) {
            lang = dl;
            inpEl.placeholder = lang === 'tr' ? IBU_CONFIG.placeholderTr : IBU_CONFIG.placeholderEn;
            if (lang === 'tr') {
                trBtn.style.background='rgba(255,255,255,.25)';
                enBtn.style.background='transparent';
                document.getElementById('ibu-st').textContent = 'Çevrimiçi · Aktif Asistan';
            } else {
                enBtn.style.background='rgba(255,255,255,.25)';
                trBtn.style.background='transparent';
                document.getElementById('ibu-st').textContent = 'Online · Active Assistant';
            }
        }

        showTyp();

        try {
            const hp = hist.map(h => ({ role: h.role, content: h.content }));
            hist.push({ role: 'user', content: text });

            const resp = await fetch(IBU_CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, sessionId: 'sess_' + Math.random().toString(36).slice(2), history: hp, lang })
            });

            if (!resp.ok) throw new Error('fail');
            hideTyp();

            const botGroup = document.createElement('div');
            botGroup.className = 'ibu-group grp-bot';
            botGroup.innerHTML = `
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
                        if (d.text) { full += d.text; bub.innerHTML = full.replace(/\n/g, '<br>'); scroll(); }
                        if (d.done) {
                            lang = d.lang || lang;
                            if (d.suggestions?.length) addSuggs(botGroup, d.suggestions);
                        }
                    } catch { }
                }
            }
            hist.push({ role: 'assistant', content: full });

        } catch {
            hideTyp();
            addMsg(lang === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.', 'bot');
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
    sBtn.addEventListener('click', () => { const v = inpEl.value.trim(); if (v) { inpEl.value = ''; inpEl.style.height = 'auto'; send(v); } });
    inpEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = inpEl.value.trim(); if (v) { inpEl.value = ''; inpEl.style.height = 'auto'; send(v); } }
    });
    inpEl.addEventListener('input', () => { inpEl.style.height = 'auto'; inpEl.style.height = Math.min(inpEl.scrollHeight, 100) + 'px'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { open = false; win.classList.remove('open'); } });
    tip.querySelector('.tc').addEventListener('click', e => {
        e.stopPropagation();
        tip.classList.remove('show');
        localStorage.setItem('ibu-tip-gone', '1');
    });
    setTimeout(() => {
        if (!open && !localStorage.getItem('ibu-tip-gone')) tip.classList.add('show');
    }, 3000);
})();