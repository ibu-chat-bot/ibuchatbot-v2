import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Default configurations
const DEFAULT_SETTINGS = {
  match_threshold: 0.60,
  fallback_threshold: 0.50,
  max_tokens: 600,
  gpt_model: 'gpt-4o',
  temperature: 0.3,
  system_prompt_tr: 'Sen Uluslararası Balkan Üniversitesi (IBU) için resmi bir AI chatbot asistanısın. Görevin, aday öğrencilere ve mevcut öğrencilere kayıt işlemleri, burs imkanları, yurt konaklama, akademik programlar ve okul iletişim detayları hakkında bilgi sağlamaktır. Kibar, profesyonel ve kısa yanıtlar ver. Bilmediğin konularda doğrudan sallama yapma, "Bu konuda detaylı bilgiye sahip değilim, lütfen IBU Öğrenci İşleri ile iletişime geçiniz." de.',
  system_prompt_en: 'You are the official AI chatbot assistant for International Balkan University (IBU). Your duty is to provide prospective and current students with accurate information regarding enrollment, scholarships, accommodation, academic programs, and contact details. Give helpful, polite, professional, and concise answers. If you do not know the answer, do not guess; instead, politely guide them to contact the IBU Student Affairs Office.',
}

// Dynamically fetch configurations from database
async function getDynamicSettings() {
  try {
    const { data } = await supabase.from('ibu_settings').select('*')
    if (!data || data.length === 0) return DEFAULT_SETTINGS

    const settings = { ...DEFAULT_SETTINGS }
    data.forEach(row => {
      if (row.key === 'match_threshold') settings.match_threshold = parseFloat(row.value)
      else if (row.key === 'fallback_threshold') settings.fallback_threshold = parseFloat(row.value)
      else if (row.key === 'max_tokens') settings.max_tokens = parseInt(row.value)
      else if (row.key === 'gpt_model') settings.gpt_model = row.value
      else if (row.key === 'temperature') settings.temperature = parseFloat(row.value)
      else if (row.key === 'system_prompt_tr') settings.system_prompt_tr = row.value
      else if (row.key === 'system_prompt_en') settings.system_prompt_en = row.value
    })
    return settings
  } catch (err) {
    console.error('Error reading dynamic settings, using defaults:', err)
    return DEFAULT_SETTINGS
  }
}

// Dil algılama: basit ama etkili
function detectLanguage(text) {
  const trChars = /[çğıöşüÇĞİÖŞÜ]/
  const trWords  = /\b(ne|nasıl|nerede|hangi|var|mı|mi|mu|mü|için|ile|üniversite|kayıt|burs)\b/i
  if (trChars.test(text) || trWords.test(text)) return 'tr'
  return 'en'
}

// Sistem promptunu dinamik olarak yapılandır
function buildSystemPrompt(lang, contextDocs, customPrompt) {
  const context = contextDocs
    .map((d, i) => `[${i+1}] Soru: ${d.question}\n    Cevap: ${d.answer}`)
    .join('\n\n')

  return `${customPrompt}\n\nKONTROL EDİLMİŞ BİLGİ KAYNAĞI / KNOWLEDGE BASE:\n${context}`
}

export async function POST(req) {
  // CORS headers
  const origin = req.headers.get('origin') || ''
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, '').toLowerCase())
  
  const normalizedOrigin = origin.trim().replace(/\/$/, '').toLowerCase()
  
  let corsOrigin = allowed[0] || '*'
  
  // Proactive safety check: If origin matches allowed list, OR belongs to balkan.edu.tr, vercel.app, or localhost
  if (
    allowed.includes(normalizedOrigin) ||
    normalizedOrigin.includes('balkan.edu.tr') ||
    normalizedOrigin.includes('vercel.app') ||
    normalizedOrigin.includes('localhost')
  ) {
    corsOrigin = origin
  }

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

    // 1. Fetch settings from DB
    const settings = await getDynamicSettings()

    // 2. Detect language
    const lang = detectLanguage(message)

    // 3. Generate query embeddings
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message.trim(),
    })
    const queryEmbedding = embeddingRes.data[0].embedding

    // 4. Semantic search with threshold
    const { data: docs, error: dbError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: settings.match_threshold,
      match_count: 5,
      filter_lang: lang,
    })

    if (dbError) throw new Error(`Supabase matching error: ${dbError.message}`)

    // Try fallback search across both languages
    let finalDocs = docs || []
    if (finalDocs.length === 0) {
      const { data: fallbackDocs } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: settings.fallback_threshold,
        match_count: 3,
        filter_lang: null,
      })
      finalDocs = fallbackDocs || []
    }

    // 5. Generate LLM completion
    const basePrompt = lang === 'tr' ? settings.system_prompt_tr : settings.system_prompt_en
    const systemPrompt = buildSystemPrompt(lang, finalDocs, basePrompt)

    const conversationHistory = history.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const stream = await openai.chat.completions.create({
      model: settings.gpt_model,
      stream: true,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ],
    })

    // 6. Return response stream
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

        const suggestions = finalDocs
          .slice(1, 4)
          .map(d => d.question)
          .filter(q => q && q.trim().toLowerCase() !== message.trim().toLowerCase())

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, lang, suggestions })}\n\n`))
        controller.close()

        // Background log saving
        supabase.from('ibu_chat_logs').insert({
          session_id: session_id || 'anonymous',
          user_message: message,
          bot_response: fullResponse,
          similarity_score: finalDocs[0]?.similarity || 0,
          matched_id: finalDocs[0]?.id || null,
          language: lang,
          page_url: page_url || null,
        }).then(() => {
          console.log('Conversation log successfully saved.')
        }).catch(console.error)
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

// GET Health Check
export async function GET() {
  return Response.json({ status: 'IBU Chat API çalışıyor ✓' })
}
