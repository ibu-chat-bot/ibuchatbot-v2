'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, PieChart as PieIcon, ClipboardList } from 'lucide-react'
import StatsCards from '../../../components/admin/logs/StatsCards'
import DailyChart from '../../../components/admin/logs/DailyChart'
import CategoryChart from '../../../components/admin/logs/CategoryChart'
import LogFilters from '../../../components/admin/logs/LogFilters'
import LogList from '../../../components/admin/logs/LogList'

export default function LogsPage() {
  // Stats & charts data state
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  // Logs table state
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Filters state
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [simMin, setSimMin] = useState(0.0)

  // Export PDF state
  const [exporting, setExporting] = useState(false)

  // Fetch charts & stats (runs once on load)
  const fetchMetadata = async () => {
    setLoadingMetadata(true)
    try {
      const [statsRes, chartRes, catRes] = await Promise.all([
        fetch('/api/admin/logs/stats'),
        fetch('/api/admin/logs/chart'),
        fetch('/api/admin/logs/categories')
      ])

      const statsData = await statsRes.json()
      const chartVal = await chartRes.json()
      const catVal = await catRes.json()

      setStats(statsData)
      setChartData(chartVal.data || [])
      setCategoryData(catVal.data || [])
    } catch (err) {
      console.error('Error fetching analytics metadata:', err)
    } finally {
      setLoadingMetadata(false)
    }
  }

  // Fetch log list (runs on filter/page change)
  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const url = `/api/admin/logs?page=${page}&limit=10&search=${encodeURIComponent(search)}&language=${language}&dateFrom=${dateFrom}&dateTo=${dateTo}&simMin=${simMin}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchMetadata()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [page, search, language, dateFrom, dateTo, simMin])

  const handleClearFilters = () => {
    setSearch('')
    setLanguage('all')
    setDateFrom('')
    setDateTo('')
    setSimMin(0.0)
    setPage(1)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const url = `/api/admin/logs/export?search=${encodeURIComponent(search)}&language=${language}&dateFrom=${dateFrom}&dateTo=${dateTo}&simMin=${simMin}`
      
      // Fetch report binary from endpoint
      const res = await fetch(url)
      if (!res.ok) throw new Error('PDF oluşturulamadı')
      
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `ibu_chatbot_raporu_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Rapor indirme sırasında hata oluştu: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <h1 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-ibu-blue" />
          <span>Analitik & Görüşme Logları</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Kullanıcıların chatbot ile gerçekleştirdiği diyalogları ve performans raporlarını inceleyin</p>
      </div>

      {/* Summary Metrik Cards */}
      <StatsCards stats={stats} loading={loadingMetadata} />

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily trend graph */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <TrendingUp className="w-4 h-4 text-ibu-blue" />
            <span>Günlük Soru Trendi (Son 30 Gün)</span>
          </div>
          <DailyChart data={chartData} loading={loadingMetadata} />
        </div>

        {/* Category distribution */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <PieIcon className="w-4 h-4 text-ibu-blue" />
            <span>Soru Kategori Dağılımı</span>
          </div>
          <CategoryChart data={categoryData} loading={loadingMetadata} />
        </div>
      </div>

      {/* Filter panel */}
      <LogFilters
        search={search}
        setSearch={(val) => { setSearch(val); setPage(1); }}
        language={language}
        setLanguage={(val) => { setLanguage(val); setPage(1); }}
        dateFrom={dateFrom}
        setDateFrom={(val) => { setDateFrom(val); setPage(1); }}
        dateTo={dateTo}
        setDateTo={(val) => { setDateTo(val); setPage(1); }}
        simMin={simMin}
        setSimMin={(val) => { setSimMin(val); setPage(1); }}
        onClear={handleClearFilters}
        onExportPDF={handleExportPDF}
        exporting={exporting}
      />

      {/* Log list details */}
      <div className="bg-white/40 p-1 rounded-3xl">
        <LogList
          logs={logs}
          loading={loadingLogs}
          total={total}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      </div>
    </div>
  )
}
