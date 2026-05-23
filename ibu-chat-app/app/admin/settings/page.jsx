'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, AlertTriangle, Cpu, HelpCircle } from 'lucide-react'

export default function SettingsPage() {
  const [matchThreshold, setMatchThreshold] = useState(0.60)
  const [fallbackThreshold, setFallbackThreshold] = useState(0.50)
  const [maxTokens, setMaxTokens] = useState(600)
  const [gptModel, setGptModel] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.3)
  const [promptTr, setPromptTr] = useState('')
  const [promptEn, setPromptEn] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok) {
        setMatchThreshold(parseFloat(data.match_threshold || '0.60'))
        setFallbackThreshold(parseFloat(data.fallback_threshold || '0.50'))
        setMaxTokens(parseInt(data.max_tokens || '600'))
        setGptModel(data.gpt_model || 'gpt-4o')
        setTemperature(parseFloat(data.temperature || '0.3'))
        setPromptTr(data.system_prompt_tr || '')
        setPromptEn(data.system_prompt_en || '')
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_threshold: String(matchThreshold),
          fallback_threshold: String(fallbackThreshold),
          max_tokens: String(maxTokens),
          gpt_model: gptModel,
          temperature: String(temperature),
          system_prompt_tr: promptTr,
          system_prompt_en: promptEn,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ayarlar kaydedilemedi.')
      }

      setSuccess('Sistem ayarları veritabanına başarıyla kaydedildi! Chatbot artık bu parametrelerle çalışacak. ✓')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-xs">
          <div className="w-8 h-8 border-4 border-[#1a3a6b] border-t-transparent rounded-full animate-spin"></div>
          <span>Sistem ayarları yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#1a3a6b]" />
          <span>Sistem & Chatbot Ayarları</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">OpenAI modeli, benzerlik eşikleri, sıcaklık derecesi ve yapay zeka sistem direktiflerini yapılandırın</p>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-xs shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg flex items-center gap-3 text-xs shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main settings options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#1a3a6b]" />
                <span>Yapay Zeka & Model Parametreleri</span>
              </h3>

              {/* Model Choice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GPT Model Modeli</label>
                  <select
                    value={gptModel}
                    onChange={(e) => setGptModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#1a3a6b] font-semibold text-slate-700"
                  >
                    <option value="gpt-4o">gpt-4o (Gelişmiş & Önerilen)</option>
                    <option value="gpt-4o-mini">gpt-4o-mini (Hızlı & Ekonomik)</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (Eski Sürüm)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cevap Limiti (Max Tokens)</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-700 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5 pt-3 border-t border-slate-100">
                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Temperature (Yaratıcılık / Tutarlılık)</span>
                    <span className="font-mono font-bold text-[#1a3a6b]">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1a3a6b]"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 mt-1 font-bold">
                    <span>ODAKLANMIŞ & TUTARLI (0.0)</span>
                    <span>DENGELİ (0.3)</span>
                    <span>YARATICI & DİNAMİK (1.0)</span>
                  </div>
                </div>

                {/* Match Threshold */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Birincil Benzerlik Eşiği (Match Threshold)</span>
                    <span className="font-mono font-bold text-[#1a3a6b]">{matchThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.02"
                    value={matchThreshold}
                    onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1a3a6b]"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 mt-1 font-bold">
                    <span>GENİŞ ARAMA (0.50)</span>
                    <span>ÖNERİLEN (0.60)</span>
                    <span>KATI / TAM EŞLEŞME (0.95)</span>
                  </div>
                </div>

                {/* Fallback Threshold */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Yedek Dil Benzerlik Eşiği (Fallback Threshold)</span>
                    <span className="font-mono font-bold text-[#1a3a6b]">{fallbackThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="0.85"
                    step="0.02"
                    value={fallbackThreshold}
                    onChange={(e) => setFallbackThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1a3a6b]"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 mt-1 font-bold">
                    <span>ÇOK GENİŞ (0.40)</span>
                    <span>ÖNERİLEN (0.50)</span>
                    <span>KATI ARAMA (0.85)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System prompts */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-3">Sistem Direktifleri (System Prompts)</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Türkçe Sistem Promptu</label>
                  <textarea
                    rows={4}
                    value={promptTr}
                    onChange={(e) => setPromptTr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-600 resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">İngilizce Sistem Promptu</label>
                  <textarea
                    rows={4}
                    value={promptEn}
                    onChange={(e) => setPromptEn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-600 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Informative Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-3">
                <HelpCircle className="w-4 h-4 text-[#1a3a6b]" />
                <span>Parametre Kılavuzu</span>
              </h4>
              <ul className="text-[11px] text-slate-500 space-y-3 leading-relaxed">
                <li>
                  <span className="font-bold text-slate-700">Temperature:</span> Yaratıcılık katsayısıdır. 0.0 değeri tamamen tutarlı ve gerçek bilgi odaklı yanıtlar üretirken, 1.0 değeri daha serbest cümleler kurmasını sağlar. Chatbot sistemleri için <span className="font-bold text-slate-700">0.2 - 0.4</span> arası idealdir.
                </li>
                <li>
                  <span className="font-bold text-slate-700">Match Threshold:</span> Vektör aramasında benzerlik eşiğidir. Eşleşme skoru bu değerin altında kalan veriler göz ardı edilir. Düşük olması alakasız cevaplar dönmesine, yüksek olması ise doğru bilgilerin bile elenmesine neden olabilir. <span className="font-bold text-slate-700">0.60</span> mükemmel dengedir.
                </li>
                <li>
                  <span className="font-bold text-slate-700">System Prompt:</span> Modelin kişiliğini ve sınırlarını çizen kurallardır. Botun kimliği ve vereceği cevapların üslubu tamamen bu prompta dayanır.
                </li>
              </ul>
            </div>

            {/* Primary Action Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1a3a6b] hover:bg-[#152d57] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-lg transition shadow-md flex items-center justify-center gap-2 group text-xs"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4 text-ibu-gold" />
                  <span>Ayarları Veritabanına Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
