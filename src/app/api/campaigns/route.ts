import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/campaigns — list all campaigns
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/campaigns — create new campaign and start sending
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      name,
      template_name,
      template_body,
      language_code,
      header_image_url,
      contacts,
      scheduled_at,
    } = body

    // Validation
    if (!name || !template_name || !contacts?.length) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, template_name, contacts',
        },
        { status: 400 }
      )
    }

    // Fetch all blocked conversations
    const { data: blockedConvs, error: blockedError } = await supabaseAdmin
      .from('conversations')
      .select('phone_number')
      .eq('is_blocked', true)

    if (blockedError) throw blockedError

    const blockedSet = new Set(
      (blockedConvs || []).map((c) => c.phone_number.replace(/\D/g, '').slice(-10))
    )

    // Filter out blocked numbers
    const filteredContacts = contacts.filter((c: { phone: string }) => {
      const normPhone = c.phone.replace(/\D/g, '').slice(-10)
      return !blockedSet.has(normPhone)
    })

    if (filteredContacts.length === 0) {
      return NextResponse.json(
        { error: 'All contacts in the campaign list are currently blocked.' },
        { status: 400 }
      )
    }

    // 1. Create campaign
    const { data: campaign, error: campError } =
      await supabaseAdmin
        .from('campaigns')
        .insert({
          name,
          template_name,
          template_body,

          // NEW FIELDS
          language_code: language_code || 'en',
          header_image_url: header_image_url || '',

          total: filteredContacts.length,
          status: scheduled_at ? 'draft' : 'sending',
          scheduled_at: scheduled_at || null,
          started_at: scheduled_at
            ? null
            : new Date().toISOString(),
        })
        .select()
        .single()

    if (campError) throw campError

    // 2. Insert all contacts
    const contactRows = filteredContacts.map(
      (c: {
        phone: string
        name?: string
        variables?: Record<string, string>
      }) => ({
        campaign_id: campaign.id,
        phone: c.phone,
        name: c.name || '',
        variables: c.variables || {},
        status: 'pending',
      })
    )

    const { error: contactError } = await supabaseAdmin
      .from('campaign_contacts')
      .insert(contactRows)

    if (contactError) throw contactError

    // 3. Trigger n8n webhook if immediate sending
    if (!scheduled_at) {
      const n8nUrl = process.env.N8N_BULK_WEBHOOK_URL

      if (n8nUrl) {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            campaign_id: campaign.id,

            template_name,

            language_code:
              language_code || 'en',

            header_image_url:
              header_image_url || '',

            contacts: filteredContacts,
          }),
        }).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
