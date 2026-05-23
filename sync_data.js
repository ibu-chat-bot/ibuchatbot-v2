// ============================================================
// sync_data.js — Google Drive Q&A → Supabase Embedding Sync
// ============================================================
// Kullanım:
//   node sync_data.js
//
// .env dosyasına ekleyin:
//   OPENAI_API_KEY=sk-...
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...
//   GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json  (Google API)
//   GDRIVE_FILE_ID=1aBcD...   (Google Drive dosya ID'si)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { google } from 'googleapis'
import fs from 'fs'
import 'dotenv/config'

const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Google Drive'dan dosyayı indir
async function downloadFromDrive(fileId) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' })
  return res.data
}

// Q&A metnini parse et
// Format: "Soru: ...\nCevap: ..." (boş satırla ayrılmış)
function parseQA(text) {
  const entries = []
  
  // Her iki satırlı bloğu parse et
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim())
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    let question = '', answer = '', category = 'genel', language = 'tr'
    
    for (const line of lines) {
      const l = line.trim()
      if (l.startsWith('Soru:'))      question  = l.replace('Soru:', '').trim()
      else if (l.startsWith('Cevap:')) answer    = l.replace('Cevap:', '').trim()
      else if (l.startsWith('Question:')) { question = l.replace('Question:', '').trim(); language = 'en' }
      else if (l.startsWith('Answer:'))   { answer   = l.replace('Answer:', '').trim();   language = 'en' }
      else if (l.startsWith('Kategori:')) category = l.replace('Kategori:', '').trim()
      else if (l.startsWith('Category:')) category = l.replace('Category:', '').trim()
    }
    
    if (question && answer) {
      entries.push({ question, answer, category, language })
    }
  }
  
  console.log(`✓ ${entries.length} Q&A çifti bulundu`)
  return entries
}

// Batch embedding üret (rate limit korumalı)
async function generateEmbeddings(texts, batchSize = 20) {
  const embeddings = []
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    embeddings.push(...res.data.map(d => d.embedding))
    
    console.log(`  Embedding: ${Math.min(i + batchSize, texts.length)}/${texts.length}`)
    
    // Rate limit için bekle
    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  return embeddings
}

// Ana sync fonksiyonu
async function syncData() {
  console.log('🔄 IBU Veri Sync başlıyor...\n')
  
  try {
    // 1. Google Drive'dan indir
    console.log('📥 Google Drive\'dan indiriliyor...')
    let rawText
    
    if (process.env.GDRIVE_FILE_ID) {
      rawText = await downloadFromDrive(process.env.GDRIVE_FILE_ID)
    } else {
      // Test için local dosya
      rawText = fs.readFileSync('./qa_data.txt', 'utf-8')
    }
    
    // 2. Q&A'ları parse et
    console.log('\n📝 Q&A çiftleri parse ediliyor...')
    const entries = parseQA(rawText)
    
    if (entries.length === 0) {
      console.error('❌ Hiç Q&A çifti bulunamadı! Format kontrol edin.')
      process.exit(1)
    }
    
    // 3. Embedding metinleri hazırla
    // Soru + Cevap birlikte embed edilirse daha iyi eşleşme olur
    const textsToEmbed = entries.map(e => `${e.question}\n${e.answer}`)
    
    console.log('\n🧠 Embedding üretiliyor...')
    const embeddings = await generateEmbeddings(textsToEmbed)
    
    // 4. Supabase'e yükle (önce temizle)
    console.log('\n🗑️  Eski veriler siliniyor...')
    const { error: deleteError } = await supabase
      .from('ibu_documents')
      .delete()
      .neq('id', 0)  // hepsini sil
    
    if (deleteError) throw deleteError
    
    // 5. Yeni verileri ekle (batch)
    console.log('💾 Yeni veriler yükleniyor...')
    const rows = entries.map((e, i) => ({
      question:  e.question,
      answer:    e.answer,
      category:  e.category,
      language:  e.language,
      embedding: embeddings[i],
    }))
    
    // 50'şerli batch'ler halinde ekle
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase.from('ibu_documents').insert(batch)
      if (error) throw error
      console.log(`  Yüklendi: ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
    }
    
    console.log(`\n✅ Sync tamamlandı! ${rows.length} kayıt yüklendi.`)
    
    // 6. Test sorgusu
    console.log('\n🧪 Test sorgusu çalışıyor...')
    const testEmb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'kayıt tarihleri ne zaman',
    })
    const { data: results } = await supabase.rpc('match_documents', {
      query_embedding: testEmb.data[0].embedding,
      match_threshold: 0.5,
      match_count: 3,
      filter_lang: null,
    })
    
    console.log('Test sonuçları:')
    results?.forEach(r => {
      console.log(`  [${(r.similarity * 100).toFixed(1)}%] ${r.question}`)
    })
    
  } catch (err) {
    console.error('❌ Hata:', err)
    process.exit(1)
  }
}

syncData()
