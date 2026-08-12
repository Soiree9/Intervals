import { describe, expect, it } from 'vitest'
import {
  MAJOR_KEYS,
  SEVENTH_ROOTS,
  analyzeInterval,
  buildDiatonicSeventhChord,
  buildMajorKey,
  buildSeventhChord,
  buildTriad,
  formatChordSymbol,
  makeNote,
  pitchName,
  triadSolfege,
} from './music'
import type { ScaleDegree } from './types'

describe('interval analysis', () => {
  it.each([
    [makeNote('C', 0, 4), makeNote('E', 0, 4), 4],
    [makeNote('C', 0, 4), makeNote('E', -1, 4), 3],
    [makeNote('F', 0, 4), makeNote('B', 0, 4), 6],
    [makeNote('B', 0, 4), makeNote('F', 0, 5), 6],
    [makeNote('C', 1, 4), makeNote('G', 0, 4), 6],
  ])('uses spelling instead of pitch alone', (lower, upper, semitones) => {
    expect(analyzeInterval(lower, upper)).toMatchObject({ semitones })
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

  it('spells every diatonic triad and its quality in all twelve keys', () => {
    for (const key of MAJOR_KEYS) {
      expect([1, 4, 5].map((degree) => buildTriad(key, degree as ScaleDegree).quality)).toEqual(['major', 'major', 'major'])
      expect([2, 3, 6].map((degree) => buildTriad(key, degree as ScaleDegree).quality)).toEqual(['minor', 'minor', 'minor'])
      expect(buildTriad(key, 7).quality).toBe('diminished')
    }
  })

  it('keeps E major degree six correctly spelled as C sharp', () => {
    const eMajor = MAJOR_KEYS.find((key) => key.name === 'E')!
    expect(pitchName(eMajor.notes[5])).toBe('C♯')
    expect(buildTriad(eMajor, 6).symbol).toBe('C♯m')
  })

  it('describes triad inversions with root-relative solfege', () => {
    expect(triadSolfege('major', 0)).toBe('Do–Mi–Sol')
    expect(triadSolfege('major', 1)).toBe('Mi–Sol–Do')
    expect(triadSolfege('minor', 0)).toBe('Do–Me–Sol')
  })
})

describe('seventh chords and chord symbols', () => {
  it('spells all three practice qualities from the twelve fixed roots', () => {
    for (const root of SEVENTH_ROOTS) {
      for (const quality of ['major7', 'minor7', 'dominant7'] as const) {
        const chord = buildSeventhChord(root, quality)
        expect(chord.tones.map((tone) => tone.letter)).toHaveLength(4)
        expect(chord.tones.every((tone) => Math.abs(tone.accidental) <= 1)).toBe(true)
      }
    }
    expect(buildSeventhChord(SEVENTH_ROOTS.find((root) => pitchName(root) === 'D♭')!, 'minor7').tones.map(pitchName)).toEqual(['D♭', 'F♭', 'A♭', 'C♭'])
  })

  it('builds all seven diatonic seventh-chord qualities in major keys', () => {
    for (const key of MAJOR_KEYS) {
      expect(([1, 2, 3, 4, 5, 6, 7] as ScaleDegree[]).map((degree) => buildDiatonicSeventhChord(key, degree).quality)).toEqual(['major7', 'minor7', 'minor7', 'major7', 'dominant7', 'minor7', 'half-diminished7'])
    }
  })

  it('formats complete text and symbol chord systems', () => {
    const c = SEVENTH_ROOTS[0]
    expect(formatChordSymbol(buildSeventhChord(c, 'major7'), 'text')).toBe('Cmaj7')
    expect(formatChordSymbol(buildSeventhChord(c, 'major7'), 'symbol')).toBe('C△')
    expect(formatChordSymbol(buildSeventhChord(c, 'minor7'), 'symbol')).toBe('C−7')
    expect(formatChordSymbol(buildDiatonicSeventhChord(MAJOR_KEYS[0], 7), 'symbol')).toBe('Bø7')
    expect(formatChordSymbol(buildDiatonicSeventhChord(MAJOR_KEYS[0], 7), 'text')).toBe('Bm7♭5')
    expect(formatChordSymbol(buildTriad(MAJOR_KEYS[0], 7), 'text')).toBe('Bdim')
    expect(formatChordSymbol(buildTriad(MAJOR_KEYS[0], 7), 'symbol')).toBe('B°')
  })
})
