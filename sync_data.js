// ============================================================
// sync_data.js — Google Drive Q&A → Supabase Embedding Sync
// Version 2.0 — Fixes: batch errors, rate limiting, local file fallback
// ============================================================
// Kullanım:
//   node sync_data.js              → Google Drive'dan sync
//   node sync_data.js --local      → Yerel qa_data.txt dosyasından
//   node sync_data.js --dry-run    → Sadece parse, upload etme
//
// .env dosyasına ekleyin:
//   OPENAI_API_KEY=sk-...
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...
//   GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json
//   GDRIVE_FILE_ID=1aBcD...
// ============================================================

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import 'dotenv/config';

// ── Clients ───────────────────────────────────────────────────
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const IS_LOCAL   = args.includes('--local');
const IS_DRY_RUN = args.includes('--dry-run');

// ── Download from Google Drive ────────────────────────────────
async function downloadFromDrive(fileId) {
  // Dynamic import to avoid errors if googleapis not installed
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './service-account.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'text' }
  );
  return res.data;
}

// ── Parse Q&A text ────────────────────────────────────────────
// Format:
//   Soru: ...
//   Cevap: ...
//   Kategori: ... (opsiyonel)
//   (boş satır)
function parseQA(text) {
  const entries = [];
  const blocks  = text.split(/\n\s*\n/).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let question = '', answer = '', category = 'genel', language = 'tr';

    for (const raw of lines) {
      const line = raw.trim();
      if      (line.startsWith('Soru:'))      { question  = line.slice(5).trim(); language = 'tr'; }
      else if (line.startsWith('Cevap:'))     { answer    = line.slice(6).trim(); }
      else if (line.startsWith('Question:'))  { question  = line.slice(9).trim(); language = 'en'; }
      else if (line.startsWith('Answer:'))    { answer    = line.slice(7).trim(); }
      else if (line.startsWith('Kategori:'))  { category  = line.slice(9).trim(); }
      else if (line.startsWith('Category:'))  { category  = line.slice(9).trim(); }
      // Multi-line answer support (continuation lines without prefix)
      else if (answer && !line.includes(':')) { answer += ' ' + line; }
    }

    if (question && answer) {
      entries.push({
        question: question.slice(0, 500),
        answer:   answer.slice(0, 2000),
        category: category.slice(0, 100),
        language,
      });
    }
  }

  return entries;
}

// ── Generate embeddings (rate-limit safe) ─────────────────────
async function generateEmbeddings(texts, batchSize = 20) {
  const embeddings = [];
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    let retries = 3;
    while (retries > 0) {
      try {
        const res = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
        });
        embeddings.push(...res.data.map(d => d.embedding));
        console.log(`  ✓ Embedding: ${Math.min(i + batchSize, total)}/${total}`);
        break;
      } catch (err) {
        retries--;
        if (err.status === 429 || err.code === 'rate_limit_exceeded') {
          const wait = (4 - retries) * 5000; // 5s, 10s, 15s
          console.warn(`  ⚠ Rate limit, ${wait / 1000}s bekleniyor...`);
          await new Promise(r => setTimeout(r, wait));
        } else if (retries === 0) {
          throw err;
        }
      }
    }

    // Polite delay between batches
    if (i + batchSize < total) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  return embeddings;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔄 IBU Veri Sync başlıyor...\n');

  // 1. Veri kaynağı
  let rawText;

  if (IS_LOCAL || !process.env.GDRIVE_FILE_ID) {
    const localPath = './qa_data.txt';
    if (!fs.existsSync(localPath)) {
      console.error(`❌ ${localPath} bulunamadı. --local flag'i kaldırın veya dosyayı oluşturun.`);
      process.exit(1);
    }
    console.log(`📂 Yerel dosya kullanılıyor: ${localPath}`);
    rawText = fs.readFileSync(localPath, 'utf-8');
  } else {
    console.log('📥 Google Drive\'dan indiriliyor...');
    try {
      rawText = await downloadFromDrive(process.env.GDRIVE_FILE_ID);
    } catch (err) {
      console.error('❌ Google Drive hatası:', err.message);
      console.log('   googleapis yüklü mu? npm install googleapis');
      process.exit(1);
    }
  }

  // 2. Parse
  console.log('\n📝 Q&A parse ediliyor...');
  const entries = parseQA(rawText);
  console.log(`✓ ${entries.length} Q&A çifti bulundu`);

  // İstatistikler
  const trCount = entries.filter(e => e.language === 'tr').length;
  const enCount = entries.filter(e => e.language === 'en').length;
  const cats = [...new Set(entries.map(e => e.category))];
  console.log(`  Türkçe: ${trCount} | İngilizce: ${enCount}`);
  console.log(`  Kategoriler: ${cats.join(', ')}`);

  if (entries.length === 0) {
    console.error('❌ Hiç kayıt bulunamadı. Format kontrol edin:');
    console.error('   Soru: Soru metni\n   Cevap: Cevap metni\n   (boş satır)');
    process.exit(1);
  }

  if (IS_DRY_RUN) {
    console.log('\n🔍 Dry-run modu — ilk 3 kayıt:');
    entries.slice(0, 3).forEach((e, i) => {
      console.log(`  [${i + 1}] ${e.question.slice(0, 60)}... → ${e.answer.slice(0, 60)}...`);
    });
    console.log('\n✓ Dry-run tamamlandı. Upload yapılmadı.');
    return;
  }

  // 3. Embeddings
  console.log('\n🧠 Embedding üretiliyor...');
  const textsToEmbed = entries.map(e => `${e.question}\n${e.answer}`);
  const embeddings   = await generateEmbeddings(textsToEmbed);

  // 4. Supabase — eski verileri temizle
  console.log('\n🗑️  Eski veriler temizleniyor...');
  const { error: delErr } = await supabase
    .from('ibu_documents')
    .delete()
    .not('id', 'is', null);   // hepsini sil

  if (delErr) {
    console.error('❌ Silme hatası:', delErr.message);
    process.exit(1);
  }

  // 5. Yeni veriler yükle
  console.log('💾 Yeni veriler yükleniyor...');
  const rows = entries.map((e, i) => ({
    question:  e.question,
    answer:    e.answer,
    category:  e.category,
    language:  e.language,
    embedding: embeddings[i],
  }));

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('ibu_documents').insert(batch);
    if (error) {
      console.error(`❌ Insert hatası (batch ${i / BATCH + 1}):`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ Yüklendi: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log(`\n✅ Sync tamamlandı! ${rows.length} kayıt yüklendi.\n`);

  // 6. Test sorgusu
  console.log('🧪 Test sorgusu çalışıyor...');
  try {
    const testEmb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'kayıt tarihleri ne zaman',
    });

    const { data: results, error: searchErr } = await supabase.rpc('match_documents', {
      query_embedding: testEmb.data[0].embedding,
      match_threshold: 0.5,
      match_count: 3,
      filter_lang: null,
    });

    if (searchErr) throw searchErr;

    console.log('Test sonuçları:');
    (results || []).forEach(r => {
      console.log(`  [${(r.similarity * 100).toFixed(1)}%] ${r.question}`);
    });

    if (!results || results.length === 0) {
      console.warn('  ⚠ Hiç sonuç dönmedi. match_documents fonksiyonunu kontrol edin.');
    }
  } catch (err) {
    console.warn('  ⚠ Test sorgusu başarısız:', err.message);
  }
}

main().catch(err => {
  console.error('❌ Beklenmeyen hata:', err);
  process.exit(1);
});
