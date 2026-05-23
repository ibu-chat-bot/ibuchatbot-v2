'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Database, 
  BarChart3, 
  Settings, 
  Sliders, 
  LogOut, 
  MessageSquareQuote,
  User
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      name: 'Bilgi Tabanı',
      path: '/admin/knowledge',
      icon: Database
    },
    {
      name: 'Loglar & Analitik',
      path: '/admin/logs',
      icon: BarChart3
    },
    {
      name: 'Widget Üretici',
      path: '/admin/widget',
      icon: Sliders
    },
    {
      name: 'Sistem Ayarları',
      path: '/admin/settings',
      icon: Settings
    }
  ]

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/admin/auth/logout', { method: 'POST' })
      if (res.ok) {
        router.push('/admin/login')
        router.refresh()
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 fixed left-0 top-0 z-40 shadow-xl border-r border-slate-850 flex-shrink-0">
      <div>
        {/* Header / Logo */}
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
            <MessageSquareQuote className="w-5 h-5 text-ibu-gold" />
          </div>
          <div>
            <h1 className="font-outfit font-bold text-base leading-tight tracking-wide">IBU Chatbot</h1>
            <p className="text-[10px] uppercase tracking-widest text-ibu-gold font-medium">Yönetim Paneli</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-800 text-white shadow-md font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="pt-5 border-t border-slate-800 space-y-4">
        {/* User profile info / avatar */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">IBU Admin</p>
            <p className="text-[9px] text-slate-500 truncate">Sistem Yöneticisi</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-xs font-semibold"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
  )
}
