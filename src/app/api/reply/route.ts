import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ReplyPayload } from '@/types'

// POST /api/reply
// Called by the dashboard UI to send a manual operator reply
export async function POST(req: NextRequest) {
  try {
    const body: ReplyPayload = await req.json()
    const { conversation_id, phone_number, message } = body

    if (!conversation_id || !phone_number || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // 1. Save outgoing message to database
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id,
        phone_number,
        message,
        direction: 'outgoing',
        timestamp,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // 2. Update conversation last_message
    await supabaseAdmin
      .from('conversations')
      .update({ last_message: message, updated_at: timestamp })
      .eq('id', conversation_id)

    // 3. Forward to n8n — n8n will call WhatsApp Cloud API
    const n8nWebhookUrl = process.env.N8N_REPLY_WEBHOOK_URL
    if (n8nWebhookUrl) {
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          phone_number,
          message,
          direction: 'outgoing',
          timestamp,
        }),
      })

      if (!n8nRes.ok) {
        console.warn('[reply] n8n webhook call failed:', await n8nRes.text())
        // Don't fail the whole request — message is already saved
      }
    }

    return NextResponse.json({ success: true, message_id: msg.id })
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[reply]', error)
    return NextResponse.json({ error }, { status: 500 })
  }
}
