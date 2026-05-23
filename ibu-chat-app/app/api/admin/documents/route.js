import { supabase } from '../../../../lib/supabase'
import { openai } from '../../../../lib/openai'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const language = searchParams.get('language') || ''
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('ibu_documents')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      // Postgres ILIKE search on question or answer
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)
    }
    if (category && category !== 'Tümü' && category !== 'all') {
      query = query.eq('category', category)
    }
    if (language && language !== 'Tümü' && language !== 'all') {
      query = query.eq('language', language)
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    return Response.json({
      documents: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('Error fetching documents:', err)
    return Response.json(
      { error: 'Belgeler listelenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  try {
    const { question, answer, category, language } = await req.json()

    if (!question || !answer) {
      return Response.json(
        { error: 'Soru ve cevap alanları zorunludur' },
        { status: 400 }
      )
    }

    // Generate embedding
    console.log('Generating embedding for new document...')
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: `${question.trim()}\n${answer.trim()}`,
    })
    const embedding = embeddingRes.data[0].embedding

    // Insert into Supabase
    const { data, error } = await supabase
      .from('ibu_documents')
      .insert({
        question: question.trim(),
        answer: answer.trim(),
        category: category || 'genel',
        language: language || 'tr',
        embedding,
      })
      .select()

    if (error) throw error

    return Response.json({ success: true, document: data[0] })
  } catch (err) {
    console.error('Error creating document:', err)
    return Response.json(
      { error: 'Yeni belge eklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
