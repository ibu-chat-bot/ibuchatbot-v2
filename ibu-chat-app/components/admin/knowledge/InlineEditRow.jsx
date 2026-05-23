'use client'

import { useState } from 'react'
import { Save, X, AlertCircle } from 'lucide-react'

export default function InlineEditRow({ document, onSave, onCancel }) {
  const [question, setQuestion] = useState(document.question)
  const [answer, setAnswer] = useState(document.answer)
  const [category, setCategory] = useState(document.category || 'genel')
  const [language, setLanguage] = useState(document.language || 'tr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Soru ve cevap alanları boş bırakılamaz')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category, language }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Belge güncellenemedi.')
      }

      onSave(data.document)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className="bg-slate-50 border-y-2 border-ibu-gold/20">
      <td className="px-6 py-4 font-mono text-xs text-slate-400 font-medium">
        {document.id}
      </td>
      <td className="px-6 py-4 col-span-2 space-y-3" colSpan="2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Soru</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-white border border-slate-200 text-sm py-2 px-3 rounded-lg outline-none focus:border-ibu-blue"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Cevap</label>
            <textarea
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full bg-white border border-slate-200 text-sm py-2 px-3 rounded-lg outline-none focus:border-ibu-blue resize-none"
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 space-y-3">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-ibu-blue"
          >
            <option value="genel">Genel</option>
            <option value="kayit">Kayıt</option>
            <option value="burs">Burs</option>
            <option value="yurt">Yurt</option>
            <option value="akademik">Akademik</option>
            <option value="iletisim">İletişim</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Dil</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-ibu-blue"
          >
            <option value="tr">Türkçe (TR)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg transition shadow-md flex items-center justify-center"
            title="Değişiklikleri Kaydet"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
            title="İptal Et"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
