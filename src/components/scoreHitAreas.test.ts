import { describe, expect, it, vi } from 'vitest'
import { makeNote } from '../domain/music'
import type { ScoreEvent } from '../domain/notation'
import { scoreHitAreas } from './scoreHitAreas'

describe('scoreHitAreas', () => {
  it('creates one independently positioned hit area for each chord note head', () => {
    const notes = [makeNote('C', 0, 4), makeNote('E', 0, 4), makeNote('G', 0, 4)]
    const event: ScoreEvent = { notes, duration: 'whole' }
    const getNoteHeadBounds = vi.fn(() => [
      { x: 128, y: 76, width: 13, height: 16 },
      { x: 128, y: 64, width: 13, height: 16 },
      { x: 141, y: 52, width: 13, height: 16 },
    ])

    expect(scoreHitAreas(event, { getNoteHeadBounds })).toEqual([
      { x: 128, y: 76, width: 13, height: 16, note: notes[0], label: 'C4' },
      { x: 128, y: 64, width: 13, height: 16, note: notes[1], label: 'E4' },
      { x: 141, y: 52, width: 13, height: 16, note: notes[2], label: 'G4' },
    ])
    expect(getNoteHeadBounds).toHaveBeenCalledOnce()
  })
})
