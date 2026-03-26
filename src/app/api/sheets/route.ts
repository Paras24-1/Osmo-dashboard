import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawPhone = searchParams.get('phone') || ''
    const phone = rawPhone.replace(/\D/g, '').slice(-10)

    const apiKey    = process.env.GOOGLE_SHEETS_API_KEY
    const sheetId   = process.env.GOOGLE_SHEET_ID
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'LEADS'

    if (!apiKey || !sheetId) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 })
    }

    const range = `${encodeURIComponent(sheetName)}!A:Z`
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`

    const res  = await fetch(url)
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    if (!data.values || data.values.length < 2) {
      return NextResponse.json({ error: 'No data in sheet' }, { status: 404 })
    }

    const headers: string[] = data.values[0]
    const rows: string[][]  = data.values.slice(1)

    const phoneIndex = headers.findIndex(
      (h) => h.toLowerCase().includes('phone')
    )

    const matchedRow = rows.find((row) => {
      const rowPhone = (row[phoneIndex] || '').replace(/\D/g, '').slice(-10)
      return rowPhone === phone
    })

    if (!matchedRow) {
      return NextResponse.json({ error: 'No matching lead found' }, { status: 404 })
    }

    const lead: Record<string, string> = {}
    headers.forEach((header, i) => {
      lead[header] = matchedRow[i] || ''
    })

    return NextResponse.json(lead)

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
