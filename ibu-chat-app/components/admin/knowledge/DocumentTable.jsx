'use client'

import { useState, useEffect } from 'react'
import { Edit2, Trash2, Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle, Plus, CheckCircle2, AlertTriangle, FileUp } from 'lucide-react'
import InlineEditRow from './InlineEditRow'

export default function DocumentTable({ refreshTrigger, onOpenUpload }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(15)

  // Filters state
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')

  // UI state
  const [selectedIds, setSelectedIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state for adding new single Q&A
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newCategory, setNewCategory] = useState('genel')
  const [newLanguage, setNewLanguage] = useState('tr')
  const [addingLoading, setAddingLoading] = useState(false)
  const [addingError, setAddingError] = useState('')

  const categories = ['genel', 'kayit', 'burs', 'yurt', 'akademik', 'iletisim']

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const url = `/api/admin/documents?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&category=${category}&language=${language}&sort=${sort}&order=${order}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setDocuments(data.documents)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      showToast('Kayıtlar yüklenirken bir hata oluştu.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [page, search, category, language, sort, order, refreshTrigger])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(documents.map(d => d.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectId = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleSingleDelete = async (id) => {
    if (!confirm('Bu kayıt bilgi tabanından silinecek. Emin misiniz?')) return

    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedIds(selectedIds.filter(x => x !== id))
        showToast('Kayıt başarıyla silindi.')
        fetchDocuments()
      } else {
        showToast('Kayıt silinemedi.', 'error')
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      showToast('Kayıt silinirken sunucu hatası oluştu.', 'error')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Seçilen ${selectedIds.length} kaydı silmek istediğinize emin misiniz?`)) return

    try {
      const res = await fetch('/api/admin/documents/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (res.ok) {
        showToast(`Seçilen ${selectedIds.length} kayıt başarıyla silindi.`)
        setSelectedIds([])
        fetchDocuments()
      } else {
        showToast('Toplu silme başarısız oldu.', 'error')
      }
    } catch (err) {
      console.error('Error bulk deleting documents:', err)
      showToast('Toplu silme sırasında sunucu hatası oluştu.', 'error')
    }
  }

  const handleAddNew = async (e) => {
    e.preventDefault()
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setAddingError('Lütfen soru ve cevap alanlarını doldurun')
      return
    }

    setAddingError('')
    setAddingLoading(true)

    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          answer: newAnswer,
          category: newCategory,
          language: newLanguage,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Yeni soru eklenemedi.')
      }

      setNewQuestion('')
      setNewAnswer('')
      setIsAdding(false)
      showToast('Yeni soru başarıyla eklendi ve vektörleştirildi.')
      fetchDocuments()
    } catch (err) {
      setAddingError(err.message)
      showToast('Soru eklenirken hata oluştu.', 'error')
    } finally {
      setAddingLoading(false)
    }
  }

  const toggleSort = (field) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert Box - Sağ üstte fixed position */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-scale-up text-xs font-semibold ${
          toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Primary Button */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-[#1a3a6b] hover:bg-[#152d57] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tekil Soru Ekle</span>
          </button>

          {/* Secondary Button - Outline Variant */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 border border-[#1a3a6b] text-[#1a3a6b] hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold transition"
          >
            <FileUp className="w-4 h-4" />
            <span>Toplu Dosya Yükle</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-650 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-md transition animate-scale-up"
            >
              <Trash2 className="w-4 h-4" />
              <span>Seçilenleri Sil ({selectedIds.length})</span>
            </button>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Soru veya cevapta ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white border border-slate-200 text-xs py-2 pl-10 pr-4 rounded-lg outline-none focus:border-[#1a3a6b] shadow-sm"
          />
        </div>
      </div>

      {/* Add new single entry card */}
      {isAdding && (
        <form onSubmit={handleAddNew} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#1a3a6b]">Tekil Soru Ekle</h3>
          {addingError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{addingError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kategori</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Dil</label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                >
                  <option value="tr">Türkçe (TR)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Soru</label>
                <input
                  type="text"
                  placeholder="Kullanıcıların sorabileceği soruyu girin..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cevap</label>
                <textarea
                  rows={2}
                  placeholder="Botun vereceği yanıtı girin..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-lg text-xs transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={addingLoading}
              className="px-4 py-2 bg-[#1a3a6b] hover:bg-[#152d57] text-white font-semibold rounded-lg text-xs shadow-md transition flex items-center gap-2"
            >
              {addingLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Vektörleştir & Kaydet</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Advanced Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <SlidersHorizontal className="w-4 h-4 text-[#1a3a6b]" />
          <span>Filtreler:</span>
        </div>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-xs py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#1a3a6b]"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <select
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-xs py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#1a3a6b]"
        >
          <option value="all">Tüm Diller</option>
          <option value="tr">Türkçe (TR)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      {/* Table Card - divide-y divide-gray-200 applied to row body */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-55 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={documents.length > 0 && selectedIds.length === documents.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-[#1a3a6b] border-slate-300 focus:ring-[#1a3a6b]"
                  />
                </th>
                <th className="px-6 py-4 w-16 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('id')}>
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 w-1/3 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('question')}>
                  <div className="flex items-center gap-1">
                    <span>Soru Metni</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 w-1/2">Cevap Metni</th>
                <th className="px-6 py-4 w-28 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1">
                    <span>Kategori / Dil</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 w-24">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#1a3a6b] border-t-transparent rounded-full animate-spin"></div>
                      <span>Veriler yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-xs">
                    Aranan kriterlere uygun bilgi tabanı kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                documents.map(doc => {
                  if (editingId === doc.id) {
                    return (
                      <InlineEditRow
                        key={doc.id}
                        document={doc}
                        onSave={(updatedDoc) => {
                          setEditingId(null)
                          showToast('Değişiklikler başarıyla kaydedildi.')
                          fetchDocuments()
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    )
                  }

                  const isChecked = selectedIds.includes(doc.id)

                  return (
                    <tr key={doc.id} className={`hover:bg-slate-50 transition ${isChecked ? 'bg-ibu-gold/5' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectId(doc.id)}
                          className="w-4 h-4 rounded text-[#1a3a6b] border-slate-300 focus:ring-[#1a3a6b]"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">
                        {doc.id}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">
                        {doc.question}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-sm truncate">
                        {doc.answer}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {doc.category}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#1a3a6b]/10 text-[#1a3a6b]">
                            {doc.language === 'en' ? 'ENGLISH (EN)' : 'TÜRKÇE (TR)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingId(doc.id)}
                            className="p-1.5 hover:bg-slate-150 text-slate-400 hover:text-[#1a3a6b] rounded-lg transition"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSingleDelete(doc.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Toplam <span className="font-semibold text-slate-700">{total}</span> kayıt içerisinden sayfa <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
