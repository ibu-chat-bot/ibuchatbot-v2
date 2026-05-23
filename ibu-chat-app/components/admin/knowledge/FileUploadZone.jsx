'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, AlertCircle, FileDigit } from 'lucide-react'

export default function FileUploadZone({ onParsed }) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const onButtonClick = () => {
    inputRef.current.click()
  }

  const processFile = async (file) => {
    setError('')
    setLoading(true)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/parse-file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Dosya yüklenemedi veya parse edilemedi.')
      }

      if (data.entries.length === 0) {
        throw new Error('Dosya içerisinde geçerli soru-cevap formatı bulunamadı.')
      }

      onParsed(data.entries, file.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
          dragActive 
            ? 'border-ibu-gold bg-ibu-gold/5 scale-[1.01]' 
            : 'border-slate-300 hover:border-ibu-blue hover:bg-slate-50'
        }`}
      >
        <input 
          ref={inputRef} 
          type="file" 
          className="hidden" 
          accept=".txt,.docx,.pdf,.xlsx,.xls"
          onChange={handleChange} 
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 border-4 border-ibu-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600">Dosya yükleniyor ve çözümleniyor...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-inner">
              <Upload className="w-6 h-6 text-ibu-blue animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Yüklemek istediğiniz dosyayı sürükleyin veya tıklayın</p>
              <p className="text-xs text-slate-400 mt-1">Desteklenen formatlar: .txt, .docx, .pdf, .xlsx</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
