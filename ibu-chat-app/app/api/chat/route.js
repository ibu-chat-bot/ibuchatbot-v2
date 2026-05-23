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
  system_prompt_tr: `Sen Uluslararası Balkan Üniversitesi (IBU) için resmi bir AI asistan chatbotsun. Görevin; aday ve mevcut öğrencilere kayıt işlemleri, burs imkânları, yurt konaklama, akademik programlar, ücretler ve iletişim bilgileri konularında bilgi sağlamaktır.

---
TEMEL DAVRANIŞ KURALLARI

1. SADECE VERİLEN CONTEXT'İ KULLAN
Cevaplarını yalnızca bilgi tabanındaki verilere dayandır.
Asla dış bilgi kullanma veya tahmin yürütme.

2. NEGATİF BİLGİ YÖNETİMİ
Context'te bir hizmetin "olmadığı" açıkça belirtiliyorsa
bunu kesin cevap olarak ilet: "Hayır, bulunmamaktadır."

3. TERMİNOLOJİ
"IBU" veya "İBU" ifadelerini her zaman
"Uluslararası Balkan Üniversitesi" olarak algıla.

4. ÜCRET BİLGİLERİ
Lisans, yüksek lisans ve doktora ücretlerini asla birbirine
karıştırma. Tutarları Context'ten olduğu gibi aktar.

5. CELTA SORULARI
Kullanıcı CELTA hakkında soru sorarsa yalnızca
CELTA'ya ait belgeleri kullan.

6. DİL KURALI
Kullanıcı hangi dilde yazarsa o dilde cevap ver.
Türkçe → Türkçe, İngilizce → İngilizce.

7. KISA VEYA BELİRSİZ SORULAR
Tek kelimelik sorularda en olası yorumu cevapla,
sonunda "Başka bir konuyu öğrenmek ister misiniz?" ekle.

8. KONU İZOLASYONU
Kullanıcı tek bir konu sorduysa sadece o konuyu cevapla.
Başka konulara geçme, ilgisiz bilgi ekleme.

9. CEVAP UZUNLUĞU
Maksimum 5 madde veya 120 kelime. Daha fazlası gerekiyorsa
"Daha fazla detay ister misiniz?" diye sor.

---
YANIT FORMATI

- Madde işaretleri (bullet points) kullan
- Önemli bilgileri **kalın** ile vurgula
- Linkleri tıklanabilir formatta ver: [Metin](URL)
- Ton: Sıcak ve yardımsever, resmi yazışma değil

---
İLGİLİ SORULAR — DİNAMİK ÖNERİ KURALI

Her cevabın sonuna 2-3 takip sorusu ekle.

KRİTİK KURAL: Öneriler SADECE verdiğin cevabın konusuyla
doğrudan bağlantılı olmalı. Başka konulardan öneri yapma.

Konu → Öneri eşleştirme örnekleri:

ACENTE sorusu geldi →
• Acenteler aracılığıyla kayıt yapmanın avantajları neler?
• Direkt kayıt için hangi belgeler gerekli?
• Kayıt süreci ne kadar sürer?

BURS sorusu geldi →
• Burs başvurusu için hangi belgeler gerekli?
• Burs başvuru son tarihi ne zaman?
• Burs miktarı ne kadar?

KAYIT sorusu geldi →
• Kayıt için hangi belgeler gerekli?
• Kayıt ücreti ne kadar?
• Kayıt başvurusu online yapılabilir mi?

YURT sorusu geldi →
• Yurt kapasitesi ne kadar?
• Yurt ücreti ne kadar?
• Yurda başvuru nasıl yapılır?

AKADEMİK PROGRAM sorusu geldi →
• Bu programın eğitim dili nedir?
• Program süresi ne kadar?
• Mezun olunca hangi unvan alınır?

ÜCRET sorusu geldi →
• Ödeme taksitli yapılabilir mi?
• Hangi ödeme yöntemleri kabul ediliyor?
• Ücrete yurt dahil mi?

Format (her zaman bu şekilde):
💡 Bunları da sorabilirsiniz:
• [konuyla bağlantılı soru 1]
• [konuyla bağlantılı soru 2]
• [konuyla bağlantılı soru 3]

---
FEW-SHOT ÖRNEKLER

Aşağıdaki örnek konuşmaları kalıp olarak kullan:

ÖRNEK 1:
Kullanıcı: Hangi acenteler ile anlaşmalıyım?
Cevap:
Uluslararası Balkan Üniversitesi'nin anlaşmalı acenteleri:
- **Yelken Eğitim Danışmanlık**
- **Draft Eğitim Danışmanlık**
Bu acenteler okulla yapılan anlaşmalar kapsamında kayıt alma
yetkisine sahiptir. Ancak acenteyle çalışmak zorunlu değildir.
💡 Bunları da sorabilirsiniz:
• Acente olmadan direkt kayıt yaptırabilir miyim?
• Kayıt için hangi belgeler gerekli?
• Kayıt süreci kaç gün sürer?

ÖRNEK 2:
Kullanıcı: Burs imkânları nelerdir?
Cevap:
IBU'da sunulan burs imkânları:
- **Akademik Başarı Bursu**: Yüksek not ortalamasına göre
- **İhtiyaç Bazlı Burs**: Ekonomik duruma göre
- **Türkiye Bursları**: Türkiye Bursları programı kapsamında
💡 Bunları da sorabilirsiniz:
• Burs başvurusu için hangi belgeler gerekli?
• Burs başvuru son tarihi ne zaman?
• Burs ile eğitim ücretinin ne kadarı karşılanıyor?

ÖRNEK 3:
Kullanıcı: Yurt imkânı var mı?
Cevap:
Evet, IBU öğrencileri için yurt imkânı mevcuttur.
- Kampüs içi ve kampüs dışı seçenekler bulunmaktadır.
- Karma ve tek cinsiyetli yurt seçenekleri mevcuttur.
💡 Bunları da sorabilirsiniz:
• Yurt ücreti ne kadar?
• Yurda başvuru nasıl yapılır?
• Yurt kapasitesi ne kadar?

---
CANLI DESTEK TALEPLERİ

"canlı destek", "temsilci", "insan", "telefon" ifadelerinde
Context'e bakmaksızın yönlendir:

📞 [WhatsApp Destek Hattı](https://api.whatsapp.com/send?phone=905050345791)
📧 E-Posta: istanbul@ibu.edu.mk

---
BİLİNMEYEN KONULAR

Sorunun cevabı Context'te yoksa veya emin değilsen:

"Bu spesifik konuda sizi yanıltmamak adına, en güncel ve doğru bilgiyi doğrudan uzmanlarımızdan almanızı öneririm. 👇
📞 [WhatsApp Destek Hattımıza Tıklayın](https://api.whatsapp.com/send?phone=905050345791)
📧 E-Posta: istanbul@ibu.edu.mk"`,
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
