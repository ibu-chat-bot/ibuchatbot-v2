import { supabase } from '../../../../lib/supabase'

const DEFAULT_SETTINGS = {
  match_threshold: '0.60',
  fallback_threshold: '0.50',
  max_tokens: '600',
  gpt_model: 'gpt-4o',
  temperature: '0.3',
  system_prompt_tr: 'Sen Uluslararası Balkan Üniversitesi (IBU) için resmi bir AI chatbot asistanısın. Görevin, aday öğrencilere ve mevcut öğrencilere kayıt işlemleri, burs imkanları, yurt konaklama, akademik programlar ve okul iletişim detayları hakkında bilgi sağlamaktır. Kibar, profesyonel ve kısa yanıtlar ver. Bilmediğin konularda doğrudan sallama yapma, "Bu konuda detaylı bilgiye sahip değilim, lütfen IBU Öğrenci İşleri ile iletişime geçiniz." de.',
  system_prompt_en: 'You are the official AI chatbot assistant for International Balkan University (IBU). Your duty is to provide prospective and current students with accurate information regarding enrollment, scholarships, accommodation, academic programs, and contact details. Give helpful, polite, professional, and concise answers. If you do not know the answer, do not guess; instead, politely guide them to contact the IBU Student Affairs Office.',
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('ibu_settings').select('*')

    // If table doesn't exist or has no records, return defaults
    if (error || !data || data.length === 0) {
      console.warn('ibu_settings table not initialized or empty. Using default configurations.')
      return Response.json(DEFAULT_SETTINGS)
    }

    // Convert list of key-value rows to single object
    const settings = {}
    data.forEach(row => {
      settings[row.key] = row.value
    })

    // Merge in case some default fields are missing in the DB
    return Response.json({ ...DEFAULT_SETTINGS, ...settings })
  } catch (err) {
    console.error('Error fetching settings:', err)
    return Response.json(DEFAULT_SETTINGS) // safe fallback
  }
}

export async function POST(req) {
  try {
    const updated = await req.json()

    // Validate body keys
    const keys = Object.keys(DEFAULT_SETTINGS)
    const rows = []

    for (const key of keys) {
      if (updated[key] !== undefined) {
        rows.push({
          key,
          value: String(updated[key]).trim(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (rows.length === 0) {
      return Response.json(
        { error: 'Güncellenecek geçerli bir ayar parametresi bulunamadı.' },
        { status: 400 }
      )
    }

    // Bulk upsert rows in Supabase
    const { error } = await supabase
      .from('ibu_settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) throw error

    return Response.json({ success: true, message: 'Ayarlar başarıyla güncellendi' })
  } catch (err) {
    console.error('Error saving settings:', err)
    return Response.json(
      { error: 'Ayarlar veritabanına kaydedilirken bir hata oluştu: ' + err.message },
      { status: 500 }
    )
  }
}
