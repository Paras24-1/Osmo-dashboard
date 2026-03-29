import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone_number, message, direction, name, media_url, media_type } = body

    if (!phone_number || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const contactName = name || phone_number
    const timestamp   = new Date()
    const msgText     = message || (media_type ? `[${media_type}]` : '')

    // 1. Upsert conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .upsert(
        { phone_number, name: contactName, last_message: msgText, updated_at: new Date().toISOString() },
        { onConflict: 'phone_number' }
      )
      .select()
      .single()

    if (convError) throw convError

    // 2. Insert message with media fields
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        phone_number,
        message: msgText,
        direction,
        timestamp: timestamp.toISOString(),
        media_url:  media_url  || null,
        media_type: media_type || null,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // 3. Upsert lead
    await supabaseAdmin
      .from('leads')
      .upsert(
        { conversation_id: conversation.id, phone_number, name: contactName },
        { onConflict: 'conversation_id' }
      )

    return NextResponse.json({ success: true, conversation_id: conversation.id, message_id: msg.id })

  } catch (err) {
    console.error('[webhook]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
