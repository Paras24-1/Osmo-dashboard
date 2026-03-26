'use client'

import { useState, useEffect } from 'react'
import { Conversation, Lead, Stage } from '@/types'
import {
  Phone, User, Calendar, FileText,
  ChevronDown, ChevronUp, RefreshCw, Mail,
  MapPin, Star, PhoneCall, Tag
} from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  new:        'bg-gray-200 text-gray-700',
  interested: 'bg-blue-200 text-blue-800',
  booking:    'bg-amber-200 text-amber-800',
  confirmed:  'bg-green-200 text-green-800',
  cancelled:  'bg-red-200 text-red-800',
  completed:  'bg-purple-200 text-purple-800',
}

const QUALITY_COLORS: Record<string, string> = {
  hot:    'bg-red-100 text-red-700',
  warm:   'bg-amber-100 text-amber-700',
  cold:   'bg-blue-100 text-blue-700',
  dead:   'bg-gray-100 text-gray-500',
}

interface SheetData {
  Phone?: string
  Name?: string
  Lead_Type?: string
  Pincode?: string
  Budget?: string
  Lead_Quality?: string
  Callback_Ready?: string
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
  const [open, setOpen]           = useState({ contact: true, lead: true, summary: true })

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

  const quality = sheetData?.Lead_Quality?.toLowerCase() || ''
  const callbackReady = sheetData?.Callback_Ready?.toLowerCase()

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

        {/* Lead Quality Badge */}
        {quality && (
          <span className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${QUALITY_COLORS[quality] || 'bg-gray-100 text-gray-600'}`}>
            {quality} lead
          </span>
        )}

        {/* Callback Ready Badge */}
        {callbackReady === 'yes' && (
          <span className="inline-block mt-2 ml-2 text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
            ✓ Callback Ready
          </span>
        )}

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
        <Field label="Pincode" icon={<MapPin className="w-3.5 h-3.5" />}>
          {sheetData?.Pincode || '—'}
        </Field>
      </Section>

      {/* Lead Details Section */}
      <Section
        title="Lead Details"
        icon={<Tag className="w-3.5 h-3.5" />}
        open={open.lead}
        onToggle={() => toggle('lead')}
      >
        <Field label="Lead Type" icon={<Tag className="w-3.5 h-3.5" />}>
          {sheetData?.Lead_Type || '—'}
        </Field>
        <Field label="Budget" icon={<FileText className="w-3.5 h-3.5" />}>
          {sheetData?.Budget || '—'}
        </Field>
        <Field label="Lead Quality" icon={<Star className="w-3.5 h-3.5" />}>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${QUALITY_COLORS[quality] || 'bg-gray-100 text-gray-600'}`}>
            {sheetData?.Lead_Quality || '—'}
          </span>
        </Field>
        <Field label="Callback Ready" icon={<PhoneCall className="w-3.5 h-3.5" />}>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            callbackReady === 'yes'
              ? 'bg-green-100 text-green-700'
              : callbackReady === 'no'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {sheetData?.Callback_Ready || '—'}
          </span>
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
          {sheetData?.['summary'] || sheetData?.['CHAT SUMMARY'] || 'No summary yet.'}
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
