'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export default function CategoryChart({ data, loading }) {
  const COLORS = {
    'Kayıt İşlemleri': '#1a3a6b',
    'Burs Başvuruları': '#c8a951',
    'Yurt / Konaklama': '#10b981',
    'Akademik Bilgiler': '#8b5cf6',
    'İletişim / Ulaşım': '#f43f5e',
    'Genel': '#64748b',
  }

  const DEFAULT_COLORS = ['#1a3a6b', '#c8a951', '#10b981', '#8b5cf6', '#f43f5e', '#64748b']

  if (loading) {
    return (
      <div className="w-full h-80 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400 font-semibold">
        Veriler yükleniyor...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl">
        Yeterli veri bulunmamaktadır.
      </div>
    )
  }

  // Custom Pie Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 text-white p-3 rounded-xl border border-white/10 shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold mb-1" style={{ color: payload[0].payload.fill }}>{payload[0].name}</p>
          <p className="font-medium">Soru Adedi: <span className="font-bold text-white">{payload[0].value} adet</span></p>
          <p className="font-medium text-slate-300">Oran: <span className="font-bold text-white">%{payload[0].payload.percentage}</span></p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-80 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="w-full md:w-1/2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => {
                const color = COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                return <Cell key={`cell-${index}`} fill={color} />
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="w-full md:w-1/2 flex flex-col gap-3">
        {data.map((item, idx) => {
          const color = COLORS[item.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-md" style={{ backgroundColor: color }}></div>
                <span className="font-semibold text-slate-600 truncate max-w-[130px]">{item.name}</span>
              </div>
              <div className="font-mono font-bold text-slate-700 flex items-center gap-1.5">
                <span>{item.value}</span>
                <span className="text-[10px] text-slate-400 font-medium">(%{item.percentage})</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
