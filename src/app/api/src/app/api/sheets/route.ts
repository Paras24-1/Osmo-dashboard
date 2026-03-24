import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')?.replace('+', '').replace(/\D/g, '') || ''

    const apiKey   = process.env.GOOGLE_SHEETS_API_KEY
    const sheetId  = process.env.GOOGLE_SHEET_ID
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1'

    if (!apiKey || !sheetId) {
      return NextResponse.json({ error: 'Missing Google Sheets config' }, { status: 500 })
    }

    // Fetch using sheet name in range
    const range = `${encodeURIComponent(sheetName)}!A:M`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
    
    console.log('[sheets] Fetching:', url)
    const res = await fetch(url)
    const data = await res.json()

    console.log('[sheets] Response:', JSON.stringify(data).slice(0, 300))

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    if (!data.values || data.values.length === 0) {
      return NextResponse.json({ error: 'No data in sheet' }, { status: 404 })
    }

    const headers: string[] = data.values[0]
    const rows = data.values.slice(1)

    console.log('[sheets] Headers:', headers)
    console.log('[sheets] Total rows:', rows.length)

    // Find phone column index
    const phoneIndex = headers.findIndex(
      (h: string) => h.toLowerCase().includes('phone')
    )

    console.log('[sheets] Phone column index:', phoneIndex)
    console.log('[sheets] Searching for phone:', phone)

    let matchedRow: string[] | null = null

    if (phoneIndex !== -1) {
      matchedRow = rows.find((row: string[]) => {
        const rowPhone = (row[phoneIndex] || '').replace(/\D/g, '')
        console.log('[sheets] Comparing:', rowPhone, 'vs', phone)
        return rowPhone === phone || 
               rowPhone.endsWith(phone) || 
               phone.endsWith(rowPhone)
      }) || null
    }

    if (!matchedRow) {
      return NextResponse.json({ error: 'No matching lead found' }, { status: 404 })
    }

    const lead: Record<string, string> = {}
    headers.forEach((header: string, i: number) => {
      lead[header] = matchedRow![i] || ''
    })

    return NextResponse.json(lead)
  } catch (err) {
    console.error('[sheets]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
