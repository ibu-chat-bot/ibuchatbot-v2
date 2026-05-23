import { supabase } from '../../../../../lib/supabase'
import { openai } from '../../../../../lib/openai'

export async function PUT(req, { params }) {
  try {
    const { id } = params
    const { question, answer, category, language } = await req.json()

    if (!question || !answer) {
      return Response.json(
        { error: 'Soru ve cevap alanları zorunludur' },
        { status: 400 }
      )
    }

    // 1. Generate new embedding
    console.log(`Re-embedding document ID: ${id}...`)
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: `${question.trim()}\n${answer.trim()}`,
    })
    const embedding = embeddingRes.data[0].embedding

    // 2. Update Supabase record
    const { data, error } = await supabase
      .from('ibu_documents')
      .update({
        question: question.trim(),
        answer: answer.trim(),
        category: category || 'genel',
        language: language || 'tr',
        embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return Response.json(
        { error: 'Güncellenecek belge bulunamadı' },
        { status: 404 }
      )
    }

    return Response.json({ success: true, document: data[0] })
  } catch (err) {
    console.error(`Error updating document ID ${params.id}:`, err)
    return Response.json(
      { error: 'Belge güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params

    const { error, count } = await supabase
      .from('ibu_documents')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) throw error

    return Response.json({ success: true, message: 'Belge başarıyla silindi' })
  } catch (err) {
    console.error(`Error deleting document ID ${params.id}:`, err)
    return Response.json(
      { error: 'Belge silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
