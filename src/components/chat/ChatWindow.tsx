'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Conversation, Message } from '@/types'
import { useMessages, useSendMessage, useToggleAI } from '@/hooks'
import { format } from 'date-fns'
import { Send, Bot, User, Phone, RefreshCw } from 'lucide-react'

interface Props {
  conversation: Conversation | null
  onAIToggle?: (conversationId: string, aiMode: boolean) => void
}

export default function ChatWindow({ conversation, onAIToggle }: Props) {
  const [input, setInput] = useState('')
  const [aiMode, setAiMode] = useState(conversation?.ai_mode ?? true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, loading, bottomRef } = useMessages(conversation?.id ?? null)
  const { sendMessage, sending } = useSendMessage()
  const { toggleAI } = useToggleAI()

  // Sync aiMode with conversation prop
  useEffect(() => {
    if (conversation) setAiMode(conversation.ai_mode)
  }, [conversation])

  const handleSend = async () => {
    if (!conversation || !input.trim() || sending) return
    const text = input.trim()
    setInput('')
    await sendMessage(conversation.id, conversation.phone_number, text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleToggleAI = async () => {
    if (!conversation) return
    const newMode = !aiMode
    setAiMode(newMode)
    await toggleAI(conversation.id, newMode)
    onAIToggle?.(conversation.id, newMode)
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Phone className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Select a conversation</p>
        <p className="text-sm text-gray-400 mt-1">Choose from the inbox to start monitoring</p>
      </div>
    )
  }

  const initials = conversation.name
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{conversation.name}</p>
          <p className="text-xs text-gray-500">{conversation.phone_number}</p>
        </div>

        {/* AI Toggle */}
        <button
          onClick={handleToggleAI}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            aiMode
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
          }`}
          title={aiMode ? 'AI is handling. Click to take over.' : 'You are in control. Click to enable AI.'}
        >
          {aiMode ? (
            <><Bot className="w-3.5 h-3.5" /> AI Mode ON</>
          ) : (
            <><User className="w-3.5 h-3.5" /> Human Mode</>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            <MessageGroups messages={messages} />
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shrink-0">
        {!aiMode && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mb-2 font-medium">
            <User className="w-3.5 h-3.5" />
            Human takeover active — you are replying directly
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-32 overflow-y-auto"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Group consecutive messages from same sender
function MessageGroups({ messages }: { messages: Message[] }) {
  const groups: Message[][] = []
  let currentGroup: Message[] = []

  for (const msg of messages) {
    if (currentGroup.length === 0 || currentGroup[0].direction === msg.direction) {
      currentGroup.push(msg)
    } else {
      groups.push(currentGroup)
      currentGroup = [msg]
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  return (
    <>
      {groups.map((group, gi) => (
        <MessageGroup key={gi} messages={group} />
      ))}
    </>
  )
}

function MessageGroup({ messages }: { messages: Message[] }) {
  const isOutgoing = messages[0].direction === 'outgoing'
  return (
    <div className={`flex flex-col gap-0.5 my-1 ${isOutgoing ? 'items-end' : 'items-start'}`}>
      {messages.map((msg, i) => (
        <MessageBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
      ))}
    </div>
  )
}

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isOutgoing = message.direction === 'outgoing'
  const time = format(new Date(message.timestamp), 'h:mm a')

  return (
    <div className={`max-w-[70%] flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
      <div className={`rounded-2xl overflow-hidden ${
        isOutgoing
          ? 'bg-emerald-500 text-white rounded-br-md'
          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-md'
      }`}>
        {/* Image message */}
        {message.media_url && message.media_type === 'image' && (
          <a href={message.media_url} target="_blank" rel="noopener noreferrer">
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-[260px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </a>
        )}

        {/* Document message */}
        {message.media_url && message.media_type === 'document' && (
          
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3.5 py-2 text-sm ${isOutgoing ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}
          >
            <span className="text-lg">📄</span>
            <span className="underline">View Document</span>
          </a>
        )}

        {/* Audio message */}
        {message.media_url && message.media_type === 'audio' && (
          <div className="px-3 py-2">
            <audio controls className="max-w-[220px] h-8">
              <source src={message.media_url} />
            </audio>
          </div>
        )}

        {/* Text message */}
        {message.message && !(message.media_type && !message.message.startsWith('[')) && (
          <p className="px-3.5 py-2 text-sm leading-relaxed break-words">
            {message.message}
          </p>
        )}
      </div>

      {isLast && (
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{time}</span>
      )}
    </div>
  )
}
