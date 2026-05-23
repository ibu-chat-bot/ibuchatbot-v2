'use client'

import { MessageSquare, CheckCircle, Languages, BarChart } from 'lucide-react'

export default function StatsCards({ stats, loading }) {
  const cards = [
    {
      title: 'Toplam Soru',
      value: stats?.totalCount || 0,
      desc: 'Filtre aralığındaki toplam kullanıcı mesajları',
      icon: MessageSquare,
      color: 'text-[#1a3a6b] bg-[#1a3a6b]/10 border-[#1a3a6b]/20'
    },
    {
      title: 'Yanıtlanma Oranı',
      value: `${stats?.answeredRate || 0}%`,
      desc: 'Similarity skoru 0.55 ve üzeri olan cevaplar',
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    {
      title: 'Dil Dağılımı (TR/EN)',
      value: `${stats?.languageSplit?.tr || 0} / ${stats?.languageSplit?.en || 0}`,
      desc: `Türkçe: %${stats?.totalCount > 0 ? ((stats.languageSplit.tr / stats.totalCount) * 100).toFixed(0) : 0} | İngilizce: %${stats?.totalCount > 0 ? ((stats.languageSplit.en / stats.totalCount) * 100).toFixed(0) : 0}`,
      icon: Languages,
      color: 'text-[#c8a951] bg-[#c8a951]/10 border-[#c8a951]/20'
    },
    {
      title: 'Ort. Benzerlik Skoru',
      value: stats?.avgSimilarity || '0.000',
      desc: 'Kosinüs benzerliği (anlamsal eşleşme) ortalaması',
      icon: BarChart,
      color: 'text-purple-600 bg-purple-55 border-purple-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => {
        const Icon = card.icon
        
        return (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition">
            {/* Background design glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>

            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.title}</span>
                {loading ? (
                  <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg mt-1"></div>
                ) : (
                  <h3 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight">{card.value}</h3>
                )}
              </div>
              
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${card.color} shadow-sm flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">{card.desc}</p>
          </div>
        )
      })}
    </div>
  )
}
