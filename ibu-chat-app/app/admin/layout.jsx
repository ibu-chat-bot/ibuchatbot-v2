'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '../../components/admin/Sidebar'

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  
  // Exclude the login page from the Sidebar dashboard layout entirely
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="bg-gray-50 min-h-screen text-slate-800">
      {/* Sidebar Navigation - Fixed w-64 at fixed position */}
      <Sidebar />

      {/* Main Content Area - Shifted right by ml-64 to clear fixed Sidebar */}
      <main className="ml-64 p-8 bg-gray-50 min-h-screen relative">
        {/* Soft background glow circles */}
        <div className="absolute top-24 right-48 w-96 h-96 bg-ibu-navy/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-24 left-48 w-96 h-96 bg-ibu-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Content Container */}
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
