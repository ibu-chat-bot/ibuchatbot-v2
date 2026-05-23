import { supabase } from '../../../../lib/supabase'
import { openai } from '../../../../lib/openai'

// Batch embedding generation helper (with short delay for rate limits)
async function generateEmbeddings(texts, batchSize = 20) {
  const embeddings = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    embeddings.push(...res.data.map(d => d.embedding))
    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  return embeddings
}

export async function POST(req) {
  try {
    const { entries, clearExisting } = await req.json()

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return Response.json(
        { error: 'Yüklenecek veri listesi (entries) boş olamaz' },
        { status: 400 }
      )
    }

    console.log(`Starting bulk embedding sync for ${entries.length} records...`)

    // 1. Optionally clear existing documents
    if (clearExisting) {
      console.log('Clearing existing documents as requested...')
      const { error: deleteError } = await supabase
        .from('ibu_documents')
        .delete()
        .neq('id', 0) // delete all
      
      if (deleteError) throw deleteError
    }

    // 2. Prepare texts for embedding
    const textsToEmbed = entries.map(e => `${e.question.trim()}\n${e.answer.trim()}`)

    // 3. Generate embeddings
    console.log('Generating batch embeddings...')
    const embeddings = await generateEmbeddings(textsToEmbed)

    // 4. Map entries to rows with embeddings
    const rows = entries.map((e, i) => ({
      question: e.question.trim(),
      answer: e.answer.trim(),
      category: e.category || 'genel',
      language: e.language || 'tr',
      embedding: embeddings[i],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // 5. Bulk insert rows in chunks of 50
    console.log('Inserting embedded records into database...')
    const CHUNK_SIZE = 50
    let insertedCount = 0

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const { error } = await supabase.from('ibu_documents').insert(chunk)
      if (error) throw error
      insertedCount += chunk.length
    }

    console.log(`Successfully synced ${insertedCount} documents!`)

    return Response.json({
      success: true,
      inserted: insertedCount,
      failed: 0,
      errors: [],
    })
  } catch (err) {
    console.error('Error syncing embeddings:', err)
    return Response.json(
      { error: 'Embedding senkronizasyonu sırasında bir hata oluştu: ' + err.message },
      { status: 500 }
    )
  }
}
