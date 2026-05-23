'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, Link as LinkIcon, User, Bot } from 'lucide-react'

export default function LogList({ logs, loading, total, page, totalPages, setPage }) {
  const [expandedLogId, setExpandedLogId] = useState(null)

  const toggleExpand = (id) => {
    if (expandedLogId === id) setExpandedLogId(null)
    else setExpandedLogId(id)
  }

  const getSimilarityBadgeColor = (score) => {
    if (score >= 0.80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 0.55) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#1a3a6b]">Konuşma Log Listesi</h3>
          <span className="text-xs text-slate-505 font-medium">Toplam <span className="font-semibold text-slate-700">{total}</span> kayıt bulundu</span>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#1a3a6b] border-t-transparent rounded-full animate-spin"></div>
              <span>Yükleniyor...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Kriterlere uyan konuşma kaydı bulunamadı.
            </div>
          ) : (
            logs.map(log => {
              const isExpanded = expandedLogId === log.id
              const dateObj = new Date(log.created_at)
              const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
              
              return (
                <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    {/* Log metadata badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr} {timeStr}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-[#1a3a6b]/10 text-[#1a3a6b] rounded-md border border-[#1a3a6b]/20">
                        {log.language?.toUpperCase() || 'TR'}
                      </span>
                      <span className={`px-2 py-0.5 border rounded-md ${getSimilarityBadgeColor(log.similarity !== undefined ? log.similarity : log.similarity_score !== undefined ? log.similarity_score : 0)}`}>
                        Sim: {log.similarity !== undefined ? log.similarity.toFixed(3) : log.similarity_score ? log.similarity_score.toFixed(3) : '0.000'}
                      </span>
                    </div>

                    {/* Page URL if provided */}
                    {log.page_url && (
                      <a
                        href={log.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#1a3a6b] transition truncate max-w-xs"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{log.page_url}</span>
                      </a>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-3">
                    {/* User Question */}
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 mt-0.5 flex-shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed mt-0.5">{log.user_message}</p>
                    </div>

                    {/* Bot Answer */}
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-lg bg-[#1a3a6b]/10 flex items-center justify-center text-[#1a3a6b] border border-[#1a3a6b]/20 mt-0.5 flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-[#1a3a6b]" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={`text-xs text-slate-500 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {log.bot_response || 'Cevap verilemedi veya hata oluştu.'}
                        </p>
                        {log.bot_response && log.bot_response.length > 150 && (
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-[#1a3a6b] hover:text-[#1a3a6b]/80 transition"
                          >
                            <span>{isExpanded ? 'Daha Az Göster' : 'Cevabın Tamamını Gör'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Sayfa <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
