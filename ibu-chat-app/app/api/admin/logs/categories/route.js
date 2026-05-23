import { supabase } from '../../../../../lib/supabase'

export async function GET() {
  try {
    // Fetch logs with matched_id
    const { data: logs, error } = await supabase
      .from('ibu_chat_logs')
      .select('matched_id')

    if (error) throw error

    // Fetch documents to map matched_id -> category
    const { data: docs, error: docsError } = await supabase
      .from('ibu_documents')
      .select('id, category')

    if (docsError) throw docsError

    // Build map of docId -> category
    const docCategoryMap = {}
    docs.forEach(d => {
      docCategoryMap[d.id] = d.category
    })

    // Aggregate category counts
    const categoryCounts = {
      genel: 0,
      kayit: 0,
      burs: 0,
      yurt: 0,
      akademik: 0,
      iletisim: 0,
    }

    let totalMatched = 0

    logs.forEach(log => {
      if (log.matched_id && log.matched_id in docCategoryMap) {
        const cat = docCategoryMap[log.matched_id]
        if (cat in categoryCounts) {
          categoryCounts[cat]++
          totalMatched++
        } else {
          categoryCounts['genel']++
          totalMatched++
        }
      } else {
        // Fallback or un-matched queries
        categoryCounts['genel']++
        totalMatched++
      }
    })

    // Format for Recharts PieChart [{name: 'Kayit', value: 5}]
    const chartData = Object.entries(categoryCounts).map(([name, value]) => {
      const displayNames = {
        genel: 'Genel',
        kayit: 'Kayıt İşlemleri',
        burs: 'Burs Başvuruları',
        yurt: 'Yurt / Konaklama',
        akademik: 'Akademik Bilgiler',
        iletisim: 'İletişim / Ulaşım'
      }
      
      return {
        name: displayNames[name] || name,
        value,
        percentage: totalMatched > 0 ? parseFloat(((value / totalMatched) * 100).toFixed(1)) : 0
      }
    }).filter(item => item.value > 0)

    return Response.json({ data: chartData })
  } catch (err) {
    console.error('Error fetching categories stats:', err)
    return Response.json(
      { error: 'Kategori istatistikleri yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}
