// ============================================================
// /app/api/chat/route.js  (Next.js 14+ App Router)
// ============================================================
// Kurulum:
//   npx create-next-app@latest ibu-chat-app
//   npm install openai @supabase/supabase-js
//
// .env.local dosyanıza ekleyin:
//   OPENAI_API_KEY=sk-...
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...  (service_role key)
//   ALLOWED_ORIGINS=https://ibu.edu.mk,https://www.ibu.edu.mk
// ============================================================

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Dil algılama: basit ama etkili
function detectLanguage(text) {
  const trChars = /[çğıöşüÇĞİÖŞÜ]/
  const trWords  = /\b(ne|nasıl|nerede|hangi|var|mı|mi|mu|mü|için|ile|üniversite|kayıt|burs)\b/i
  if (trChars.test(text) || trWords.test(text)) return 'tr'
  return 'en'
}

// Sistem promptu — IBU'ya özel
function buildSystemPrompt(lang, contextDocs) {
  const context = contextDocs
    .map((d, i) => `[${i+1}] Soru: ${d.question}\n    Cevap: ${d.answer}`)
    .join('\n\n')

  if (lang === 'tr') {
    return `Sen Uluslararası Balkan Üniversitesi'nin (IBU) resmi yapay zeka asistanısın.

GÖREV:
- Aşağıdaki bilgi tabanını kullanarak soruları yanıtla
- Bilgi tabanında yoksa dürüstçe "Bu konuda bilgim yok, lütfen bizimle iletişime geçin" de
- Kesinlikle uydurma bilgi verme
- Kısa, net, samimi bir dil kullan
- Gerekirse madde maddeli cevap ver

İLETİŞİM BİLGİLERİ (bilgi yoksa yönlendir):
- Email: info@ibu.edu.mk
- Telefon: +389 2 246 2250
- Adres: Ilindenska bb, 1200 Tetovo, Kuzey Makedonya

BİLGİ TABANI:
${context}

ÖNEMLİ: Sadece bu bilgi tabanından cevap ver. Bilgi tabanında olmayan konularda iletişim bilgilerini paylaş.`
  }

  return `You are the official AI assistant of International Balkan University (IBU).

YOUR ROLE:
- Answer questions using only the knowledge base below
- If not in the knowledge base, say "I don't have info on this, please contact us"
- Never make up information
- Be concise, clear, and friendly

CONTACT INFO (redirect if unsure):
- Email: info@ibu.edu.mk
- Phone: +389 2 246 2250
- Address: Ilindenska bb, 1200 Tetovo, North Macedonia

KNOWLEDGE BASE:
${context}

IMPORTANT: Only use this knowledge base. For anything outside it, share contact information.`
}

export async function POST(req) {
  // CORS başlıkları
  const origin = req.headers.get('origin') || ''
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',')
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0]

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const body = await req.json()
    const { message, session_id, page_url, history = [] } = body

    if (!message || message.trim().length < 2) {
      return Response.json({ error: 'Mesaj çok kısa' }, { status: 400 })
    }

    // 1. Dil algıla
    const lang = detectLanguage(message)

    // 2. Soruyu vektöre çevir
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message.trim(),
    })
    const queryEmbedding = embeddingRes.data[0].embedding

    // 3. Supabase'den semantic arama
    const { data: docs, error: dbError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.68,
      match_count: 5,
      filter_lang: lang,
    })

    if (dbError) throw new Error(`Supabase error: ${dbError.message}`)

    // Eşleşme yoksa diğer dilde dene
    let finalDocs = docs || []
    if (finalDocs.length === 0) {
      const { data: fallbackDocs } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.60,
        match_count: 3,
        filter_lang: null, // dil filtresi yok
      })
      finalDocs = fallbackDocs || []
    }

    // 4. GPT-4o ile cevap üret (streaming)
    const systemPrompt = buildSystemPrompt(lang, finalDocs)

    // Önceki konuşma geçmişini ekle (max 6 mesaj)
    const conversationHistory = history.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      temperature: 0.3,       // düşük = daha tutarlı cevaplar
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ],
    })

    // 5. Stream'i client'a ilet + logu kaydet
    let fullResponse = ''
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        // Stream bitti, logu kaydet
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, lang })}\n\n`))
        controller.close()

        // Log kaydet (await etmeye gerek yok, background)
        supabase.from('ibu_chat_logs').insert({
          session_id: session_id || 'anonymous',
          user_message: message,
          bot_response: fullResponse,
          matched_ids: finalDocs.map(d => d.id),
          similarity: finalDocs[0]?.similarity || 0,
          language: lang,
          page_url: page_url || null,
        }).then(() => {}).catch(console.error)
      }
    })

    return new Response(readableStream, { headers })

  } catch (err) {
    console.error('IBU Chat API Error:', err)
    return Response.json(
      { error: 'Bir hata oluştu, lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}

// GET - sağlık kontrolü
export async function GET() {
  return Response.json({ status: 'IBU Chat API çalışıyor ✓' })
}
