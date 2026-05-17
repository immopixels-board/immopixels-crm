import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

// ── COLUMNS ────────────────────────────────────────────────────
export function useColumns() {
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('columns')
      .select('*')
      .order('position')
    setColumns(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const sub = supabase.channel('columns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  return { columns, loading, refresh: fetch }
}

// ── CARDS ──────────────────────────────────────────────────────
export function useCards(columnId) {
  const [cards, setCards] = useState([])

  const fetch = useCallback(async () => {
    if (!columnId) return
    const { data } = await supabase
      .from('cards')
      .select('*, card_team(staff_id), checklist_items(*)')
      .eq('column_id', columnId)
      .order('position')
    setCards(data || [])
  }, [columnId])

  useEffect(() => {
    fetch()
    const sub = supabase.channel(`cards-${columnId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards',
          filter: `column_id=eq.${columnId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [columnId, fetch])

  return { cards, refresh: fetch }
}

// ── ALL CARDS (board view) ─────────────────────────────────────
export function useAllCards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('cards')
      .select('*, card_team(staff_id), checklist_items(*)')
      .order('position')
    setCards(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const sub = supabase.channel('all-cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  return { cards, loading, refresh: fetch }
}

// ── STAFF ──────────────────────────────────────────────────────
export function useStaff() {
  const [staff, setStaff] = useState([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('staff').select('*').order('name')
    setStaff(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { staff, refresh: fetch }
}

// ── CLIENTS ────────────────────────────────────────────────────
export function useClients() {
  const [clients, setClients] = useState([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { clients, refresh: fetch }
}
