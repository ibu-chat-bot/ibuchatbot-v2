'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquareQuote, Lock, User, AlertCircle, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Giriş yapılamadı')
      }

      router.push('/admin/knowledge')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background soft blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ibu-gold/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl mb-3 backdrop-blur-md">
            <MessageSquareQuote className="w-8 h-8 text-[#c8a951]" />
          </div>
          <h1 className="font-outfit font-extrabold text-2xl text-white tracking-tight text-center">
            International Balkan University
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold text-[10px]">
            AI Chatbot Yönetim Paneli
          </p>
        </div>

        {/* Login Centered Card */}
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kullanıcı Adı</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-700 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  className="w-full bg-slate-50 border border-slate-200 text-xs py-2.5 pl-9 pr-3 rounded-lg outline-none focus:border-[#1a3a6b] text-slate-700 transition"
                />
              </div>
            </div>

            {/* Submit Button - Lacivert bg-[#1a3a6b] */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a3a6b] hover:bg-[#152d57] active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-lg transition shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sisteme Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Credit */}
        <p className="text-center text-slate-500 text-[10px] mt-6 leading-relaxed">
          &copy; {new Date().getFullYear()} International Balkan University.<br />Tüm Hakları Saklıdır.
        </p>
      </div>
    </div>
  )
}
