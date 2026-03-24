'use client'

import { useState, useEffect } from 'react'
import { Conversation, Lead, Stage } from '@/types'
import {
  Phone, User, Calendar, Bed, Users,
  FileText, ChevronDown, ChevronUp, RefreshCw, Mail
} from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  new:        'bg-gray-200 text-gray-700',
  interested: 'bg-blue-200 text-blue-800',
  booking:    'bg-amber-200 text-amber-800',
  confirmed:  'bg-green-200 text-green-800',
  cancelled:  'bg-red-200 text-red-800',
  completed:  'bg-purple-200 text-purple-800',
}

interface SheetData {
  Phone?: string
  Name?: string
  Email?: string
  Checkin?: string
  Checkout?: string
  Guests?: string
  Room_Type?: string
  Stage?: string
  Last_Message?: string
  Updated?: string
  'CHAT SUMMARY'?: string
  [key: string]: string | undefined
}

interface Props {
  conversation: Conversation | null
  lead: Lead | null
  onLeadUpdate?: (updates: Partial<Lead>) => void
}

export default function LeadPanel({ conversation, lead, onLeadUpdate }: Props) {
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [open, setOpen]           = useState({ contact: true, booking: true, summary: true })

  const fetchSheetData = async () => {
    if (!conversation?.phone_number) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sheets?phone=${encodeURIComponent(conversation.phone_number)}`)
      if (res.ok) {
        const data = await res.json()
        setSheetData(data)
      } else {
        setError('No lead found in Google Sheets')
        setSheetData(null)
      }
    } catch {
      setError('Failed to fetch sheet data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (conversation) {
      setSheetData(null)
      fetchSheetData()
    }
  }, [conversation?.id])

  const toggle = (key: keyof typeof open) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  if (!conversation) {
    return (
      <aside className="h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-400">No conversation selected</p>
      </aside>
    )
  }

  const stage = sheetData?.Stage || lead?.stage || 'new'

  return (
    <aside className="h-full flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Lead Info</h2>
          <button
            onClick={fetchSheetData}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 px-2 py-1 rounded-lg"
            title="Refresh from Google Sheets"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stage badge */}
        <span className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[stage.toLowerCase()] || STAGE_COLORS.new}`}>
          {stage.charAt(0).toUpperCase() + stage.slice(1)}
        </span>

        {/* Source indicator */}
        {sheetData ? (
          <p className="text-[10px] text-emerald-600 mt-1">● Live from Google Sheets</p>
        ) : error ? (
          <p className="text-[10px] text-red-400 mt-1">{error}</p>
        ) : loading ? (
          <p className="text-[10px] text-gray-400 mt-1">Fetching from Google Sheets...</p>
        ) : null}
      </div>

      {/* Contact Section */}
      <Section
        title="Contact"
        icon={<User className="w-3.5 h-3.5" />}
        open={open.contact}
        onToggle={() => toggle('contact')}
      >
        <Field label="Name" icon={<User className="w-3.5 h-3.5" />}>
          {sheetData?.Name || conversation.name || '—'}
        </Field>
        <Field label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
          <span className="font-mono">{sheetData?.Phone || conversation.phone_number}</span>
        </Field>
        <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
          {sheetData?.Email || '—'}
        </Field>
      </Section>

      {/* Booking Section */}
      <Section
        title="Booking"
        icon={<Calendar className="w-3.5 h-3.5" />}
        open={open.booking}
        onToggle={() => toggle('booking')}
      >
        <Field label="Check-in" icon={<Calendar className="w-3.5 h-3.5" />}>
          {sheetData?.Checkin || '—'}
        </Field>
        <Field label="Check-out" icon={<Calendar className="w-3.5 h-3.5" />}>
          {sheetData?.Checkout || '—'}
        </Field>
        <Field label="Room Type" icon={<Bed className="w-3.5 h-3.5" />}>
          {sheetData?.Room_Type || '—'}
        </Field>
        <Field label="Guests" icon={<Users className="w-3.5 h-3.5" />}>
          {sheetData?.Guests || '—'}
        </Field>
        <Field label="Last Updated" icon={<Calendar className="w-3.5 h-3.5" />}>
          {sheetData?.Updated || '—'}
        </Field>
      </Section>

      {/* Chat Summary Section */}
      <Section
        title="Chat Summary"
        icon={<FileText className="w-3.5 h-3.5" />}
        open={open.summary}
        onToggle={() => toggle('summary')}
      >
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
          {sheetData?.['CHAT SUMMARY'] || sheetData?.Last_Message || 'No summary yet.'}
        </p>
      </Section>
    </aside>
  )
}

function Section({ title, icon, open, onToggle, children }: {
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        <span className="flex items-center gap-1.5">{icon}{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-2.5">{children}</div>}
    </div>
  )
}

function Field({ label, icon, children }: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5 text-gray-400">
        {icon}
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-xs text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  )
}
