// ============================================================
// IBU Chatbot — /app/api/chat/route.js
// Next.js App Router — SSE Streaming  
// Fixes: CORS, error handling, similarity score, hasContext flag
// ============================================================

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ── Clients ──────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── CORS ─────────────────────────────────────────────────────
const RAW_ORIGINS = process.env.ALLOWED_ORIGINS || '';
const ALLOWED = new Set(
  RAW_ORIGINS.split(',')
    .map(s => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  // Normalize: strip trailing slash
  const normalizedOrigin = origin.replace(/\/$/, '');
  const allowed = ALLOWED.has(normalizedOrigin) || ALLOWED.size === 0;

  return {
    'Access-Control-Allow-Origin': allowed ? normalizedOrigin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

// ── OPTIONS (preflight) ───────────────────────────────────────
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

// ── GET (health check) ────────────────────────────────────────
export async function GET(req) {
  return NextResponse.json(
    { status: 'IBU Chat API çalışıyor ✓', timestamp: new Date().toISOString() },
    { headers: getCorsHeaders(req) }
  );
}

// ── Language Detection ────────────────────────────────────────
function detectLang(text) {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return 'tr';
  if (/\b(ne|nasıl|hangi|nerede|kayıt|burs|üniversite|okul|program|yurt)\b/i.test(text)) return 'tr';
  return 'en';
}

// ── System Prompt ─────────────────────────────────────────────
function buildSystemPrompt(lang, contextChunks) {
  const hasContext = contextChunks && contextChunks.length > 0;
  const contextSection = hasContext
    ? `\n\n=== BİLGİ TABANI ===\n${contextChunks.map((c, i) => `[${i + 1}] S: ${c.question}\nC: ${c.answer}`).join('\n\n')}\n=== BİLGİ TABANI SONU ===`
    : '';

  if (lang === 'tr') {
    return `Sen Uluslararası Balkan Üniversitesi (IBU) için resmi bir AI chatbot asistanısın.
Görevin: aday öğrencilere ve mevcut öğrencilere kayıt işlemleri, burs imkânları, yurt konaklama, akademik programlar ve iletişim bilgileri hakkında yardımcı olmak.

KURALLAR:
- Kibar, profesyonel ve net yanıtlar ver
- Yanıtları çok uzun tutma, gerektiği kadar açıkla
- **Kalın metin** için çift yıldız kullan
- Madde listesi için tire (-) kullan
- Emin olmadığın konularda sallama yapma
- Konuşma geçmişini dikkate al

CANLI DESTEK:
Kullanıcı "canlı destek", "temsilci", "insan", "telefon", "operatör" gibi ifadeler kullanırsa:
"Size daha hızlı yardımcı olmak için destek ekibimize bağlanabilirsiniz:
📞 [WhatsApp Destek](https://api.whatsapp.com/send?phone=905050345791)
📧 E-posta: istanbul@ibu.edu.mk"

BİLİNMEYEN KONULAR:
Bilgi tabanında cevap yoksa:
"Bu konuda sizi yanıltmamak adına, uzmanlarımızla iletişime geçmenizi öneririm:
📞 [WhatsApp Destek Hattı](https://api.whatsapp.com/send?phone=905050345791)
📧 istanbul@ibu.edu.mk"${contextSection}`;
  }

  return `You are the official AI chatbot assistant for International Balkan University (IBU).
Your role: help prospective and current students with enrollment, scholarships, dormitories, academic programs, and contact information.

RULES:
- Be polite, professional and clear
- Keep answers concise but complete
- Use **bold text** with double asterisks
- Use dash (-) for bullet lists
- Do not guess on uncertain topics
- Consider conversation history

LIVE SUPPORT:
If user mentions "live support", "agent", "human", "phone", "operator":
"To connect with our support team:
📞 [WhatsApp Support](https://api.whatsapp.com/send?phone=905050345791)
📧 Email: istanbul@ibu.edu.mk"

UNKNOWN TOPICS:
If not in the knowledge base:
"To avoid giving you incorrect information, please contact our specialists:
📞 [WhatsApp Support](https://api.whatsapp.com/send?phone=905050345791)
📧 istanbul@ibu.edu.mk"${contextSection}`;
}

// ── POST (main chat) ──────────────────────────────────────────
export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  // ── 1. Parse request ───────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { message, history = [], lang: clientLang, sessionId } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message required' }, { status: 400, headers: corsHeaders });
  }

  const userMsg = message.trim().slice(0, 1000); // max 1000 chars
  const lang = clientLang || detectLang(userMsg);

  // ── 2. Generate embedding ──────────────────────────────────
  let queryEmbedding;
  try {
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMsg,
    });
    queryEmbedding = embRes.data[0].embedding;
  } catch (err) {
    console.error('[IBU] Embedding error:', err.message);
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500, headers: corsHeaders });
  }

  // ── 3. Semantic search ─────────────────────────────────────
  let contextDocs = [];
  let topSimilarity = 0;

  try {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.62,
      match_count: 4,
      filter_lang: lang === 'tr' ? 'tr' : null, // null = all langs
    });

    if (error) throw error;
    contextDocs = data || [];
    topSimilarity = contextDocs[0]?.similarity || 0;
  } catch (err) {
    console.error('[IBU] Supabase search error:', err.message);
    // Don't fail the request — continue without context
  }

  const hasContext = contextDocs.length > 0;

  // ── 4. Build messages ──────────────────────────────────────
  const systemPrompt = buildSystemPrompt(lang, contextDocs);

  // Keep last 8 messages from history (4 turns)
  const recentHistory = (Array.isArray(history) ? history : [])
    .slice(-8)
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 2000) }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: userMsg },
  ];

  // ── 5. Stream GPT-4o response ──────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let fullResponse = '';

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          stream: true,
          temperature: 0.4,
          max_tokens: 600,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            fullResponse += text;
            send({ text });
          }
        }

        // ── Log conversation ───────────────────────────────
        try {
          await supabase.from('ibu_chat_logs').insert({
            session_id: sessionId || null,
            user_message: userMsg,
            bot_response: fullResponse,
            language: lang,
            similarity_score: topSimilarity,
            has_context: hasContext,
            context_count: contextDocs.length,
          });
        } catch (logErr) {
          console.warn('[IBU] Log insert failed:', logErr.message);
          // Non-fatal
        }

        // ── Done event ─────────────────────────────────────
        send({
          done: true,
          lang,
          similarity: topSimilarity,
          hasContext,
        });

      } catch (err) {
        console.error('[IBU] OpenAI stream error:', err.message);
        send({
          text: lang === 'tr'
            ? 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
            : 'Sorry, an error occurred. Please try again.',
        });
        send({ done: true, lang, similarity: 0, hasContext: false });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',         // Nginx: disable proxy buffering
      'Connection': 'keep-alive',
    },
  });
}
