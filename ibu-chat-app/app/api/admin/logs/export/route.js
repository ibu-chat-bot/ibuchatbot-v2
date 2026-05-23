import { supabase } from '../../../../../lib/supabase'
import { React } from 'react'
import { Document, Page, Text, View, StyleSheet, renderToStream } from '@react-pdf/renderer'

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a3a6b',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: '#c8a951',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    fontSize: 9,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a6b',
    marginBottom: 10,
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  statLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a3a6b',
  },
  logRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid',
    marginBottom: 5,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 8,
    color: '#64748b',
  },
  logText: {
    fontSize: 9,
    marginBottom: 4,
  },
  botText: {
    fontSize: 9,
    color: '#475569',
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#c8a951',
    borderLeftStyle: 'solid',
  },
})

// Create PDF document component
const ReportDocument = ({ logs, stats, dateRange }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Uluslararası Balkan Üniversitesi</Text>
        <Text style={styles.subtitle}>Chatbot Analitik & Performans Raporu</Text>
        <View style={styles.meta}>
          <Text>Rapor Dönemi: {dateRange}</Text>
          <Text>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <Text style={styles.sectionTitle}>Özet İstatistikler</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Toplam Soru</Text>
          <Text style={styles.statValue}>{stats.totalCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Yanıtlanma Oranı</Text>
          <Text style={styles.statValue}>%{stats.answeredRate}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Dil Dağılımı</Text>
          <Text style={styles.statValue}>TR: {stats.languageSplit.tr} | EN: {stats.languageSplit.en}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Ort. Similarity</Text>
          <Text style={styles.statValue}>{stats.avgSimilarity}</Text>
        </View>
      </View>

      {/* Logs list */}
      <Text style={styles.sectionTitle}>Son Konuşma Logları (Maks. 50)</Text>
      {logs.slice(0, 50).map((log, idx) => (
        <View key={idx} style={styles.logRow} wrap={false}>
          <View style={styles.logMeta}>
            <Text>Tarih: {new Date(log.created_at).toLocaleString('tr-TR')}</Text>
            <Text>Dil: {(log.language || 'tr').toUpperCase()} | Similarity: {(log.similarity !== undefined ? log.similarity : log.similarity_score !== undefined ? log.similarity_score : 0).toFixed(2)}</Text>
          </View>
          <Text style={styles.logText}>Kullanıcı: {log.user_message}</Text>
          <Text style={styles.botText}>Bot: {log.bot_response ? log.bot_response.substring(0, 150) + (log.bot_response.length > 150 ? '...' : '') : 'Yanıt yok'}</Text>
        </View>
      ))}
    </Page>
  </Document>
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const language = searchParams.get('language') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const simMin = parseFloat(searchParams.get('simMin') || '0.0')
    const simMax = parseFloat(searchParams.get('simMax') || '1.0')

    // 1. Fetch filtered logs for table
    let query = supabase.from('ibu_chat_logs').select('*')
    if (search) query = query.or(`user_message.ilike.%${search}%,bot_response.ilike.%${search}%`)
    if (language && language !== 'all') query = query.eq('language', language)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    if (simMin > 0.0) query = query.gte('similarity', simMin)
    if (simMax < 1.0) query = query.lte('similarity', simMax)
    query = query.order('created_at', { ascending: false }).limit(100)

    const { data: logs, error: logsError } = await query
    if (logsError) throw logsError

    // 2. Compute filtered stats
    const totalCount = logs.length
    let trCount = 0, enCount = 0, answeredCount = 0, totalSim = 0
    logs.forEach(l => {
      if (l.language === 'tr') trCount++
      else enCount++
      const score = (l.similarity !== undefined ? l.similarity : l.similarity_score !== undefined ? l.similarity_score : 0)
      if (score >= 0.55) answeredCount++
      totalSim += score
    })

    const stats = {
      totalCount,
      answeredRate: totalCount > 0 ? ((answeredCount / totalCount) * 100).toFixed(1) : '0',
      languageSplit: { tr: trCount, en: enCount },
      avgSimilarity: totalCount > 0 ? (totalSim / totalCount).toFixed(3) : '0.000',
    }

    const dateRange = (dateFrom && dateTo) ? `${dateFrom} - ${dateTo}` : 'Tüm Zamanlar'

    // 3. Render PDF document to stream
    console.log('Rendering PDF report stream...')
    const stream = await renderToStream(
      <ReportDocument logs={logs} stats={stats} dateRange={dateRange} />
    )

    // 4. Return binary stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ibu_chatbot_report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Error generating PDF report:', err)
    return Response.json(
      { error: 'PDF Raporu üretilirken bir hata oluştu: ' + err.message },
      { status: 500 }
    )
  }
}
