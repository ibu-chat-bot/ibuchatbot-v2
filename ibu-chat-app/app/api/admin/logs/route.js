import { supabase } from '../../../../lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const language = searchParams.get('language') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const simMin = parseFloat(searchParams.get('simMin') || '0.0')
    const simMax = parseFloat(searchParams.get('simMax') || '1.0')

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('ibu_chat_logs')
      .select('*', { count: 'exact' })

    // Apply text search
    if (search) {
      query = query.or(`user_message.ilike.%${search}%,bot_response.ilike.%${search}%`)
    }

    // Apply language filter
    if (language && language !== 'all' && language !== 'Tümü') {
      query = query.eq('language', language)
    }

    // Apply date range
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    }

    // Apply similarity filters
    if (simMin > 0.0) {
      query = query.gte('similarity', simMin)
    }
    if (simMax < 1.0) {
      query = query.lte('similarity', simMax)
    }

    // Sort logs by time (newest first)
    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    return Response.json({
      logs: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('Error fetching logs:', err)
    return Response.json(
      { error: 'Log kayıtları çekilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
