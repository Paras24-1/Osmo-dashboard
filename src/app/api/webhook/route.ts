import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone_number, message, direction } = body

    if (!phone_number || !message || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const name = body.name || phone_number
    const timestamp = new Date()

    // Step 1: Upsert conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .upsert(
        { phone_number, name, last_message: message, updated_at: new Date().toISOString() },
        { onConflict: 'phone_number' }
      )
      .select()
      .single()

    if (convError) {
      console.error('[webhook] Conversation error:', JSON.stringify(convError))
      return NextResponse.json({ error: 'Conversation failed', details: convError }, { status: 500 })
    }

    // Step 2: Insert message
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        phone_number,
        message,
        direction,
        timestamp: timestamp.toISOString(),
      })
      .select()
      .single()

    if (msgError) {
      console.error('[webhook] Message error:', JSON.stringify(msgError))
      return NextResponse.json({ error: 'Message failed', details: msgError }, { status: 500 })
    }

    // Step 3: Upsert lead
    await supabaseAdmin
      .from('leads')
      .upsert(
        { conversation_id: conversation.id, phone_number, name },
        { onConflict: 'conversation_id' }
      )

    return NextResponse.json({ success: true, conversation_id: conversation.id, message_id: msg.id })

  } catch (err) {
    console.error('[webhook] Caught exception:', JSON.stringify(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
