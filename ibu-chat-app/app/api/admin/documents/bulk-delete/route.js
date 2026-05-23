import { supabase } from '../../../../../lib/supabase'

export async function POST(req) {
  try {
    const { ids } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { error: 'Silinecek geçerli kimlikler (ID listesi) belirtilmelidir' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('ibu_documents')
      .delete()
      .in('id', ids)

    if (error) throw error

    return Response.json({ success: true, message: 'Seçilen belgeler başarıyla silindi' })
  } catch (err) {
    console.error('Error bulk deleting documents:', err)
    return Response.json(
      { error: 'Toplu silme işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
