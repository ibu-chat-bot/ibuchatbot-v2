'use client'

import { useState } from 'react'
import { X, CheckCircle, AlertTriangle, Trash2, Database } from 'lucide-react'

export default function ParsePreviewModal({ isOpen, onClose, initialEntries, filename, onSyncComplete }) {
  const [entries, setEntries] = useState(initialEntries || [])
  const [clearExisting, setClearExisting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries]
    updated[index][field] = value
    setEntries(updated)
  }

  const handleRemoveEntry = (index) => {
    const updated = entries.filter((_, idx) => idx !== index)
    setEntries(updated)
  }

  const handleSync = async () => {
    setError('')
    setSuccess('')
    setSyncing(true)

    try {
      const res = await fetch('/api/admin/sync-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, clearExisting }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Vektör senkronizasyonu başarısız oldu.')
      }

      setSuccess(`${data.inserted} kayıt başarıyla vektörleştirildi ve yüklendi!`)
      setTimeout(() => {
        onSyncComplete()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1a3a6b] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#1a3a6b]" />
              <span>Veri Yükleme Önizleme</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Dosya: <span className="font-semibold text-slate-700">{filename}</span> &bull; {entries.length} kayıt bulundu</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={syncing}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-650"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* List of Entries */}
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group hover:shadow-sm transition">
                <button
                  type="button"
                  onClick={() => handleRemoveEntry(index)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-10">
                  {/* Category & Language */}
                  <div className="md:col-span-1 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                      <select
                        value={entry.category}
                        onChange={(e) => handleEntryChange(index, 'category', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                      >
                        <option value="genel">Genel</option>
                        <option value="kayit">Kayıt</option>
                        <option value="burs">Burs</option>
                        <option value="yurt">Yurt</option>
                        <option value="akademik">Akademik</option>
                        <option value="iletisim">İletişim</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dil</label>
                      <select
                        value={entry.language}
                        onChange={(e) => handleEntryChange(index, 'language', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                      >
                        <option value="tr">Türkçe (TR)</option>
                        <option value="en">English (EN)</option>
                      </select>
                    </div>
                  </div>

                  {/* Question & Answer Inputs */}
                  <div className="md:col-span-3 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Soru</label>
                      <input
                        type="text"
                        value={entry.question}
                        onChange={(e) => handleEntryChange(index, 'question', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cevap</label>
                      <textarea
                        rows={2}
                        value={entry.answer}
                        onChange={(e) => handleEntryChange(index, 'answer', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              disabled={syncing}
              className="w-4 h-4 text-[#1a3a6b] border-slate-300 rounded focus:ring-[#1a3a6b] focus:ring-2"
            />
            <span>Eski kayıtları temizle (Eski veritabanını sıfırla)</span>
          </label>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={syncing}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] text-slate-700 font-semibold rounded-lg text-xs transition"
            >
              İptal
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || entries.length === 0}
              className="px-4 py-2 bg-[#1a3a6b] hover:bg-[#152d57] active:scale-[0.98] text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Embedding Üretiliyor...</span>
                </>
              ) : (
                <>
                  <span>Vektörleştir & Yükle ({entries.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
