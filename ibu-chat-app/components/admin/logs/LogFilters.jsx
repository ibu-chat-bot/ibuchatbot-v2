'use client'

import { FileDown, SlidersHorizontal, Search, RefreshCw } from 'lucide-react'

export default function LogFilters({
  search,
  setSearch,
  language,
  setLanguage,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  simMin,
  setSimMin,
  onClear,
  onExportPDF,
  exporting
}) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
          <SlidersHorizontal className="w-4 h-4 text-[#1a3a6b]" />
          <span>Detaylı Arama & Filtreler</span>
        </div>

        <div className="flex gap-2">
          {/* Secondary Outline Button */}
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1a3a6b] text-[#1a3a6b] hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Filtreleri Temizle</span>
          </button>
          
          {/* Primary Action Button */}
          <button
            onClick={onExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-[#1a3a6b] hover:bg-[#152d57] active:scale-[0.98] text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-md transition"
          >
            {exporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>PDF Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-ibu-gold" />
                <span>PDF Rapor İndir</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mesaj Arama</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Mesaj metninde ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs py-2 pl-9 pr-3 rounded-lg outline-none focus:border-[#1a3a6b]"
            />
          </div>
        </div>

        {/* Date picking */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tarih Aralığı (Başlangıç)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-650"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tarih Aralığı (Bitiş)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-650"
          />
        </div>

        {/* Language select */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dil</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded-lg outline-none cursor-pointer focus:border-[#1a3a6b] text-slate-600"
          >
            <option value="all">Tüm Diller</option>
            <option value="tr">Türkçe (TR)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>
      </div>

      {/* Similarity slider */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Minimum Eşleşme Skoru (Similarity)</span>
          <span className="font-mono font-bold text-[#1a3a6b]">Score &gt;= {simMin}</span>
        </div>
        <input
          type="range"
          min="0.00"
          max="1.00"
          step="0.05"
          value={simMin}
          onChange={(e) => setSimMin(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1a3a6b] focus:outline-none"
        />
      </div>
    </div>
  )
}
