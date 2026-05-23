'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DailyChart({ data, loading }) {
  if (loading) {
    return (
      <div className="w-full h-80 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400 font-semibold">
        Grafik verisi yükleniyor...
      </div>
    )
  }

  // Custom tooltip design
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 text-white p-3 rounded-xl border border-white/10 shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold text-ibu-gold mb-1">{label}</p>
          <p className="font-medium">Soru Sayısı: <span className="font-bold text-white">{payload[0].value} adet</span></p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26, 58, 107, 0.04)' }} />
          <Bar 
            dataKey="Soru" 
            fill="#1a3a6b" 
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
