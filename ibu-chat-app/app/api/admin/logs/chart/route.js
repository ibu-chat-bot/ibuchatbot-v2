import { supabase } from '../../../../../lib/supabase'

export async function GET() {
  try {
    // Fetch logs from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: logs, error } = await supabase
      .from('ibu_chat_logs')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) throw error

    // Group counts by date
    const dailyCounts = {}
    
    // Initialize last 30 days with 0 counts so chart has no gaps
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dailyCounts[dateStr] = 0
    }

    logs.forEach(log => {
      try {
        const dateStr = new Date(log.created_at).toISOString().split('T')[0]
        if (dateStr in dailyCounts) {
          dailyCounts[dateStr]++
        }
      } catch (e) {
        // ignore date parse errors
      }
    })

    // Map to recharts friendly array format [{date: '2026-05-20', count: 5}]
    const chartData = Object.entries(dailyCounts).map(([date, count]) => {
      // Format to Turkish readable date like "20 May"
      const [, m, d] = date.split('-')
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
      const formattedDate = `${parseInt(d)} ${months[parseInt(m) - 1]}`
      
      return {
        date: formattedDate,
        fullDate: date,
        Soru: count,
      }
    })

    return Response.json({ data: chartData })
  } catch (err) {
    console.error('Error generating chart data:', err)
    return Response.json(
      { error: 'Grafik verisi yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}
