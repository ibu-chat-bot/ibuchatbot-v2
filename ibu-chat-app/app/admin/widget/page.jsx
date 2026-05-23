'use client'

import { useState, useEffect } from 'react'
import { Sliders, Copy, FileDown, Eye, Check, HelpCircle, Code, ShieldCheck, Palette } from 'lucide-react'

export default function WidgetPage() {
  // Widget states
  const [apiUrl, setApiUrl] = useState('https://ibuchatbot-v2.vercel.app/api/chat') // default
  const [botName, setBotName] = useState('IBU Asistan')
  const [theme, setTheme] = useState('default')
  const [primaryColor, setPrimaryColor] = useState('#1a3a6b')
  const [accentColor, setAccentColor] = useState('#c8a951')
  const [position, setPosition] = useState('bottom-right')
  
  const [tooltipTr, setTooltipTr] = useState('IBU Dijital Asistanı sorularınızı yanıtlamaya hazır. 👋')
  const [tooltipEn, setTooltipEn] = useState('IBU Digital Assistant is ready to answer your questions. 👋')
  
  const [welcomeTr, setWelcomeTr] = useState('Merhaba! 👋 Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.')
  const [welcomeEn, setWelcomeEn] = useState('Hello! 👋 I can answer your questions about enrollment, scholarships, programs, or campus life.')

  const [quickRepliesTr, setQuickRepliesTr] = useState(['📅 Kayıt tarihleri', '🎓 Burs imkânları', '📚 Programlar', '🏠 Yurt & konaklama'])
  const [quickRepliesEn, setQuickRepliesEn] = useState(['📅 Enrollment dates', '🎓 Scholarships', '📚 Programs', '🏠 Dormitory'])

  const [newQuickTr, setNewQuickTr] = useState('')
  const [newQuickEn, setNewQuickEn] = useState('')

  // Build/Code states
  const [generatedCode, setGeneratedCode] = useState('')
  const [minifiedSize, setMinifiedSize] = useState('0.0 KB')
  const [rawJs, setRawJs] = useState('')
  const [loadingCode, setLoadingCode] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Simulated widget states
  const [widgetOpen, setWidgetOpen] = useState(true)
  const [simLang, setSimLang] = useState('tr')
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)

  // Premium themes specs
  const THEMES = {
    default:  { name: 'Corporate Navy (Klasik)', primary: '#1a3a6b', accent: '#c8a951' },
    emerald:  { name: 'Emerald Garden (Zümrüt Yeşil)', primary: '#064e3b', accent: '#34d399' },
    royal:    { name: 'Royal Amethyst (Lüks Mor)', primary: '#4c1d95', accent: '#fcd34d' },
    midnight: { name: 'Midnight Stealth (Karanlık Tema)', primary: '#0f172a', accent: '#06b6d4' },
    crimson:  { name: 'Crimson Spark (Yakut Kırmızı)', primary: '#991b1b', accent: '#cbd5e1' },
    sunset:   { name: 'Sunset Amber (Günbatımı Turuncu)', primary: '#7c2d12', accent: '#f59e0b' },
    custom:   { name: 'Özel Renkler', primary: '#1a3a6b', accent: '#c8a951' }
  }

  // Helper to adjust color brightness dynamically in preview (mimics CSS gradient builder)
  const adjustBrightness = (hex, percent) => {
    let hexClean = hex.replace('#', '')
    if (hexClean.length === 3) {
      hexClean = hexClean[0] + hexClean[0] + hexClean[1] + hexClean[1] + hexClean[2] + hexClean[2]
    }
    let R = parseInt(hexClean.substring(0, 2), 16)
    let G = parseInt(hexClean.substring(2, 4), 16)
    let B = parseInt(hexClean.substring(4, 6), 16)

    R = parseInt((R * (100 + percent)) / 100)
    G = parseInt((G * (100 + percent)) / 100)
    B = parseInt((B * (100 + percent)) / 100)

    R = R < 255 ? R : 255
    G = G < 255 ? G : 255
    B = B < 255 ? B : 255

    R = R > 0 ? R : 0
    G = G > 0 ? G : 0
    B = B > 0 ? B : 0

    const rHex = R.toString(16).padStart(2, '0')
    const gHex = G.toString(16).padStart(2, '0')
    const bHex = B.toString(16).padStart(2, '0')

    return `#${rHex}${gHex}${bHex}`
  }

  // Update colors when preset theme is selected
  useEffect(() => {
    if (theme !== 'custom' && THEMES[theme]) {
      setPrimaryColor(THEMES[theme].primary)
      setAccentColor(THEMES[theme].accent)
    }
  }, [theme])

  // Dynamically set apiUrl to local host when loading client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiUrl(`${window.location.origin}/api/chat`)
    }
  }, [])

  // Call code generation API whenever parameters change
  const generateWidgetCode = async () => {
    setLoadingCode(true)
    try {
      const res = await fetch('/api/admin/widget/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl,
          botName,
          primaryColor,
          accentColor,
          position,
          theme,
          tooltipTr,
          tooltipEn,
          welcomeTr,
          welcomeEn,
          quickRepliesTr,
          quickRepliesEn,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setGeneratedCode(data.code)
        setRawJs(data.rawJs)
        setMinifiedSize(data.size)
      }
    } catch (err) {
      console.error('Error generating widget code:', err)
    } finally {
      setLoadingCode(false)
    }
  }

  useEffect(() => {
    const debouncer = setTimeout(() => {
      generateWidgetCode()
    }, 800)
    return () => clearTimeout(debouncer)
  }, [apiUrl, botName, primaryColor, accentColor, position, theme, tooltipTr, tooltipEn, welcomeTr, welcomeEn, quickRepliesTr, quickRepliesEn])

  // Setup simulated initial messages on toggle or language change
  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: simLang === 'tr' ? welcomeTr : welcomeEn,
        suggestions: []
      }
    ])
  }, [simLang, welcomeTr, welcomeEn, widgetOpen])

  const handleCopy = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadJs = () => {
    if (!rawJs) return
    const blob = new Blob([rawJs], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'widget.js'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPlugin = async () => {
    try {
      const res = await fetch('/api/admin/widget/generate-plugin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl,
          botName,
          primaryColor,
          accentColor,
          position,
          theme,
          tooltipTr,
          tooltipEn,
          welcomeTr,
          welcomeEn,
          quickRepliesTr,
          quickRepliesEn,
        }),
      })

      if (!res.ok) throw new Error('Eklenti oluşturulamadı')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ibu-chatbot-plugin.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Eklenti indirilirken hata oluştu: ' + err.message)
    }
  }

  const handleSimQuickReply = (text) => {
    // 1. Add user message
    const userMsg = { sender: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    // 2. Simulate bot typing
    setTimeout(() => {
      let botResponse = ''
      let suggestions = []
      if (simLang === 'tr') {
        if (text.includes('Kayıt')) {
          botResponse = 'Güz dönemi kayıtları Temmuz-Eylül, Bahar dönemi ise Ocak-Şubat arasındadır.'
          suggestions = ['📄 Kayıt için gerekli evraklar nelerdir?', '🎓 Lise diploması ile kayıt nasıl yapılır?']
        }
        else if (text.includes('Burs')) {
          botResponse = 'Üniversitemiz başarılı öğrencilere %100\'e varan akademik başarı bursları sunmaktadır.'
          suggestions = ['📋 Burs şartları nelerdir?', '🏢 ÖSYM bursları geçerli mi?']
        }
        else if (text.includes('Program')) {
          botResponse = 'Mühendislik, Mimarlık, İktisat ve Eğitim fakültelerimiz hakkında detaylı broşürleri web sitemizde bulabilirsiniz.'
          suggestions = ['⚙️ Hangi mühendislik bölümleri var?', '🩺 Tıp fakültesi barajı kaç?']
        }
        else {
          botResponse = 'Bu simüle yanıttır. Gerçek sistemde bu soru veritabanı anlamsal araması ile eşleştirilir.'
          suggestions = ['📅 Kayıt tarihleri nedir?', '🎓 Burs imkânları nelerdir?']
        }
      } else {
        if (text.includes('Enrollment')) {
          botResponse = 'Fall enrollment is between July and September. Spring enrollment is in January.'
          suggestions = ['📄 What are the required documents?', '🎓 How to apply without exams?']
        }
        else if (text.includes('Scholarship')) {
          botResponse = 'IBU offers dynamic academic scholarship plans covering up to 100% tuition.'
          suggestions = ['📋 What are the scholarship requirements?', '🏢 Do you have sibling discounts?']
        }
        else if (text.includes('Program')) {
          botResponse = 'Explore our premium faculties in Engineering, Architecture, Economics, and Social Sciences.'
          suggestions = ['⚙️ Which engineering programs exist?', '🎓 Do you offer doctorate degrees?']
        }
        else {
          botResponse = 'This is a simulated reply. In production, this matches semantic database records.'
          suggestions = ['📅 Enrollment dates', '🎓 Scholarships']
        }
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse, suggestions }])
      setTyping(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a0f2e] -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-outfit font-black text-3xl text-white tracking-tight flex items-center gap-3">
            <Sliders className="w-7 h-7 text-violet-400" />
            <span>Widget Kod Üretici</span>
            <span className="bg-white/10 border border-white/20 text-white/70 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold">v2.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">WordPress web sitenize yerleştireceğiniz canlı sohbet aracını özelleştirin ve entegrasyon kodunu kopyalayın</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Customization Form */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] border-b border-white/10 pb-3 flex items-center gap-2">
            <span>Özelleştirme Parametreleri</span>
          </h2>

          {/* Core Configuration */}
          <div className="space-y-5">
            {/* Premium Themes Selector */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-violet-400" />
                <span>👑 Ultra Premium Görünüm Temaları</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(THEMES).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`flex flex-col text-left p-3 rounded-xl border text-[11px] font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                      theme === key
                        ? 'bg-white/15 border-white/30 ring-2 ring-white/20 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className={`font-bold text-[11px] ${theme === key ? 'text-white/90' : 'text-white/50'}`}>{THEMES[key].name}</span>
                    <div className="flex gap-2 items-center mt-2">
                      <div className="w-5 h-5 rounded-full border border-black/20 shadow-lg" style={{ backgroundColor: THEMES[key].primary, boxShadow: `0 0 8px ${THEMES[key].primary}60` }} />
                      <div className="w-5 h-5 rounded-full border border-black/20 shadow-lg" style={{ backgroundColor: THEMES[key].accent, boxShadow: `0 0 8px ${THEMES[key].accent}60` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">Bot Adı</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-sm py-2.5 px-3 rounded-xl outline-none focus:border-white/40 focus:bg-white/12 placeholder-white/25 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">Widget Konumu</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-sm py-2.5 px-3 rounded-xl outline-none cursor-pointer focus:border-white/40 transition-all"
                >
                  <option value="bottom-right" className="bg-slate-900">Sağ Alt Köşe</option>
                  <option value="bottom-left" className="bg-slate-900">Sol Alt Köşe</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">API URL (Next.js Rotası)</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-white/8 border border-white/15 text-white/70 text-xs py-2.5 px-3 rounded-xl outline-none focus:border-white/40 font-mono transition-all"
              />
            </div>

            {/* Colors picker - Only show inputs if custom is chosen */}
            {theme === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">Ana Renk (Primary)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0"
                      style={{ boxShadow: `0 0 12px ${primaryColor}80` }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-white/8 border border-white/15 text-white/70 text-xs py-2 px-2.5 rounded-xl font-mono outline-none focus:border-white/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">İkincil Renk (Accent)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0"
                      style={{ boxShadow: `0 0 12px ${accentColor}80` }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 bg-white/8 border border-white/15 text-white/70 text-xs py-2 px-2.5 rounded-xl font-mono outline-none focus:border-white/40"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Welcome notification closed tooltip */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] block">💬 Sohbet Bildirim Balonu</span>
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">Türkçe Bildirim Metni</label>
                <textarea
                  rows={2}
                  value={tooltipTr}
                  onChange={(e) => setTooltipTr(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-xs py-2 px-3 rounded-xl outline-none focus:border-white/40 resize-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">İngilizce Bildirim Metni</label>
                <textarea
                  rows={2}
                  value={tooltipEn}
                  onChange={(e) => setTooltipEn(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-xs py-2 px-3 rounded-xl outline-none focus:border-white/40 resize-none transition-all"
                />
              </div>
            </div>

            {/* Welcome messages */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] block">Karşılama Mesajları</span>
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">Türkçe Hoş Geldiniz Mesajı</label>
                <textarea
                  rows={2}
                  value={welcomeTr}
                  onChange={(e) => setWelcomeTr(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-xs py-2 px-3 rounded-xl outline-none focus:border-white/40 resize-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-1.5">İngilizce Hoş Geldiniz Mesajı</label>
                <textarea
                  rows={2}
                  value={welcomeEn}
                  onChange={(e) => setWelcomeEn(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 text-white text-xs py-2 px-3 rounded-xl outline-none focus:border-white/40 resize-none transition-all"
                />
              </div>
            </div>

            {/* Quick replies */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] block">Hızlı Karar Butonları</span>
              {/* TR buttons list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block">Türkçe Butonlar</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickRepliesTr.map((btn, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg text-[10px] font-semibold">
                      <span>{btn}</span>
                      <button type="button" onClick={() => setQuickRepliesTr(quickRepliesTr.filter((_, idx) => idx !== i))} className="text-white/30 hover:text-red-400 font-bold transition ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Yeni Türkçe buton ekle..." value={newQuickTr} onChange={(e) => setNewQuickTr(e.target.value)} className="flex-1 bg-white/8 border border-white/15 text-white placeholder-white/25 text-xs py-1.5 px-3 rounded-xl outline-none focus:border-white/40" />
                  <button type="button" onClick={() => { if (!newQuickTr.trim()) return; setQuickRepliesTr([...quickRepliesTr, newQuickTr.trim()]); setNewQuickTr('') }} className="px-3 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition cursor-pointer">Ekle</button>
                </div>
              </div>
              {/* EN buttons list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block">İngilizce Butonlar</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickRepliesEn.map((btn, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg text-[10px] font-semibold">
                      <span>{btn}</span>
                      <button type="button" onClick={() => setQuickRepliesEn(quickRepliesEn.filter((_, idx) => idx !== i))} className="text-white/30 hover:text-red-400 font-bold transition ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Yeni İngilizce buton ekle..." value={newQuickEn} onChange={(e) => setNewQuickEn(e.target.value)} className="flex-1 bg-white/8 border border-white/15 text-white placeholder-white/25 text-xs py-1.5 px-3 rounded-xl outline-none focus:border-white/40" />
                  <button type="button" onClick={() => { if (!newQuickEn.trim()) return; setQuickRepliesEn([...quickRepliesEn, newQuickEn.trim()]); setNewQuickEn('') }} className="px-3 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition cursor-pointer">Ekle</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Webpage Simulated functional live widget */}
        <div className="bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-1 h-[75vh] flex flex-col overflow-hidden relative">
          {/* Virtual browser header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs text-white/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
            <div className="bg-white/10 border border-white/15 text-white/50 rounded-md px-12 py-0.5 text-[9px] font-mono select-none">
              https://www.ibu.edu.mk (Simüle Sayfa)
            </div>
            <div className="w-8"></div>
          </div>

          {/* Webpage Content Simulation */}
          <div className="flex-1 p-8 flex flex-col justify-center items-center text-center bg-gradient-to-br from-slate-900/50 to-slate-800/30 relative select-none">
            <h3 className="font-outfit font-black text-lg text-white/20">Uluslararası Balkan Üniversitesi</h3>
            <p className="text-[11px] text-white/15 mt-1 max-w-sm leading-relaxed font-medium">
              Widget Canlı Önizlemesi. İkon butonuna tıklayarak yeni özellikleri test edebilirsiniz.
            </p>

            {/* Welcoming Closed Tooltip Speech Bubble callout notification */}
            {!widgetOpen && (
              <div
                className="absolute z-40 bg-white border border-slate-200 p-2.5 rounded-xl shadow-lg flex gap-2 items-start transition-all animate-bounce max-w-[200px]"
                style={{
                  bottom: '32px',
                  right: position === 'bottom-right' ? '92px' : 'auto',
                  left: position === 'bottom-left' ? '92px' : 'auto',
                  fontSize: '11.5px',
                  lineHeight: '1.4',
                  color: '#334155',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  boxShadow: '0 6px 20px rgba(30, 41, 59, 0.1)'
                }}
              >
                <div className="flex-1 font-semibold text-slate-650">
                  {simLang === 'tr' ? tooltipTr : tooltipEn}
                </div>
                <div className="text-[10px] text-slate-350 cursor-pointer font-bold hover:text-slate-500">&times;</div>
                <div
                  className="absolute bg-white border-t border-r border-slate-200 w-2 h-2 rotate-45"
                  style={{
                    top: 'calc(50% - 4px)',
                    right: position === 'bottom-right' ? '-5px' : 'auto',
                    left: position === 'bottom-left' ? '-5px' : 'auto',
                    borderLeft: position === 'bottom-left' ? '1px solid #e2e8f0' : 'none',
                    borderBottom: position === 'bottom-left' ? '1px solid #e2e8f0' : 'none',
                    borderTop: position === 'bottom-right' ? '1px solid #e2e8f0' : 'none',
                    borderRight: position === 'bottom-right' ? '1px solid #e2e8f0' : 'none',
                  }}
                ></div>
              </div>
            )}

            {/* Simulated Live Widget elements inline absolute inside the page */}
            {/* SO Chat FAB Button with local icon */}
            <button
              onClick={() => setWidgetOpen(!widgetOpen)}
              className="absolute z-40 transition-transform active:scale-95 shadow-xl hover:scale-105 border-none cursor-pointer flex items-center justify-center overflow-hidden"
              style={{
                bottom: '24px',
                right: position === 'bottom-right' ? '24px' : 'auto',
                left: position === 'bottom-left' ? '24px' : 'auto',
                width: '62px',
                height: '62px',
                borderRadius: '50%',
                background: `linear-gradient(145deg, ${primaryColor}, ${adjustBrightness(primaryColor, -20)})`,
                boxShadow: `0 8px 32px rgba(${parseInt(primaryColor.slice(1,3),16) || 26}, ${parseInt(primaryColor.slice(3,5),16) || 58}, ${parseInt(primaryColor.slice(5,7),16) || 107}, 0.45)`,
              }}
            >
              <img src="/logoicon.ico" alt="Logo" className="w-7 h-7 object-contain brightness-0 invert" />
            </button>

            {/* SO Chat Window */}
            {widgetOpen && (
              <div
                className="absolute z-50 shadow-2xl flex flex-col border border-slate-200/50 text-left transition-all duration-300 ease-out select-text"
                style={{
                  bottom: '96px',
                  right: position === 'bottom-right' ? '24px' : 'auto',
                  left: position === 'bottom-left' ? '24px' : 'auto',
                  width: '350px',
                  height: '480px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Header with gradient and logoicon.ico */}
                <div 
                  className="p-4 text-white flex items-center justify-between shadow-md relative overflow-hidden shrink-0"
                  style={{
                    background: `linear-gradient(150deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -30)} 100%)`,
                  }}
                >
                  {/* Glass highlight line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}></div>
                  
                  <div className="flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center overflow-hidden backdrop-blur-md">
                      <img src="/logoicon.ico" alt="IBU" className="w-6 h-6 object-contain brightness-0 invert" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-extrabold tracking-tight font-outfit text-white">{botName}</h4>
                      <p className="text-[9px] text-white/80 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        Çevrimiçi • Aktif Asistan
                      </p>
                    </div>
                  </div>
                  
                  {/* Lang Switch inside preview */}
                  <div className="flex border border-white/20 rounded-md overflow-hidden text-[8px] font-bold z-10">
                    <button
                      onClick={() => setSimLang('tr')}
                      className={`px-1.5 py-0.5 border-0 cursor-pointer text-white font-bold transition ${simLang === 'tr' ? 'bg-white/25' : 'bg-transparent'}`}
                    >
                      TR
                    </button>
                    <button
                      onClick={() => setSimLang('en')}
                      className={`px-1.5 py-0.5 border-0 cursor-pointer text-white font-bold transition ${simLang === 'en' ? 'bg-white/25' : 'bg-transparent'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Simulated Messages list with dot-mesh styling */}
                <div 
                  className="flex-1 p-4 overflow-y-auto space-y-4 text-[13px] scrollbar-thin flex flex-col"
                  style={{
                    background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
                  }}
                >
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* Avatar header for bot */}
                      {m.sender === 'bot' && (
                        <div className="flex items-center gap-2 mb-1.5 px-0.5">
                          <div 
                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{
                              boxShadow: `0 0 0 2px ${primaryColor}, 0 4px 12px rgba(0,0,0,0.15)`
                            }}
                          >
                            <img src="/logoicon.ico" alt="Bot" className="w-5 h-5 object-contain" />
                          </div>
                          <span className="text-[10.5px] font-bold text-slate-700" style={{ color: primaryColor }}>{botName}</span>
                        </div>
                      )}

                      <div
                        className={`p-3 max-w-[80%] leading-relaxed ${
                          m.sender === 'user' 
                            ? 'text-white rounded-2xl rounded-tr-sm shadow-md' 
                            : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm'
                        }`}
                        style={{
                          background: m.sender === 'user' ? `linear-gradient(140deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -20)} 100%)` : '',
                          borderLeft: m.sender === 'bot' ? `3px solid ${primaryColor}` : '',
                          boxShadow: m.sender === 'user' ? `0 6px 20px rgba(${parseInt(primaryColor.slice(1,3),16) || 26}, ${parseInt(primaryColor.slice(3,5),16) || 58}, ${parseInt(primaryColor.slice(5,7),16) || 107}, 0.35)` : '',
                        }}
                      >
                        {m.text}
                      </div>

                      {/* Render simulated suggestions if they exist in the bot message */}
                      {m.sender === 'bot' && m.suggestions && m.suggestions.length > 0 && (
                        <div className="pl-2 flex flex-col gap-2 mt-3 w-full items-start">
                          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                            {simLang === 'tr' ? '💡 Bunları da sorabilirsiniz:' : '💡 You can also ask:'}
                          </span>
                          {m.suggestions.map((s, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSimQuickReply(s.replace(/^[^\s]+\s/, ''))}
                              className="text-left px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-850 font-medium rounded-xl text-[11px] w-fit max-w-full transition duration-150 active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5"
                              style={{ border: `1.5px solid rgba(${parseInt(primaryColor.slice(1,3),16) || 26}, ${parseInt(primaryColor.slice(3,5),16) || 58}, ${parseInt(primaryColor.slice(5,7),16) || 107}, 0.18)` }}
                            >
                              <span className="opacity-60">&rarr;</span> {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing animation bubble */}
                  {typing && (
                    <div className="flex flex-col items-start space-y-1.5">
                      <div className="flex items-center gap-2 px-0.5">
                        <div 
                          className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{
                            boxShadow: `0 0 0 2px ${primaryColor}, 0 4px 12px rgba(0,0,0,0.15)`
                          }}
                        >
                          <img src="/logoicon.ico" alt="Bot" className="w-5 h-5 object-contain" />
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-700" style={{ color: primaryColor }}>{botName}</span>
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center shadow-sm" style={{ borderLeft: `3px solid ${primaryColor}` }}>
                        <div className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Quick Replies inside chat */}
                {messages.length === 1 && !typing && (
                  <div className="px-4 py-2 bg-transparent flex gap-2 overflow-x-auto shrink-0 select-none scrollbar-none">
                    {(simLang === 'tr' ? quickRepliesTr : quickRepliesEn).map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSimQuickReply(reply)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-750 rounded-full text-[11px] font-semibold border cursor-pointer transition active:scale-95 shrink-0"
                        style={{
                          border: `1.5px solid rgba(${parseInt(primaryColor.slice(1,3),16) || 26}, ${parseInt(primaryColor.slice(3,5),16) || 58}, ${parseInt(primaryColor.slice(5,7),16) || 107}, 0.18)`,
                          color: primaryColor
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {/* Virtual input bar */}
                <div className="m-3 bg-white border border-slate-200/80 rounded-3xl flex items-center justify-between p-2 shadow-sm shrink-0">
                  <span className="text-slate-400 select-none text-[11px] pl-2">{simLang === 'tr' ? 'Sorunuzu yazın...' : 'Type your question...'}</span>
                  <button 
                    disabled 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white border-0 select-none shrink-0"
                    style={{
                      background: `linear-gradient(140deg, ${primaryColor}, ${adjustBrightness(primaryColor, -20)})`,
                      boxShadow: `0 4px 10px rgba(${parseInt(primaryColor.slice(1,3),16) || 26}, ${parseInt(primaryColor.slice(3,5),16) || 58}, ${parseInt(primaryColor.slice(5,7),16) || 107}, 0.35)`
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Script block & download triggers */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Code className="w-5 h-5 text-violet-400" />
              <span>Entegrasyon Çıktı Kodu</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Yapılandırmanıza göre küçülttülmüş (minified) web kodu. Sıkıştırma boyutu: <span className="font-semibold text-emerald-400 font-mono">{minifiedSize}</span></p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 active:scale-[0.97] text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Kopyalandı! ✓' : 'Kodu Kopyala'}</span>
            </button>
            <button
              onClick={handleDownloadJs}
              className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white hover:bg-white/15 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>.js Dosyası İndir</span>
            </button>
            <button
              onClick={handleDownloadPlugin}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>WordPress Eklentisi İndir (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Code display */}
        <div className="relative">
          {loadingCode ? (
            <div className="w-full h-44 bg-white/5 border border-white/10 animate-pulse rounded-xl flex items-center justify-center text-xs text-white/30 font-semibold">
              Kod derleniyor...
            </div>
          ) : (
            <textarea
              readOnly
              value={generatedCode}
              rows={6}
              className="w-full bg-[#0d1117] border border-white/10 text-emerald-400 placeholder-slate-500 font-mono text-[10px] p-4 rounded-xl outline-none resize-none"
            />
          )}
        </div>

        {/* WordPress instructions */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-white/80 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-violet-400" />
            <span>WordPress Kurulum Kılavuzu</span>
          </h4>
          <ol className="list-decimal pl-5 text-[11px] text-slate-400 space-y-2 leading-relaxed">
            <li>
              <span className="font-bold text-white/70">WordPress Eklentisi Yöntemi (Tavsiye Edilen):</span> "WordPress Eklentisi İndir (.ZIP)" butonuyla zip dosyasını indirin. WordPress Eklentiler &gt; Yeni Ekle &gt; Eklenti Yükle bölümünden yükleyip etkinleştirin.
            </li>
            <li>
              <span className="font-bold text-white/70">WPCode veya footer.php Yöntemi:</span> "Kodu Kopyala" butonuyla scripti panonuza alın. <span className="font-semibold text-white/50">WPCode</span> eklentisinde yeni JavaScript snippet oluşturarak konumu "Footer" seçip kaydedin.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
