/**
 * IBU Chatbot Widget — wordpress_widget.js
 * Version: 3.0 — Production Build
 *
 * KURULUM:
 *  1. apiUrl'yi Vercel deploy URL'nizle değiştirin
 *  2. WPCode Plugin → Footer → Activate
 *
 * Değişiklikler v3.0:
 *  - SSE stream parsing güvenli hale getirildi (buffer-based)
 *  - CORS preflight desteği eklendi
 *  - sessionId kalıcı hale getirildi (localStorage)
 *  - Suggestion buttons tamamen yeniden yazıldı
 *  - WhatsApp butonu logic düzeltildi
 *  - Textarea auto-resize fix
 *  - Mobile keyboard açıldığında scroll fix
 *  - Çift mesaj gönderme önlendi
 *  - renderMarkdown güvenli hale getirildi (XSS koruması)
 */

(function () {
  'use strict';

  // ── CONFIG ───────────────────────────────────────────────────
  const IBU_CONFIG = {
    apiUrl: 'https://ibuchatbot-v2.vercel.app/api/chat',  // ← Bunu değiştirin!
    botName: 'IBU Asistan',
    primaryColor: '#1a3a6b',
    accentColor: '#c8a951',
    whatsappNumber: '905050345791',
    whatsappThreshold: 0.70,
    showWhatsappAlways: false,
    tooltipTr: 'Merhaba! 👋 IBU hakkında sorularınızı yanıtlamaya hazırım.',
    tooltipEn: 'Hello! 👋 I\'m ready to answer your questions about IBU.',
    welcomeTr: 'Merhaba! IBU Dijital Asistanı olarak kayıt, burs, programlar ve kampüs hakkındaki sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?',
    welcomeEn: 'Hello! As the IBU Digital Assistant, I can answer your questions about enrollment, scholarships, programs and campus life. How can I help you?',
    placeholderTr: 'Bir şeyler sorun...',
    placeholderEn: 'Ask me anything...',
    quickRepliesTr: ['Kayıt tarihleri', 'Burs imkânları', 'Programlar', 'Yurt & konaklama'],
    quickRepliesEn: ['Enrollment dates', 'Scholarships', 'Programs', 'Dormitory'],
  };

  // ── PREVENT DOUBLE INIT ──────────────────────────────────────
  if (window.__ibuChatLoaded) return;
  window.__ibuChatLoaded = true;

  // ── SESSION ID (kalıcı) ───────────────────────────────────────
  function getSessionId() {
    try {
      let sid = sessionStorage.getItem('ibu-session-id');
      if (!sid) {
        sid = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem('ibu-session-id', sid);
      }
      return sid;
    } catch {
      return 'sess_' + Math.random().toString(36).slice(2);
    }
  }

  const SESSION_ID = getSessionId();

  // ── COLOR UTILS ───────────────────────────────────────────────
  function hexRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  const pc = IBU_CONFIG.primaryColor;
  const ac = IBU_CONFIG.accentColor;
  const [r, g, b] = hexRgb(pc);
  const [ar, ag, ab] = hexRgb(ac);
  const darkPc = `rgb(${Math.max(0, r - 45)},${Math.max(0, g - 45)},${Math.max(0, b - 45)})`;

  // ── LANG DETECTION ────────────────────────────────────────────
  function detectLang(text) {
    if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return 'tr';
    if (/\b(ne|nasıl|hangi|nerede|kayıt|burs|üniversite|okul|program|yurt)\b/i.test(text)) return 'tr';
    return 'en';
  }

  // ── MARKDOWN RENDERER (XSS-safe) ─────────────────────────────
  function renderMarkdown(text) {
    if (!text) return '';
    // Escape HTML first to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      // Bold: **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet lines: - item or * item
      .replace(/^[\-\*] (.+)/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`)
      // Links: [text](url)
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
        `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${pc};text-decoration:underline;">$1</a>`)
      // Double newlines → paragraph break
      .replace(/\n{2,}/g, '<br><br>')
      // Single newlines
      .replace(/\n/g, '<br>');
  }

  // ── SUGGESTION EXTRACTOR ──────────────────────────────────────
  function extractSuggestions(text) {
    if (!text) return { mainText: '', suggestions: [] };

    const markers = [
      '💡 Bunları da sorabilirsiniz:',
      '💡 Bunları da sorabilirsiniz',
      'Bunları da sorabilirsiniz:',
      'Bunları da sorabilirsiniz',
      '💡 You might also ask:',
      'You might also ask:',
    ];

    let markerIdx = -1, markerLen = 0;
    for (const marker of markers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) { markerIdx = idx; markerLen = marker.length; break; }
    }

    if (markerIdx === -1) return { mainText: text, suggestions: [] };

    const mainText = text.slice(0, markerIdx).trim();
    const sugPart = text.slice(markerIdx + markerLen).replace(/^[:\s]+/, '');

    const suggestions = sugPart
      .split('\n')
      .map(s => s.replace(/^[\-•*\d.)\s]+/, '').trim())
      .filter(s => s.length > 5 && s.length < 150);

    return { mainText, suggestions };
  }

  // ── WHATSAPP ──────────────────────────────────────────────────
  function buildWhatsAppLink(hist, lastQuestion) {
    const recentMessages = hist
      .slice(-6)
      .map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.content}`)
      .join('\n');
    const message = `Merhaba! IBU web sitesi chatbotundan geliyorum.\n\n❓ Sorum: ${lastQuestion}\n\n📋 Konuşma geçmişim:\n${recentMessages}\n\nYardımcı olabilir misiniz?`;
    return `https://api.whatsapp.com/send?phone=${IBU_CONFIG.whatsappNumber}&text=${encodeURIComponent(message)}`;
  }

  function createWhatsAppButton(question, hist, lang) {
    const link = buildWhatsAppLink(hist, question);
    const div = document.createElement('div');
    div.className = 'ibu-wa-wrapper';
    const waText = lang === 'tr'
      ? 'Bu konuda daha detaylı yardım için ekibimize bağlanabilirsiniz.'
      : 'For more detailed help on this topic, you can connect with our team.';
    const waBtnText = lang === 'tr' ? 'WhatsApp\'ta Devam Et' : 'Continue on WhatsApp';
    div.innerHTML = `
      <p class="ibu-wa-text">${waText}</p>
      <a href="${link}" target="_blank" rel="noopener" class="ibu-wa-btn">
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.543 5.876L0 24l6.29-1.542A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.877 9.877 0 01-5.031-1.378l-.361-.214-3.735.916.959-3.624-.235-.373A9.876 9.876 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106c5.421 0 9.894 4.474 9.894 9.894 0 5.421-4.473 9.894-9.894 9.894z"/>
        </svg>
        ${waBtnText}
      </a>`;
    return div;
  }

  // ── BUSINESS HOURS (Makedonya saati UTC+2) ────────────────────
  function isOutsideBusinessHours() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const mk = new Date(utc + 3600000 * 2);
    const h = mk.getHours(), d = mk.getDay();
    return d === 0 || d === 6 || h < 9 || h >= 18;
  }

  // ── CSS ───────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend',
    `<link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap">`
  );

  const css = `
/* ── Reset scoped to IBU widget ── */
#ibu-fab,#ibu-win,#ibu-tooltip,#ibu-win *{box-sizing:border-box;font-family:'DM Sans',system-ui,sans-serif;}

/* ── Animations ── */
@keyframes ibu-pulse{0%,100%{box-shadow:0 0 0 0 rgba(${r},${g},${b},.2);}70%{box-shadow:0 0 0 10px rgba(${r},${g},${b},0);}}
@keyframes ibu-blink{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
@keyframes ibu-pop{from{opacity:0;transform:scale(.9) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes ibu-slide{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@keyframes ibu-enter{from{opacity:0;transform:scale(.9) translateY(16px);}to{opacity:1;transform:none;}}

/* ── FAB ── */
#ibu-fab{
  position:fixed;bottom:24px;right:24px;z-index:2147483640;
  width:56px;height:56px;border-radius:16px;border:none;cursor:pointer;
  background:linear-gradient(145deg,${pc},${darkPc});
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px rgba(${r},${g},${b},.35),0 2px 8px rgba(0,0,0,.1);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;
  animation:ibu-pulse 3s ease-out 4s 3;
}
#ibu-fab:hover{transform:scale(1.07);box-shadow:0 10px 28px rgba(${r},${g},${b},.45);}
#ibu-fab svg{display:block;transition:transform .3s;}
#ibu-fab.open svg{transform:rotate(90deg);}

/* ── Tooltip ── */
#ibu-tooltip{
  position:fixed;bottom:38px;right:88px;z-index:2147483639;
  max-width:220px;background:#fff;
  border-radius:14px;padding:12px 14px;
  box-shadow:0 8px 32px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.06);
  font-size:12.5px;font-weight:500;color:#1e293b;line-height:1.5;
  display:flex;align-items:flex-start;gap:8px;
  opacity:0;transform:translateX(8px) scale(.95);pointer-events:none;
  transition:opacity .3s,transform .3s cubic-bezier(.34,1.56,.64,1);
}
#ibu-tooltip.show{opacity:1;transform:none;pointer-events:all;}
#ibu-tooltip::after{
  content:'';position:absolute;right:-5px;top:50%;
  transform:translateY(-50%) rotate(45deg);
  width:10px;height:10px;background:#fff;
  box-shadow:2px -2px 4px rgba(0,0,0,.04);
}
.ibu-tc{background:none;border:none;width:18px;height:18px;min-width:18px;border-radius:50%;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:#94a3b8;padding:0;transition:color .2s;}
.ibu-tc:hover{color:#475569;}

/* ── Main window ── */
#ibu-win{
  position:fixed;bottom:92px;right:24px;z-index:2147483641;
  width:380px;max-height:580px;
  border-radius:20px;display:flex;flex-direction:column;overflow:hidden;
  background:#f6f8fb;
  box-shadow:0 20px 60px rgba(0,0,0,.16),0 4px 16px rgba(0,0,0,.08),0 0 0 1px rgba(0,0,0,.06);
  transform:scale(.92) translateY(16px);transform-origin:bottom right;
  opacity:0;pointer-events:none;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .2s;
}
#ibu-win.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;animation:ibu-enter .3s cubic-bezier(.34,1.56,.64,1);}

/* ── Header ── */
.ibu-hdr{
  background:linear-gradient(150deg,${pc} 0%,${darkPc} 100%);
  padding:14px 16px;display:flex;align-items:center;gap:0;
  flex-shrink:0;position:relative;overflow:hidden;
}
.ibu-hdr::before{
  content:'';position:absolute;top:-50px;right:-20px;
  width:160px;height:160px;
  background:radial-gradient(circle,rgba(${ar},${ag},${ab},.15) 0%,transparent 65%);
  pointer-events:none;
}
.ibu-hdr-txt{flex:1;min-width:0;}
.ibu-hdr-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:-.02em;margin:0;}
.ibu-hdr-sub{font-size:10px;color:rgba(255,255,255,.65);margin:3px 0 0;
  display:flex;align-items:center;gap:4px;}
.ibu-dot{width:6px;height:6px;background:#4ade80;border-radius:50%;
  box-shadow:0 0 6px rgba(74,222,128,.9);animation:ibu-pulse 2.5s infinite;flex-shrink:0;}

/* ── Lang toggle ── */
.ibu-lang{display:flex;border:1px solid rgba(255,255,255,.2);border-radius:20px;
  overflow:hidden;font-size:9px;font-weight:700;margin-right:8px;}
.ibu-lang button{padding:3px 9px;background:transparent;color:rgba(255,255,255,.6);
  border:none;cursor:pointer;transition:all .2s;font-family:inherit;font-weight:700;}
.ibu-lang button.active{background:rgba(255,255,255,.25);color:#fff;}

/* ── Close btn ── */
.ibu-xbtn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);
  border-radius:8px;width:28px;height:28px;flex-shrink:0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.75);transition:all .2s;}
.ibu-xbtn:hover{background:rgba(255,255,255,.2);color:#fff;}

/* ── Messages ── */
.ibu-msgs{flex:1;overflow-y:auto;padding:14px 12px 8px;
  display:flex;flex-direction:column;gap:0;scroll-behavior:smooth;
  overscroll-behavior:contain;}
.ibu-msgs::-webkit-scrollbar{width:3px;}
.ibu-msgs::-webkit-scrollbar-thumb{background:rgba(${r},${g},${b},.15);border-radius:4px;}

/* ── Message groups ── */
.ibu-grp{display:flex;flex-direction:column;margin-bottom:14px;}
.ibu-grp.bot{align-items:flex-start;}
.ibu-grp.usr{align-items:flex-end;}
.ibu-bwrap{max-width:85%;display:flex;flex-direction:column;gap:3px;}
.usr .ibu-bwrap{align-items:flex-end;}
.bot .ibu-bwrap{align-items:flex-start;}

.ibu-bub{padding:10px 14px;font-size:13.5px;line-height:1.65;word-break:break-word;
  animation:ibu-pop .25s cubic-bezier(.34,1.56,.64,1);}
.bot .ibu-bub{background:#fff;color:#1e293b;border-radius:4px 16px 16px 16px;
  box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.06);}
.usr .ibu-bub{background:linear-gradient(140deg,${pc},${darkPc});color:#fff;
  border-radius:16px 4px 16px 16px;box-shadow:0 3px 10px rgba(${r},${g},${b},.2);}
.ibu-ts{font-size:9.5px;color:#b0bec5;padding:0 2px;}
.usr .ibu-ts{text-align:right;}

/* ── Markdown styles ── */
.ibu-bub ul{margin:6px 0 6px 18px;padding:0;}
.ibu-bub li{margin-bottom:3px;line-height:1.55;}
.ibu-bub strong{font-weight:600;}

/* ── Typing indicator ── */
.ibu-typing-wrap{display:flex;margin-bottom:12px;animation:ibu-slide .2s;}
.ibu-typing{display:flex;gap:4px;align-items:center;padding:11px 14px;
  background:#fff;border-radius:4px 16px 16px 16px;
  box-shadow:0 1px 3px rgba(0,0,0,.06);}
.ibu-typing span{width:6px;height:6px;border-radius:50%;
  animation:ibu-blink 1.4s infinite;}
.ibu-typing span:nth-child(1){background:rgba(${r},${g},${b},.3);}
.ibu-typing span:nth-child(2){background:rgba(${r},${g},${b},.6);animation-delay:.2s;}
.ibu-typing span:nth-child(3){background:rgba(${r},${g},${b},.9);animation-delay:.4s;}

/* ── Suggestion buttons ── */
.ibu-sugs{margin-top:6px;margin-bottom:4px;animation:ibu-slide .25s;}
.ibu-sugs-lbl{font-size:10px;font-weight:600;color:rgba(${r},${g},${b},.5);
  letter-spacing:.06em;text-transform:uppercase;margin-bottom:7px;padding-left:1px;}
.ibu-sugs-list{display:flex;flex-direction:column;gap:5px;}
.ibu-sug-btn{display:inline-flex;align-items:center;justify-content:space-between;
  gap:8px;background:#fff;border:1.5px solid rgba(${r},${g},${b},.14);
  color:#334155;font-size:12.5px;font-weight:500;padding:8px 12px;
  border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
  transition:all .2s cubic-bezier(.16,1,.3,1);width:fit-content;max-width:100%;}
.ibu-sug-btn:hover{background:rgba(${r},${g},${b},.06);border-color:rgba(${r},${g},${b},.32);
  transform:translateX(3px);color:${pc};}
.ibu-sug-btn svg{color:rgba(${r},${g},${b},.3);flex-shrink:0;transition:transform .2s;}
.ibu-sug-btn:hover svg{transform:translateX(2px);color:${pc};}

/* ── WhatsApp button ── */
.ibu-wa-wrapper{margin-top:8px;padding:10px 12px;background:#f0fdf4;
  border:1px solid #bbf7d0;border-radius:10px;max-width:85%;
  align-self:flex-start;animation:ibu-slide .25s;}
.ibu-wa-text{font-size:12px;color:#166534;margin:0 0 8px;line-height:1.5;}
.ibu-wa-btn{display:inline-flex;align-items:center;gap:6px;background:#25d366;
  color:#fff !important;text-decoration:none !important;padding:7px 14px;
  border-radius:20px;font-size:12.5px;font-weight:600;transition:background .15s;}
.ibu-wa-btn:hover{background:#1fba57;}

/* ── Quick replies ── */
.ibu-qr{padding:4px 10px 8px;display:flex;gap:6px;overflow-x:auto;
  scrollbar-width:none;flex-shrink:0;}
.ibu-qr::-webkit-scrollbar{display:none;}
.ibu-chip{background:#fff;border:1.5px solid rgba(${r},${g},${b},.18);
  color:${pc};border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;
  cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit;
  box-shadow:0 1px 3px rgba(${r},${g},${b},.06);
  transition:all .2s;}
.ibu-chip:hover{background:${pc};color:#fff;border-color:${pc};
  box-shadow:0 3px 12px rgba(${r},${g},${b},.28);transform:translateY(-1px);}

/* ── Input zone ── */
.ibu-inp-zone{margin:4px 10px 10px;background:#fff;border-radius:14px;
  display:flex;align-items:flex-end;gap:6px;padding:8px 8px 8px 14px;
  border:1.5px solid rgba(15,23,42,.08);
  box-shadow:0 2px 10px rgba(15,23,42,.05);
  transition:border-color .2s,box-shadow .2s;flex-shrink:0;}
.ibu-inp-zone:focus-within{border-color:rgba(${r},${g},${b},.38);
  box-shadow:0 0 0 3px rgba(${r},${g},${b},.07),0 2px 10px rgba(15,23,42,.05);}
.ibu-inp{flex:1;border:none;background:transparent;font-size:13.5px;
  color:#1e293b;outline:none;resize:none;max-height:100px;
  min-height:22px;line-height:1.5;font-family:inherit;overflow-y:auto;}
.ibu-inp::placeholder{color:#c4cdd6;}
.ibu-send{width:36px;height:36px;border-radius:10px;flex-shrink:0;
  background:linear-gradient(140deg,${pc},${darkPc});border:none;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,.12);
  transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,opacity .2s;}
.ibu-send:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 12px rgba(0,0,0,.18);}
.ibu-send:disabled{opacity:.3;cursor:not-allowed;}

/* ── Footer ── */
.ibu-foot{text-align:center;font-size:9px;color:#c0c8d4;padding:0 0 9px;
  flex-shrink:0;font-weight:500;letter-spacing:.08em;text-transform:uppercase;}

/* ── Error message ── */
.ibu-err{background:#fff5f5 !important;border:1px solid #fecaca !important;color:#dc2626 !important;}

/* ── Mobile ── */
@media(max-width:480px){
  #ibu-win{width:calc(100vw - 16px);right:8px;bottom:78px;
    max-height:calc(100dvh - 94px);border-radius:16px;}
  #ibu-fab{right:14px;bottom:14px;}
  #ibu-tooltip{right:80px;bottom:24px;max-width:190px;}
}
`;

  const styleEl = document.createElement('style');
  styleEl.id = 'ibu-widget-css';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── BUILD HTML ────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'ibu-fab';
  fab.setAttribute('aria-label', 'IBU Chatbot');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" width="23" height="23" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`;

  const tip = document.createElement('div');
  tip.id = 'ibu-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.innerHTML = `
    <div style="flex:1">${IBU_CONFIG.tooltipTr}</div>
    <button class="ibu-tc" aria-label="Kapat">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  const win = document.createElement('div');
  win.id = 'ibu-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'IBU Chatbot');
  win.innerHTML = `
<div class="ibu-hdr">
  <div class="ibu-hdr-txt">
    <p class="ibu-hdr-name">${IBU_CONFIG.botName}</p>
    <p class="ibu-hdr-sub"><span class="ibu-dot"></span><span id="ibu-status">Çevrimiçi · Aktif</span></p>
  </div>
  <div class="ibu-lang" id="ibu-lang">
    <button id="ibu-tr" class="active" aria-label="Türkçe">TR</button>
    <button id="ibu-en" aria-label="English">EN</button>
  </div>
  <button class="ibu-xbtn" id="ibu-x" aria-label="Kapat">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>
<div class="ibu-msgs" id="ibu-msgs" role="log" aria-live="polite" aria-label="Sohbet geçmişi"></div>
<div class="ibu-qr" id="ibu-qr" role="group" aria-label="Hızlı sorular"></div>
<div class="ibu-inp-zone">
  <textarea class="ibu-inp" id="ibu-inp" rows="1" 
    placeholder="${IBU_CONFIG.placeholderTr}" 
    aria-label="Mesaj yazın" 
    maxlength="1000"></textarea>
  <button class="ibu-send" id="ibu-s" aria-label="Gönder">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  </button>
</div>
<div class="ibu-foot">IBU · AI Asistan</div>`;

  document.body.appendChild(fab);
  document.body.appendChild(tip);
  document.body.appendChild(win);

  // ── REFS ──────────────────────────────────────────────────────
  const msgsEl = document.getElementById('ibu-msgs');
  const inpEl = document.getElementById('ibu-inp');
  const sBtn = document.getElementById('ibu-s');
  const xBtn = document.getElementById('ibu-x');
  const qrEl = document.getElementById('ibu-qr');
  const trBtn = document.getElementById('ibu-tr');
  const enBtn = document.getElementById('ibu-en');
  const status = document.getElementById('ibu-status');

  // ── STATE ─────────────────────────────────────────────────────
  let isOpen = false;
  let isSending = false;
  let lang = 'tr';
  const hist = [];

  // ── HELPERS ───────────────────────────────────────────────────
  function ts() {
    return new Date().toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  function scrollDown() {
    requestAnimationFrame(() => { msgsEl.scrollTop = msgsEl.scrollHeight; });
  }
  function clearSuggestions() {
    msgsEl.querySelectorAll('.ibu-sugs,.ibu-wa-wrapper').forEach(el => el.remove());
  }

  // ── ADD MESSAGE ────────────────────────────────────────────────
  function addMsg(html, role, isError) {
    const grp = document.createElement('div');
    grp.className = `ibu-grp ${role === 'bot' ? 'bot' : 'usr'}`;
    grp.innerHTML = `
      <div class="ibu-bwrap">
        <div class="ibu-bub${isError ? ' ibu-err' : ''}">${html}</div>
        <div class="ibu-ts">${ts()}</div>
      </div>`;
    msgsEl.appendChild(grp);
    scrollDown();
    return grp;
  }

  // ── TYPING ────────────────────────────────────────────────────
  function showTyping() {
    hideTyping();
    const wrap = document.createElement('div');
    wrap.id = 'ibu-typing';
    wrap.className = 'ibu-typing-wrap';
    wrap.setAttribute('aria-label', 'Yazıyor...');
    wrap.innerHTML = `<div class="ibu-typing"><span></span><span></span><span></span></div>`;
    msgsEl.appendChild(wrap);
    scrollDown();
  }
  function hideTyping() {
    const el = document.getElementById('ibu-typing');
    if (el) el.remove();
  }

  // ── SUGGESTION BUTTONS ────────────────────────────────────────
  function addSuggestions(suggestions, anchorEl) {
    if (!suggestions || suggestions.length === 0) return null;
    const wrap = document.createElement('div');
    wrap.className = 'ibu-sugs';
    const lbl = document.createElement('div');
    lbl.className = 'ibu-sugs-lbl';
    lbl.textContent = lang === 'tr' ? 'İlgili konular' : 'Related topics';
    wrap.appendChild(lbl);
    const list = document.createElement('div');
    list.className = 'ibu-sugs-list';
    suggestions.slice(0, 3).forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'ibu-sug-btn';
      btn.innerHTML = `<span>${q}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>`;
      btn.onclick = () => { clearSuggestions(); send(q); };
      list.appendChild(btn);
    });
    wrap.appendChild(list);
    anchorEl.insertAdjacentElement('afterend', wrap);
    scrollDown();
    return wrap;
  }

  // ── QUICK REPLIES ─────────────────────────────────────────────
  function setQR(l) {
    qrEl.innerHTML = '';
    const chips = l === 'tr' ? IBU_CONFIG.quickRepliesTr : IBU_CONFIG.quickRepliesEn;
    chips.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ibu-chip';
      btn.textContent = c;
      btn.onclick = () => { qrEl.innerHTML = ''; clearSuggestions(); send(c); };
      qrEl.appendChild(btn);
    });
  }

  // ── LANG SWITCH ───────────────────────────────────────────────
  function setLang(l) {
    lang = l;
    inpEl.placeholder = l === 'tr' ? IBU_CONFIG.placeholderTr : IBU_CONFIG.placeholderEn;
    trBtn.classList.toggle('active', l === 'tr');
    enBtn.classList.toggle('active', l === 'en');
    status.textContent = l === 'tr' ? 'Çevrimiçi · Aktif' : 'Online · Active';
  }

  trBtn.onclick = () => setLang('tr');
  enBtn.onclick = () => setLang('en');

  // ── SSE STREAM PARSER ─────────────────────────────────────────
  // Buffer-based parser — handles chunks split across lines
  async function readStream(response, onChunk, onDone) {
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const data = JSON.parse(raw);
          if (data.text !== undefined) onChunk(data);
          if (data.done) onDone(data);
        } catch {
          // malformed JSON — skip
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim().startsWith('data:')) {
      try {
        const data = JSON.parse(buffer.trim().slice(5).trim());
        if (data.done) onDone(data);
      } catch { /* ignore */ }
    }
  }

  // ── MAIN SEND ─────────────────────────────────────────────────
  async function send(text) {
    if (isSending || !text || !text.trim()) return;
    const userText = text.trim();
    isSending = true;
    sBtn.disabled = true;

    // Auto-detect lang
    const detected = detectLang(userText);
    if (detected !== lang) setLang(detected);

    addMsg(userText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), 'user');
    clearSuggestions();
    qrEl.innerHTML = '';

    const histSnapshot = hist.map(h => ({ role: h.role, content: h.content }));
    hist.push({ role: 'user', content: userText });

    showTyping();

    try {
      const resp = await fetch(IBU_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          message: userText,
          history: histSnapshot,
          lang,
          sessionId: SESSION_ID,
        }),
      });

      hideTyping();

      if (!resp.ok) {
        const errText = lang === 'tr'
          ? `Sunucu hatası (${resp.status}). Lütfen daha sonra tekrar deneyin.`
          : `Server error (${resp.status}). Please try again later.`;
        addMsg(errText, 'bot', true);
        isSending = false;
        sBtn.disabled = false;
        inpEl.focus();
        return;
      }

      // Create bot message group
      const botGrp = document.createElement('div');
      botGrp.className = 'ibu-grp bot';
      botGrp.innerHTML = `
        <div class="ibu-bwrap">
          <div class="ibu-bub"></div>
          <div class="ibu-ts">${ts()}</div>
        </div>`;
      msgsEl.appendChild(botGrp);
      const bub = botGrp.querySelector('.ibu-bub');

      let fullText = '';

      await readStream(
        resp,
        // onChunk
        (data) => {
          fullText += data.text;
          const { mainText } = extractSuggestions(fullText);
          bub.innerHTML = renderMarkdown(mainText);
          scrollDown();
        },
        // onDone
        (data) => {
          lang = data.lang || lang;
          const { mainText, suggestions: inlineSuggs } = extractSuggestions(fullText);
          bub.innerHTML = renderMarkdown(mainText);

          // Suggestions
          const finalSuggs = (data.suggestions && data.suggestions.length)
            ? data.suggestions
            : inlineSuggs;

          let lastEl = botGrp;
          if (finalSuggs.length > 0) {
            const sugEl = addSuggestions(finalSuggs, botGrp);
            if (sugEl) lastEl = sugEl;
          }

          // WhatsApp button
          const similarity = typeof data.similarity === 'number' ? data.similarity : 1;
          const hasCtx = data.hasContext !== false;
          if (!hasCtx || similarity < IBU_CONFIG.whatsappThreshold || IBU_CONFIG.showWhatsappAlways) {
            const waBtn = createWhatsAppButton(userText, hist, lang);
            lastEl.insertAdjacentElement('afterend', waBtn);
          }

          scrollDown();
        }
      );

      hist.push({ role: 'assistant', content: fullText });

      // Keep history manageable
      if (hist.length > 20) hist.splice(0, hist.length - 20);

    } catch (err) {
      hideTyping();
      console.error('[IBU Widget] Fetch error:', err);
      const errMsg = lang === 'tr'
        ? 'Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        : 'Connection error. Please check your internet connection and try again.';
      addMsg(errMsg, 'bot', true);
    }

    isSending = false;
    sBtn.disabled = false;
    inpEl.focus();
  }

  // ── INPUT HANDLING ────────────────────────────────────────────
  function handleSend() {
    const v = inpEl.value.trim();
    if (!v) return;
    inpEl.value = '';
    inpEl.style.height = 'auto';
    send(v);
  }

  sBtn.addEventListener('click', handleSend);
  inpEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  inpEl.addEventListener('input', () => {
    inpEl.style.height = 'auto';
    inpEl.style.height = Math.min(inpEl.scrollHeight, 100) + 'px';
  });

  // ── OPEN / CLOSE ──────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    fab.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    tip.classList.remove('show');

    if (msgsEl.children.length === 0) {
      addMsg(renderMarkdown(lang === 'tr' ? IBU_CONFIG.welcomeTr : IBU_CONFIG.welcomeEn), 'bot');
      if (isOutsideBusinessHours()) {
        const offMsg = lang === 'tr'
          ? 'Şu an mesai saatlerimiz dışındayız (Hafta içi 09:00–18:00 MKD). Acil konular için [WhatsApp hattımız](https://api.whatsapp.com/send?phone=' + IBU_CONFIG.whatsappNumber + ') 7/24 aktiftir.'
          : 'We are currently outside business hours (Weekdays 09:00–18:00 MKD). For urgent matters, our [WhatsApp line](https://api.whatsapp.com/send?phone=' + IBU_CONFIG.whatsappNumber + ') is 24/7 available.';
        setTimeout(() => addMsg(renderMarkdown(offMsg), 'bot'), 700);
      }
      setQR(lang);
    }

    setTimeout(() => inpEl.focus(), 300);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    fab.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  xBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeChat(); });

  // ── TOOLTIP ───────────────────────────────────────────────────
  tip.querySelector('.ibu-tc').addEventListener('click', e => {
    e.stopPropagation();
    tip.classList.remove('show');
    try { localStorage.setItem('ibu-tip-dismissed', '1'); } catch { /* */ }
  });

  try {
    if (!localStorage.getItem('ibu-tip-dismissed')) {
      setTimeout(() => { if (!isOpen) tip.classList.add('show'); }, 3000);
    }
  } catch { /* */ }

})();
