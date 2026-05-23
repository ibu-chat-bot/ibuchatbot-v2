import { supabase } from '../../../../../lib/supabase'

export async function GET(req) {
  try {
    const { data: logs, error } = await supabase
      .from('ibu_chat_logs')
      .select('language, similarity_score, created_at')

    if (error) throw error

    const totalCount = logs.length
    if (totalCount === 0) {
      return Response.json({
        totalCount: 0,
        answeredRate: 0,
        languageSplit: { tr: 0, en: 0 },
        avgSimilarity: 0,
        topCategory: 'genel',
        peakDay: { date: '-', count: 0 }
      })
    }

    let trCount = 0
    let enCount = 0
    let answeredCount = 0
    let totalSimilarity = 0

    const dailyCounts = {}

    logs.forEach(log => {
      // 1. Language Split
      const lang = (log.language || 'tr').toLowerCase()
      if (lang === 'tr') trCount++
      else if (lang === 'en') enCount++

      // 2. Answered Count (similarity >= 0.55 is answered in practice)
      if (log.similarity_score >= 0.55) answeredCount++

      // 3. Average Similarity
      totalSimilarity += log.similarity_score || 0

      // 4. Daily Active Counts
      try {
        const dateStr = new Date(log.created_at).toISOString().split('T')[0]
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1
      } catch (e) {
        // ignore date formatting failures
      }
    })

    // Find peak day
    let peakDayStr = ''
    let peakDayCount = 0
    Object.entries(dailyCounts).forEach(([date, count]) => {
      if (count > peakDayCount) {
        peakDayCount = count
        peakDayStr = date
      }
    })

    const answeredRate = totalCount > 0 ? parseFloat(((answeredCount / totalCount) * 100).toFixed(1)) : 0
    const avgSimilarity = totalCount > 0 ? parseFloat((totalSimilarity / totalCount).toFixed(3)) : 0

    return Response.json({
      totalCount,
      answeredRate,
      languageSplit: { tr: trCount, en: enCount },
      avgSimilarity,
      peakDay: { date: peakDayStr, count: peakDayCount },
      topCategory: 'kayit', // default popular category
    })
  } catch (err) {
    console.error('Error compiling analytics stats:', err)
    return Response.json(
      { error: 'İstatistikler derlenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
