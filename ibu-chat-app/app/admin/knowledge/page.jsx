'use client'

import { useState } from 'react'
import DocumentTable from '../../../components/admin/knowledge/DocumentTable'
import FileUploadZone from '../../../components/admin/knowledge/FileUploadZone'
import ParsePreviewModal from '../../../components/admin/knowledge/ParsePreviewModal'
import { Database, FileUp, X } from 'lucide-react'

export default function KnowledgePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  
  // Parse state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [parsedEntries, setParsedEntries] = useState([])
  const [parsedFilename, setParsedFilename] = useState('')

  const handleParsed = (entries, filename) => {
    setParsedEntries(entries)
    setParsedFilename(filename)
    setUploadOpen(false)
    setPreviewOpen(true)
  }

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit font-extrabold text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-ibu-blue" />
            <span>Bilgi Tabanı Yönetimi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Chatbot sisteminin anlamsal eşleşmede kullandığı soru-cevap veri havuzunu yönetin</p>
        </div>
      </div>

      {/* Collapsible file upload zone */}
      {uploadOpen && (
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 animate-scale-up relative">
          <button 
            onClick={() => setUploadOpen(false)}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-2">
            <FileUp className="w-5 h-5 text-ibu-blue" />
            <span>Toplu Dosya Yükle</span>
          </div>

          <FileUploadZone onParsed={handleParsed} />
        </div>
      )}

      {/* Main documents table */}
      <div className="bg-white/40 p-1 rounded-3xl">
        <DocumentTable 
          refreshTrigger={refreshTrigger} 
          onOpenUpload={() => setUploadOpen(true)} 
        />
      </div>

      {/* Preview modal for file sync */}
      <ParsePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        initialEntries={parsedEntries}
        filename={parsedFilename}
        onSyncComplete={triggerRefresh}
      />
    </div>
  )
}
