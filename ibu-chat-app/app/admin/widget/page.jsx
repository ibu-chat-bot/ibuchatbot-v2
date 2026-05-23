'use client'

import { useState, useEffect } from 'react'
import { Sliders, Copy, FileDown, Eye, Check, HelpCircle, Code, ShieldCheck } from 'lucide-react'

export default function WidgetPage() {
  // Widget states
  const [apiUrl, setApiUrl] = useState('https://yelqghcavbihvodedpls.supabase.co/api/chat') // default
  const [botName, setBotName] = useState('IBU Asistan')
  const [primaryColor, setPrimaryColor] = useState('#1a3a6b')
  const [accentColor, setAccentColor] = useState('#c8a951')
  const [position, setPosition] = useState('bottom-right')
  
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
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [simLang, setSimLang] = useState('tr')
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)

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
  }, [apiUrl, botName, primaryColor, accentColor, position, welcomeTr, welcomeEn, quickRepliesTr, quickRepliesEn])

  // Setup simulated initial messages on toggle or language change
  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: simLang === 'tr' ? welcomeTr : welcomeEn,
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
      if (simLang === 'tr') {
        if (text.includes('Kayıt')) botResponse = 'Güz dönemi kayıtları Temmuz-Eylül, Bahar dönemi ise Ocak-Şubat arasındadır.'
        else if (text.includes('Burs')) botResponse = 'Üniversitemiz başarılı öğrencilere %100\'e varan akademik başarı bursları sunmaktadır.'
        else if (text.includes('Program')) botResponse = 'Mühendislik, Mimarlık, İktisat ve Eğitim fakültelerimiz hakkında detaylı broşürleri web sitemizde bulabilirsiniz.'
        else botResponse = 'Bu simüle yanıttır. Gerçek sistemde bu soru veritabanı anlamsal araması ile eşleştirilir.'
      } else {
        if (text.includes('Enrollment')) botResponse = 'Fall enrollment is between July and September. Spring enrollment is in January.'
        else if (text.includes('Scholarship')) botResponse = 'IBU offers dynamic academic scholarship plans covering up to 100% tuition.'
        else if (text.includes('Program')) botResponse = 'Explore our premium faculties in Engineering, Architecture, Economics, and Social Sciences.'
        else botResponse = 'This is a simulated reply. In production, this matches semantic database records.'
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }])
      setTyping(false)
    }, 1200)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-[#1a3a6b]" />
          <span>Widget Kod Üretici</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">WordPress web sitenize yerleştireceğiniz canlı sohbet aracını özelleştirin ve entegrasyon kodunu kopyalayın</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Customization Form */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6 max-h-[75vh] overflow-y-auto pr-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-3 flex items-center gap-2">
            <span>Özelleştirme Parametreleri</span>
          </h2>

          {/* Core Configuration */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Bot Adı</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Widget Konumu</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#1a3a6b] text-slate-650 font-semibold"
                >
                  <option value="bottom-right">Sağ Alt Köşe</option>
                  <option value="bottom-left">Sol Alt Köşe</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">API URL (Next.js Rotası)</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-500 font-mono"
              />
            </div>

            {/* Colors picker */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ana Renk (Primary)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-205 p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs py-1.5 px-2 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">İkincil Renk (Accent)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-205 p-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs py-1.5 px-2 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Welcome messages */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Karşılama Mesajları</span>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Türkçe Hoş Geldiniz Mesajı</label>
                <textarea
                  rows={2}
                  value={welcomeTr}
                  onChange={(e) => setWelcomeTr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">İngilizce Hoş Geldiniz Mesajı</label>
                <textarea
                  rows={2}
                  value={welcomeEn}
                  onChange={(e) => setWelcomeEn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-600 resize-none"
                />
              </div>
            </div>

            {/* Quick replies */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Hızlı Karar Butonları</span>
              
              {/* TR buttons list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Türkçe Butonlar</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickRepliesTr.map((btn, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200">
                      <span>{btn}</span>
                      <button
                        type="button"
                        onClick={() => setQuickRepliesTr(quickRepliesTr.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 font-bold transition ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Yeni Türkçe buton ekle..."
                    value={newQuickTr}
                    onChange={(e) => setNewQuickTr(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs py-1.5 px-3 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newQuickTr.trim()) return
                      setQuickRepliesTr([...quickRepliesTr, newQuickTr.trim()])
                      setNewQuickTr('')
                    }}
                    className="px-3 bg-[#1a3a6b] hover:bg-[#152d57] text-white rounded-lg text-xs font-bold transition"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* EN buttons list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">İngilizce Butonlar</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickRepliesEn.map((btn, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200">
                      <span>{btn}</span>
                      <button
                        type="button"
                        onClick={() => setQuickRepliesEn(quickRepliesEn.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 font-bold transition ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Yeni İngilizce buton ekle..."
                    value={newQuickEn}
                    onChange={(e) => setNewQuickEn(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs py-1.5 px-3 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newQuickEn.trim()) return
                      setQuickRepliesEn([...quickRepliesEn, newQuickEn.trim()])
                      setNewQuickEn('')
                    }}
                    className="px-3 bg-[#1a3a6b] hover:bg-[#152d57] text-white rounded-lg text-xs font-bold transition"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Webpage Simulated functional live widget */}
        <div className="bg-slate-900/5 border border-slate-200 p-1 rounded-xl shadow-sm h-[75vh] flex flex-col overflow-hidden relative group">
          {/* Virtual browser header */}
          <div className="bg-slate-200/80 px-4 py-2 border-b flex items-center justify-between text-xs text-slate-500">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-white border rounded-md px-12 py-0.5 text-[9px] font-mono select-none">
              https://www.ibu.edu.mk (Simüle Sayfa)
            </div>
            <div className="w-8"></div>
          </div>

          {/* Webpage Content Simulation */}
          <div className="flex-1 p-8 flex flex-col justify-center items-center text-center bg-slate-50 relative select-none">
            <h3 className="font-outfit font-extrabold text-base text-slate-400">Uluslararası Balkan Üniversitesi</h3>
            <p className="text-[11px] text-slate-350 mt-1 max-w-sm leading-relaxed">
              Widget Canlı Önizlemesi. Sağ alttaki ikon butonuna tıklayarak sohbet penceresini test edebilirsiniz.
            </p>

            {/* Simulated Live Widget elements inline absolute inside the page */}
            {/* SO Sohbet FAB Button */}
            <button
              onClick={() => setWidgetOpen(!widgetOpen)}
              className="absolute z-40 transition-transform active:scale-95 shadow-xl hover:scale-105 border-0 cursor-pointer flex items-center justify-center"
              style={{
                bottom: '24px',
                right: position === 'bottom-right' ? '24px' : 'auto',
                left: position === 'bottom-left' ? '24px' : 'auto',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: primaryColor,
              }}
            >
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            </button>

            {/* SO Sohbet Penceresi */}
            {widgetOpen && (
              <div
                className="absolute z-50 bg-white shadow-2xl flex flex-col border border-slate-100 text-left transition-all duration-300 ease-out select-text"
                style={{
                  bottom: '92px',
                  right: position === 'bottom-right' ? '24px' : 'auto',
                  left: position === 'bottom-left' ? '24px' : 'auto',
                  width: '320px',
                  height: '420px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div className="p-4 text-white flex items-center justify-between shadow-md" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold font-outfit text-sm">
                      IBU
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{botName}</h4>
                      <p className="text-[8px] text-white/80 font-medium">Aktif asistan &bull; Çevrimiçi</p>
                    </div>
                  </div>
                  
                  {/* Lang Switch inside preview */}
                  <div className="flex border border-white/20 rounded-md overflow-hidden text-[9px] font-bold">
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

                {/* Simulated Messages list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-[11px]">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-2 items-start ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] flex-shrink-0 ${
                          m.sender === 'user' ? 'bg-slate-300 text-slate-800' : 'text-white'
                        }`}
                        style={{ backgroundColor: m.sender === 'bot' ? accentColor : '' }}
                      >
                        {m.sender === 'user' ? 'U' : 'B'}
                      </div>
                      <div
                        className={`p-2.5 rounded-xl max-w-[80%] leading-relaxed ${
                          m.sender === 'user' 
                            ? 'bg-slate-200 text-slate-800 rounded-tr-none' 
                            : 'bg-white text-slate-700 shadow-sm rounded-tl-none border border-slate-100'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {/* Typing animation bubble */}
                  {typing && (
                    <div className="flex gap-2 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] flex-shrink-0" style={{ backgroundColor: accentColor }}>
                        B
                      </div>
                      <div className="bg-white border border-slate-100 p-2.5 rounded-xl rounded-tl-none flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Quick Replies inside chat */}
                {messages.length === 1 && !typing && (
                  <div className="p-3 bg-slate-50 flex flex-wrap gap-1 border-t border-slate-100">
                    {(simLang === 'tr' ? quickRepliesTr : quickRepliesEn).map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSimQuickReply(reply)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold border border-slate-200 cursor-pointer transition active:scale-95"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {/* Virtual input bar */}
                <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 select-none">{simLang === 'tr' ? 'Sorunuzu yazın...' : 'Type your question...'}</span>
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border shadow-inner cursor-not-allowed select-none">&rarr;</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Script block & download triggers */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="font-bold text-sm text-[#1a3a6b] flex items-center gap-1.5">
              <Code className="w-5 h-5 text-[#1a3a6b]" />
              <span>Entegrasyon Çıktı Kodu</span>
            </h3>
            <p className="text-xs text-slate-450 mt-1">Yapılandırmanıza göre küçültülmüş (minified) web kodu. Sıkıştırma boyutu: <span className="font-semibold text-slate-605 font-mono">{minifiedSize}</span></p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Primary Action Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-[#1a3a6b] hover:bg-[#152d57] active:scale-[0.98] text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-md transition"
            >
              {copied ? <Check className="w-4 h-4 text-ibu-gold" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Kopyalandı! ✓' : 'Kodu Kopyala'}</span>
            </button>

            {/* Secondary Action - Outline Variant */}
            <button
              onClick={handleDownloadJs}
              className="flex items-center gap-1.5 border border-[#1a3a6b] text-[#1a3a6b] hover:bg-slate-50 font-semibold py-2 px-4 rounded-lg text-xs transition"
            >
              <FileDown className="w-4 h-4" />
              <span>.js Dosyası İndir</span>
            </button>

            <button
              onClick={handleDownloadPlugin}
              className="flex items-center gap-1.5 bg-ibu-gold hover:bg-ibu-gold/90 text-[#1a3a6b] font-bold py-2 px-4 rounded-lg text-xs shadow-md transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>WordPress Eklentisi İndir (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Code display */}
        <div className="relative">
          {loadingCode ? (
            <div className="w-full h-44 bg-slate-50 border border-slate-200 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400 font-semibold">
              Kod derleniyor...
            </div>
          ) : (
            <textarea
              readOnly
              value={generatedCode}
              rows={6}
              className="w-full bg-slate-900 border-0 text-amber-200 placeholder-slate-500 font-mono text-[10px] p-4 rounded-xl outline-none resize-none shadow-inner"
            />
          )}
        </div>

        {/* WordPress instructions */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#1a3a6b]" />
            <span>WordPress Kurulum Kılavuzu</span>
          </h4>
          <ol className="list-decimal pl-5 text-[11px] text-slate-500 space-y-2 leading-relaxed">
            <li>
              <span className="font-bold text-slate-750">WordPress Eklentisi Yöntemi (Önerilen):</span> "WordPress Eklentisi İndir (.ZIP)" butonuna tıklayarak zip dosyasını bilgisayarınıza indirin. WordPress sitenizde Eklentiler &gt; Yeni Ekle &gt; Eklenti Yükle bölümünden yükleyip etkinleştirin. Widget anında tüm sitenizde yayına girecektir!
            </li>
            <li>
              <span className="font-bold text-slate-750">WPCode veya footer.php Yöntemi:</span> Yukarıdaki "Kodu Kopyala" butonuyla entegrasyon scriptini panonuza alın. WordPress admin panelinde <span className="font-semibold text-slate-600">WPCode</span> (veya benzeri bir Script Adder) eklentisine gidin, yeni JavaScript snippet oluşturarak konumu "Footer" seçip kaydedin.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
