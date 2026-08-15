import type { ScoreEvent } from '../domain/notation'
import type { NoteSpelling } from '../domain/types'

export interface StaveNoteHeadBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ScoreHitArea extends StaveNoteHeadBounds {
  note: NoteSpelling
  label: string
}

export function scoreHitAreas(
  event: ScoreEvent,
  staveNote: { getNoteHeadBounds(): readonly StaveNoteHeadBounds[] },
): ScoreHitArea[] {
  return staveNote.getNoteHeadBounds().slice(0, event.notes.length).map((bounds, index) => ({
    ...bounds,
    note: event.notes[index],
    label: event.notes[index].displayName,
  }))
}
