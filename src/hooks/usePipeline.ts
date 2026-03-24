'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Ably from 'ably'
import type { Opportunity } from '@/lib/db/schema'

export type Notification = {
  id: string
  type: 'created' | 'updated'
  companyName: string
  opportunityId: string
  detail: string
  timestamp: string
  read: boolean
}

export function usePipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  // Track IDs of updates triggered locally so we don't self-notify
  const localMutations = useRef<Set<string>>(new Set())

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
        if (!localMutations.current.has(msg.data.id)) {
          setNotifications(prev => [{
            id: Math.random().toString(36).slice(2),
            type: 'created',
            companyName: msg.data.companyName,
            opportunityId: msg.data.id,
            detail: `New opportunity: ${msg.data.companyName}`,
            timestamp: new Date().toISOString(),
            read: false,
          }, ...prev.slice(0, 49)])
        }
      })
      channel.subscribe('opportunity:updated', msg => {
        setOpportunities(prev => prev.map(o => o.id === msg.data.id ? msg.data : o))
        if (!localMutations.current.has(msg.data.id)) {
          setNotifications(prev => [{
            id: Math.random().toString(36).slice(2),
            type: 'updated',
            companyName: msg.data.companyName,
            opportunityId: msg.data.id,
            detail: `Updated: ${msg.data.companyName}`,
            timestamp: new Date().toISOString(),
            read: false,
          }, ...prev.slice(0, 49)])
        }
      })
      channel.subscribe('opportunity:deleted', msg => {
        setOpportunities(prev => prev.filter(o => o.id !== msg.data.id))
      })
    }
    connect()
    return () => ably?.close()
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const createOpportunity = useCallback(async (data: Partial<Opportunity>) => {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const created = await res.json()
    localMutations.current.add(created.id)
    setTimeout(() => localMutations.current.delete(created.id), 5000)
    return created
  }, [])

  const updateOpportunity = useCallback(async (id: string, data: Partial<Opportunity>) => {
    localMutations.current.add(id)
    setTimeout(() => localMutations.current.delete(id), 5000)
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  const deleteOpportunity = useCallback(async (id: string) => {
    localMutations.current.add(id)
    const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }, [])

  return { opportunities, loading, error, notifications, markAllRead, createOpportunity, updateOpportunity, deleteOpportunity }
}
