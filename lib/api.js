import { supabase } from './supabase'

// ── CARDS ──────────────────────────────────────────────────────
export async function createCard({ columnId, title, addr='', description='', clientName='',
  cardDate, cardTime, cardType='foto', price=0, isGcal=false, isTodo=false,
  gcalId='', teamIds=[], note='' }) {

  const { data: col } = await supabase.from('columns').select('id').eq('id', columnId).single()
  if (!col) throw new Error('Column not found')

  const { data: card, error } = await supabase.from('cards').insert({
    column_id: columnId, title, addr, description, client_name: clientName,
    card_date: cardDate||null, card_time: cardTime||null, card_type: cardType,
    price, is_gcal: isGcal, is_todo: isTodo, gcal_id: gcalId, note, position: 999
  }).select().single()

  if (error) throw error

  if (teamIds.length) {
    await supabase.from('card_team').insert(
      teamIds.map(sid => ({ card_id: card.id, staff_id: sid }))
    )
  }
  return card
}

export async function moveCard(cardId, newColumnId) {
  const { error } = await supabase.from('cards')
    .update({ column_id: newColumnId, updated_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw error
}

export async function updateCard(cardId, updates) {
  const { error } = await supabase.from('cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw error
}

export async function deleteCard(cardId) {
  await supabase.from('card_team').delete().eq('card_id', cardId)
  await supabase.from('checklist_items').delete().eq('card_id', cardId)
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw error
}

export async function updateCardNote(cardId, note) {
  await supabase.from('cards').update({ note, updated_at: new Date().toISOString() }).eq('id', cardId)
}

// ── CHECKLIST ──────────────────────────────────────────────────
export async function addCheckItem(cardId, text) {
  const { error } = await supabase.from('checklist_items').insert({ card_id: cardId, text, done: false })
  if (error) throw error
}

export async function toggleCheckItem(itemId, done) {
  await supabase.from('checklist_items').update({ done }).eq('id', itemId)
}

export async function deleteCheckItem(itemId) {
  await supabase.from('checklist_items').delete().eq('id', itemId)
}

// ── COLUMNS ────────────────────────────────────────────────────
export async function createColumn(title, dotColor='#9c9589') {
  const { data: cols } = await supabase.from('columns').select('position').order('position', { ascending: false }).limit(1)
  const pos = cols?.[0]?.position + 1 || 0
  const { error } = await supabase.from('columns').insert({ title, dot_color: dotColor, position: pos })
  if (error) throw error
}

export async function renameColumn(colId, title) {
  await supabase.from('columns').update({ title }).eq('id', colId)
}

// ── STAFF ──────────────────────────────────────────────────────
export async function saveStaff(data, id=null) {
  if (id) {
    const { error } = await supabase.from('staff').update(data).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('staff').insert(data)
    if (error) throw error
  }
}

export async function deleteStaff(id) {
  await supabase.from('staff').delete().eq('id', id)
}

// ── CLIENTS ────────────────────────────────────────────────────
export async function saveClient(data, id=null) {
  if (id) {
    const { error } = await supabase.from('clients').update(data).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('clients').insert(data)
    if (error) throw error
  }
}

export async function deleteClient(id) {
  await supabase.from('clients').delete().eq('id', id)
}

// ── SEED GCAL CARDS ────────────────────────────────────────────
export async function seedGcalCards(staffMap) {
  // staffMap: { 'CD': uuid, 'DB': uuid, ... }
  const shootingsCol = await supabase.from('columns').select('id').eq('title', 'Shootings').single()
  if (!shootingsCol.data) return

  const gcalCards = [
    { title: 'Casalie - Grenzhoferweg 1', addr: 'Brühl', description: 'Doppelhaushälfte Fotos', client_name: 'Casalie', card_date: '2026-05-13', card_time: '10:00', team: ['CD'] },
    { title: 'Bartz - Hauptstraße 82', addr: 'Weisenheim am Berg', description: '', client_name: 'Bartz', card_date: '2026-05-13', card_time: '13:00', team: ['CD'] },
    { title: 'SI - Saalfelder Weg 6', addr: 'Mannheim', description: 'Nur Fotos · 3 Zimmer · leerstehend · Johannes Wohlfahrt', client_name: 'SI', card_date: '2026-05-13', card_time: '15:00', team: ['CD'] },
    { title: 'Riegel#56 - Friedrich Ebert Str. 4', addr: 'Speyer', description: 'ETW · Lorenz', client_name: 'Riegel', card_date: '2026-05-13', card_time: '17:00', team: ['CD'] },
    { title: 'EV-Da - Landgraf-Philipps-Anlage 42', addr: 'Darmstadt', description: 'Wohnung · Mieter weg · Thomas', client_name: 'EV-Da', card_date: '2026-05-15', card_time: '09:30', team: ['CD'] },
    { title: 'Harry Durst - Neustadt & Mannheim', addr: 'Neustadt / MA', description: 'Infos folgen', client_name: 'Harry Durst', card_date: '2026-05-15', card_time: '13:00', team: ['CD'] },
    { title: 'Bartz - Philosophengarten 2', addr: 'Landau i.d.Pf.', description: 'Unbewohnt · Sina vor Ort', client_name: 'Bartz', card_date: '2026-05-15', card_time: '15:00', team: ['CD'] },
    { title: 'NPI#06 - Hauptstraße 66', addr: 'Wattenheim', description: '', client_name: 'NPI', card_date: '2026-05-16', card_time: '10:00', team: ['CD'] },
    { title: 'Riegel A - Nachtigallenweg 10', addr: 'Germersheim', description: 'Neue Außenbilder · Rasen gemäht · Lorenz', client_name: 'Riegel', card_date: '2026-05-17', card_time: '10:15', team: ['CD'] },
  ]

  for (let i = 0; i < gcalCards.length; i++) {
    const c = gcalCards[i]
    const { data: card } = await supabase.from('cards').insert({
      column_id: shootingsCol.data.id,
      title: c.title, addr: c.addr, description: c.description,
      client_name: c.client_name, card_date: c.card_date, card_time: c.card_time,
      card_type: 'foto', is_gcal: true, position: i
    }).select().single()

    if (card && staffMap['CD']) {
      await supabase.from('card_team').insert({ card_id: card.id, staff_id: staffMap['CD'] })
    }
  }
}
