import { NextResponse } from 'next/server'

const TOOLS = [
  {
    name: 'create_card',
    description: 'Erstellt eine neue Karte auf dem Board. Verwende dies wenn der Benutzer eine neue Aufnahme, Aufgabe oder Karte erstellen möchte.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel der Karte, z.B. "Müller - Hauptstraße 5"' },
        addr: { type: 'string', description: 'Adresse / Standort' },
        client_name: { type: 'string', description: 'Name des Kunden' },
        card_type: { type: 'string', enum: ['foto','foto-reel','foto-dron','dron','reel','360','todo'], description: 'Typ der Karte' },
        card_date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
        card_time: { type: 'string', description: 'Uhrzeit im Format HH:MM' },
        description: { type: 'string', description: 'Beschreibung oder Notizen' },
        column_title: { type: 'string', description: 'Name der Spalte, z.B. "Shootings", "In Bearbeitung"' },
      },
      required: ['title'],
    },
  },
  {
    name: 'move_card',
    description: 'Verschiebt eine Karte in eine andere Spalte. Verwende dies um den Status einer Karte zu ändern.',
    input_schema: {
      type: 'object',
      properties: {
        card_title: { type: 'string', description: 'Titel der Karte (oder Teil davon)' },
        column_title: { type: 'string', description: 'Ziel-Spalte, z.B. "In Bearbeitung", "Fertig"' },
      },
      required: ['card_title', 'column_title'],
    },
  },
  {
    name: 'list_cards',
    description: 'Listet Karten auf dem Board auf, optional gefiltert nach Datum oder Spalte.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD um nach Datum zu filtern' },
        column_title: { type: 'string', description: 'Spaltenname um nach Spalte zu filtern' },
      },
    },
  },
  {
    name: 'delete_cards_in_column',
    description: 'Löscht alle Karten in einer bestimmten Spalte. NUR verwenden wenn der Benutzer explizit "lösche alle Karten in [Spalte]" sagt. Gibt die Anzahl der gelöschten Karten zurück.',
    input_schema: {
      type: 'object',
      properties: {
        column_title: { type: 'string', description: 'Name der Spalte deren Karten gelöscht werden sollen' },
        is_gcal_only: { type: 'boolean', description: 'Nur GCal-importierte Karten löschen (is_gcal=true)' },
      },
      required: ['column_title'],
    },
  },
  {
    name: 'find_duplicates',
    description: 'Findet und listet doppelte Karten auf dem Board (gleiche Adresse oder gleicher Titel am gleichen Datum). Optional auch löschen.',
    input_schema: {
      type: 'object',
      properties: {
        delete: { type: 'boolean', description: 'Wenn true, werden die Duplikate automatisch gelöscht' },
        column_title: { type: 'string', description: 'Optional: nur in dieser Spalte suchen' },
      },
    },
  },
]

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })
  }

  try {
    const { messages, system } = await request.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system,
        messages,
        tools: TOOLS,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `API error ${response.status}: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
