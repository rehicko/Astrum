// app/crossroads/Chat.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ChatRow = {
  id: string
  body: string
  created_at: string
  channel_id: string
  channel_slug: string
  user_id: string
  username: string | null
  character_name: string | null
  class_name: string | null
  level: number | null
}

export default function Chat({ channelSlug }: { channelSlug: string }) {
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  // ---------- helpers ----------
  const upsertMessages = (rows: ChatRow | ChatRow[]) => {
    setMessages(prev => {
      const add = Array.isArray(rows) ? rows : [rows]
      const seen = new Set(prev.map(m => m.id))
      const merged = [...prev]
      for (const r of add) {
        if (!seen.has(r.id)) {
          merged.push(r)
          seen.add(r.id)
        }
      }
      // keep chronological
      merged.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      return merged
    })
    // scroll down after paint
    setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current!.scrollHeight,
        behavior: 'smooth',
      })
    }, 40)
  }

  // ---------- Auth ----------
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id ?? null)
      setLoading(false)
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ---------- Initial load ----------
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('v_chat_messages')
        .select('*')
        .eq('channel_slug', channelSlug)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        console.error('[load] v_chat_messages error:', error.message)
        return
      }
      if (data) upsertMessages(data as ChatRow[])
    }
    load()
  }, [channelSlug])

  // ---------- Realtime (filtered to channel) ----------
  useEffect(() => {
    let active = true
    let sub: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: ch, error: chErr } = await supabase
        .from('v_channels')
        .select('id')
        .eq('slug', channelSlug)
        .single()

      if (chErr || !ch?.id) {
        console.error('[realtime] channel lookup failed:', chErr?.message)
        return
      }

      sub = supabase
        .channel(`chat:${channelSlug}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${ch.id}`,
          },
          async (payload) => {
            const insertedId = (payload.new as any).id
            const { data, error } = await supabase
              .from('v_chat_messages')
              .select('*')
              .eq('id', insertedId)
              .single()
            if (!active || error || !data) return
            upsertMessages(data as ChatRow)
          }
        )
        .subscribe((status) => {
          console.log('[realtime] channel status:', status)
        })
    })()

    return () => {
      active = false
      if (sub) supabase.removeChannel(sub)
    }
  }, [channelSlug])

  // ---------- Send (optimistic) ----------
  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (!userId) {
      alert('Sign in first (use your Supabase test account).')
      return
    }

    const { data: ch, error: chErr } = await supabase
      .from('v_channels')
      .select('id')
      .eq('slug', channelSlug)
      .single()
    if (chErr || !ch?.id) return alert('Channel not found.')

    const { data: inserted, error } = await supabase
      .from('chat_messages')
      .insert({ channel_id: ch.id, user_id: userId, body: trimmed })
      .select('id')
      .single()
    if (error) return alert(error.message)

    setInput('')

    if (inserted?.id) {
      const { data: joined } = await supabase
        .from('v_chat_messages')
        .select('*')
        .eq('id', inserted.id)
        .single()
      if (joined) upsertMessages(joined as ChatRow)
    }
  }

  // ---------- Auth UI ----------
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') || '')
    const password = String(fd.get('password') || '')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Auth bar */}
      <div className="flex items-center justify-between border border-neutral-800 rounded-lg p-3">
        {userId ? (
          <div className="text-sm text-neutral-400">
            Signed in • <button onClick={handleSignOut} className="underline">Sign out</button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="flex flex-wrap items-center gap-2">
            <input name="email" type="email" placeholder="email"
              className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" required />
            <input name="password" type="password" placeholder="password"
              className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" required />
            <button type="submit" className="bg-white/10 hover:bg-white/20 transition rounded px-3 py-1 text-sm">
              Sign in
            </button>
          </form>
        )}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="border border-neutral-800 rounded-xl p-4 h-[65vh] overflow-y-auto bg-neutral-950"
      >
        {loading && <div className="text-neutral-400 text-sm">Loading…</div>}
        {messages.map(m => (
          <div key={m.id} className="text-sm mb-2">
            <span className="text-neutral-500 mr-2">
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="font-semibold text-neutral-300">
              {m.character_name ?? m.username ?? 'user'}
            </span>
            <span className="text-neutral-500">:</span>{' '}
            <span className="text-neutral-200">{m.body}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
        >
          Send
        </button>
      </div>
    </div>
  )
}
