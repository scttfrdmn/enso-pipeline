'use client'
import { useState, useEffect, useCallback } from 'react'
import Ably from 'ably'
import type { Opportunity } from '@/lib/db/schema'

export function usePipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial fetch
  useEffect(() => {
    fetch('/api/opportunities')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setOpportunities(data); setLoading(false) })
      .catch(() => {
        setError('Failed to load opportunities. Refresh to retry.')
        setLoading(false)
      })
  }, [])

  // Ably real-time subscription
  useEffect(() => {
    let ably: Ably.Realtime
    async function connect() {
      ably = new Ably.Realtime({ authUrl: '/api/ably-token' })
      const channel = ably.channels.get('pipeline')
      channel.subscribe('opportunity:created', msg => {
        setOpportunities(prev => [msg.data, ...prev])
      })
      channel.subscribe('opportunity:updated', msg => {
        setOpportunities(prev => prev.map(o => o.id === msg.data.id ? msg.data : o))
      })
      channel.subscribe('opportunity:deleted', msg => {
        setOpportunities(prev => prev.filter(o => o.id !== msg.data.id))
      })
    }
    connect()
    return () => ably?.close()
  }, [])

  const createOpportunity = useCallback(async (data: Partial<Opportunity>) => {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  const updateOpportunity = useCallback(async (id: string, data: Partial<Opportunity>) => {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  const deleteOpportunity = useCallback(async (id: string) => {
    const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }, [])

  return { opportunities, loading, error, createOpportunity, updateOpportunity, deleteOpportunity }
}
