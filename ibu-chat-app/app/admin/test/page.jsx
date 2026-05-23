'use client'

import { useState, useRef, useEffect } from 'react'
import { BotMessageSquare, Send, Trash2, Loader2, Zap } from 'lucide-react'

const QUICK_TESTS = [
  { label: 'Kayıt tarihleri', text: 'Kayıt tarihleri ne zaman?' },
  { label: 'Burs imkânları', text: 'Burs imkânları hakkında bilgi verir misin?' },
  { label: 'Programlar', text: 'Hangi bölümler mevcut?' },
  { label: 'Yurt & konaklama', text: 'Yurt ve konaklama imkânları var mı?' },
  { label: 'Scholarship info', text: 'What scholarships are available?' },
  { label: 'Enrollment', text: 'How can I enroll?' },
]

export default function TestPage() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Merhaba! Ben IBU AI Asistanı. Kayıt, burslar, programlar veya kampüs hakkında her türlü sorunuzu yanıtlayabilirim.',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => 'test_' + Math.random().toString(36).slice(2))
  const [lang, setLang] = useState('tr')
  const [responseTime, setResponseTime] = useState(null)
  const [tokenCount, setTokenCount] = useState(0)
  const msgsRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [messages, loading])

  const historyForApi = () =>
    messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = {
      role: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    const t0 = performance.now()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          history: historyForApi(),
          lang,
        }),
      })

      if (!res.ok) throw new Error('API hatası: ' + res.status)

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      let suggestions = []

      const botMsg = {
        role: 'bot',
        text: '',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: [],
      }
      setMessages(prev => [...prev, botMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue
          try {
            const d = JSON.parse(line.slice(5))
            if (d.text) {
              full += d.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: full }
                return copy
              })
            }
            if (d.done) {
              if (d.lang) setLang(d.lang)
              if (d.suggestions?.length) {
                suggestions = d.suggestions
                setMessages(prev => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { ...copy[copy.length - 1], suggestions }
                  return copy
                })
              }
            }
          } catch { }
        }
      }

      const elapsed = ((performance.now() - t0) / 1000).toFixed(2)
      setResponseTime(elapsed)
      setTokenCount(prev => prev + Math.ceil(full.split(' ').length * 1.3))
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `❌ Hata: ${err.message}`,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'bot',
      text: 'Sohbet temizlendi. Size nasıl yardımcı olabilirim?',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    }])
    setResponseTime(null)
    setTokenCount(0)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
            <BotMessageSquare className="w-6 h-6 text-[#a82020]" />
            <span>Chatbot Test Aracı</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gerçek API'ye bağlı canlı sohbet testi — streaming yanıtlar ve öneri sistemi</p>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Temizle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Stats & Quick Test Sidebar */}
        <div className="space-y-4">
          {/* Session Stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Oturum İstatistikleri</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Mesaj sayısı</span>
                <span className="text-[11px] font-bold text-slate-700">{messages.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Son yanıt süresi</span>
                <span className={`text-[11px] font-bold ${responseTime ? (parseFloat(responseTime) < 2 ? 'text-emerald-600' : parseFloat(responseTime) < 5 ? 'text-amber-600' : 'text-red-500') : 'text-slate-400'}`}>
                  {responseTime ? `${responseTime}s` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Tahmini token</span>
                <span className="text-[11px] font-bold text-slate-700">{tokenCount > 0 ? `~${tokenCount}` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Aktif dil</span>
                <span className="text-[11px] font-bold text-[#a82020] uppercase">{lang}</span>
              </div>
            </div>
          </div>

          {/* Quick Test Buttons */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              Hızlı Test
            </h3>
            <div className="flex flex-col gap-1.5">
              {QUICK_TESTS.map((qt, i) => (
                <button
                  key={i}
                  onClick={() => send(qt.text)}
                  disabled={loading}
                  className="text-left text-[11px] font-medium text-slate-600 hover:text-[#a82020] hover:bg-red-50 px-3 py-2 rounded-lg border border-slate-100 hover:border-red-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Panel */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden" style={{ height: '600px' }}>
          {/* Chat Header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between shrink-0"
            style={{
              background: 'linear-gradient(148deg, #a82020 0%, #7a1515 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <BotMessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  IBU Asistan
                  {/* AI sparkles icon */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.2" width="13" height="13" style={{ display: 'inline', verticalAlign: 'middle' }}>
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  </svg>
                </p>
                <p className="text-[9px] text-white/65 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Canlı API Bağlantısı Aktif
                </p>
              </div>
            </div>
            {/* Lang toggle */}
            <div className="flex border border-white/20 rounded-full overflow-hidden text-[9px] font-bold">
              <button
                onClick={() => setLang('tr')}
                className={`px-3 py-1 border-none cursor-pointer font-bold transition text-white ${lang === 'tr' ? 'bg-white/25' : 'bg-transparent hover:bg-white/10'}`}
              >TR</button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 border-none cursor-pointer font-bold transition text-white ${lang === 'en' ? 'bg-white/25' : 'bg-transparent hover:bg-white/10'}`}
              >EN</button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={msgsRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#f8f9fc]"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] px-4 py-3 text-[13.5px] leading-relaxed font-[400] ${
                    m.role === 'user'
                      ? 'text-white'
                      : m.isError
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-white text-slate-800 border border-black/[0.06]'
                  }`}
                  style={{
                    borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '6px 18px 18px 18px',
                    background: m.role === 'user' ? 'linear-gradient(138deg, #a82020 0%, #7a1515 100%)' : (m.isError ? undefined : '#fff'),
                    boxShadow: m.role === 'user' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {m.text || (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>

                {/* Suggestions */}
                {m.role === 'bot' && m.suggestions?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1 items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">İlgili konular</span>
                    {m.suggestions.map((s, si) => (
                      <button
                        key={si}
                        onClick={() => send(s)}
                        disabled={loading}
                        className="flex items-center justify-between gap-2.5 text-left text-[12.5px] font-semibold text-slate-700 bg-white hover:bg-red-50 hover:text-[#a82020] border border-black/[0.07] hover:border-red-100 px-3.5 py-2.5 rounded-[10px] shadow-sm transition hover:translate-x-0.5 cursor-pointer disabled:opacity-40"
                      >
                        <span>{s}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[9px] text-slate-400 px-1">{m.time}</span>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start gap-0">
                <div className="bg-white border border-black/[0.06] px-4 py-3 shadow-sm flex gap-1.5 items-center" style={{ borderRadius: '6px 18px 18px 18px' }}>
                  <span className="w-1.5 h-1.5 bg-[#a82020]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#a82020]/65 rounded-full animate-bounce" style={{ animationDelay: '180ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#a82020]/90 rounded-full animate-bounce" style={{ animationDelay: '360ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-[#a82020]/40 focus-within:ring-2 focus-within:ring-[#a82020]/05 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                }}
                placeholder={lang === 'tr' ? 'Bir mesaj yazın... (Enter ile gönderin)' : 'Type a message... (Enter to send)'}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[13.5px] text-slate-800 placeholder-slate-400 font-[400] leading-relaxed max-h-[100px]"
                style={{ fontFamily: 'inherit' }}
                disabled={loading}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white border-none transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shrink-0"
                style={{
                  background: 'linear-gradient(140deg, #a82020, #7a1515)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 text-center font-medium tracking-wide uppercase">
              IBU · AI Asistan — Canlı Test Modu
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
