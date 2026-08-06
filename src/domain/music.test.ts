import { describe, expect, it } from 'vitest'
import {
  MAJOR_KEYS,
  analyzeInterval,
  buildMajorKey,
  buildTriad,
  makeNote,
  pitchName,
} from './music'

describe('interval analysis', () => {
  it.each([
    [makeNote('C', 0, 4), makeNote('E', 0, 4), '大三度', 4],
    [makeNote('C', 0, 4), makeNote('E', -1, 4), '小三度', 3],
    [makeNote('F', 0, 4), makeNote('B', 0, 4), '增四度', 6],
    [makeNote('B', 0, 4), makeNote('F', 0, 5), '减五度', 6],
    [makeNote('C', 1, 4), makeNote('G', 0, 4), '减五度', 6],
  ])('names %s to %s from spelling, not pitch alone', (lower, upper, label, semitones) => {
    expect(analyzeInterval(lower, upper)).toMatchObject({ label, semitones })
  })
})

describe('major keys and diatonic triads', () => {
  it('spells edge keys without double accidentals', () => {
    expect(buildMajorKey('F#', 6).notes.map(pitchName)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯'])
    expect(buildMajorKey('Db', -5).notes.map(pitchName)).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'])
  })

  it('covers twelve major-key pitch classes', () => {
    expect(MAJOR_KEYS).toHaveLength(12)
    expect(new Set(MAJOR_KEYS.map((key) => key.name)).size).toBe(12)
  })

  it('produces I/IV/V major, ii/iii/vi minor, and vii diminished in every key', () => {
    for (const key of MAJOR_KEYS) {
      expect([1, 4, 5].map((degree) => buildTriad(key, degree).quality)).toEqual(['major', 'major', 'major'])
      expect([2, 3, 6].map((degree) => buildTriad(key, degree).quality)).toEqual(['minor', 'minor', 'minor'])
      expect(buildTriad(key, 7).quality).toBe('diminished')
    }
  })
})
