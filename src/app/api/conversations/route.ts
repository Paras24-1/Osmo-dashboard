import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/conversations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const stage  = searchParams.get('stage')  || ''
    const unread = searchParams.get('unread') === 'true'

    let query = supabaseAdmin
      .from('conversations')
      .select('*, lead:leads(*)')
      .order('updated_at', { ascending: false })

    if (search) {
      query = query.or(
        `phone_number.ilike.%${search}%,name.ilike.%${search}%`
      )
    }
    if (stage) {
      query = query.eq('stage', stage)
    }
    if (unread) {
      query = query.gt('unread_count', 0)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error }, { status: 500 })
  }
}
