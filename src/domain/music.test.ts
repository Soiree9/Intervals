import { describe, expect, it } from 'vitest'
import {
  MAJOR_KEYS,
  SEVENTH_ROOTS,
  analyzeInterval,
  buildDiatonicSeventhChord,
  buildMajorKey,
  buildSeventhChord,
  buildTriad,
  chordMemberLabel,
  formatChordSymbol,
  explainInterval,
  makeNote,
  pitchName,
  spreadTriadInversion,
  spreadTriadMemberSequence,
  spreadTriadSolfege,
  triadIntervalStructure,
  triadMemberSequence,
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

  it('chooses a concise degree-specific explanation', () => {
    const minorThird = [makeNote('D', 0, 4), makeNote('F', 0, 4)] as const
    expect(explainInterval(...minorThird, analyzeInterval(...minorThird))).toMatchObject({
      degreeLabel: '三度',
      steps: ['whole', 'half'],
      result: '小三度',
    })
    expect(explainInterval(...minorThird, analyzeInterval(...minorThird)).degreePath.map(pitchName)).toEqual(['D', 'E', 'F'])

    const majorThird = [makeNote('C', 0, 4), makeNote('E', 0, 4)] as const
    expect(explainInterval(...majorThird, analyzeInterval(...majorThird)).steps).toEqual(['whole', 'whole'])

    const augmentedFourth = [makeNote('E', -1, 4), makeNote('A', 0, 4)] as const
    expect(explainInterval(...augmentedFourth, analyzeInterval(...augmentedFourth))).toMatchObject({
      method: '音程扩大半音',
      referenceLabel: '纯四度',
      tritone: true,
      result: '增四度',
    })
    expect(explainInterval(...augmentedFourth, analyzeInterval(...augmentedFourth)).degreePath.map(pitchName)).toEqual(['E♭', 'F', 'G', 'A'])
    expect(explainInterval(...augmentedFourth, analyzeInterval(...augmentedFourth)).reference?.map(pitchName)).toEqual(['E', 'A'])

    const matchingFlats = [makeNote('E', -1, 4), makeNote('B', -1, 4)] as const
    expect(explainInterval(...matchingFlats, analyzeInterval(...matchingFlats))).toMatchObject({
      method: '两个音都降半音，音程不变',
      referenceLabel: '纯五度',
      result: '纯五度',
    })

    const majorSeventh = [makeNote('F', 0, 4), makeNote('E', 0, 5)] as const
    expect(explainInterval(...majorSeventh, analyzeInterval(...majorSeventh))).toMatchObject({
      result: '大七度',
      inversion: {
        label: '小二度',
        formula: '七＋二＝九；',
        qualities: '小 ↔ 大',
      },
    })
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

  it('describes triad members with quality-aware intervals', () => {
    expect(triadMemberSequence('major', 1)).toBe('M3-5-R')
    expect(triadMemberSequence('minor', 2)).toBe('5-R-♭3')
    expect(triadMemberSequence('diminished', 0)).toBe('R-♭3-♭5')
  })

  it('describes spread triads by bass-note inversion and low-to-high order', () => {
    expect(spreadTriadInversion('R53')).toBe(0)
    expect(spreadTriadInversion('3R5')).toBe(1)
    expect(spreadTriadInversion('53R')).toBe(2)
    expect(spreadTriadMemberSequence('major', 'R53')).toBe('R-5-M3')
    expect(spreadTriadMemberSequence('minor', '3R5')).toBe('♭3-R-5')
    expect(spreadTriadMemberSequence('diminished', '53R')).toBe('♭5-♭3-R')
    expect(spreadTriadSolfege('major', 'R53')).toBe('Do–Sol–Mi')
  })

  it('uses one display rule for natural and lowered chord members', () => {
    expect(['R', '7', '♭7', '3', '♭3', '5', '♭5'].map(chordMemberLabel)).toEqual([
      'R', 'M7', '♭7', 'M3', '♭3', '5', '♭5',
    ])
  })

  it('describes the two stacked thirds and the outer fifth of each triad quality', () => {
    expect(triadIntervalStructure('major')).toEqual({ rootToThird: '大三度', thirdToFifth: '小三度', rootToFifth: '纯五度' })
    expect(triadIntervalStructure('minor')).toEqual({ rootToThird: '小三度', thirdToFifth: '大三度', rootToFifth: '纯五度' })
    expect(triadIntervalStructure('diminished')).toEqual({ rootToThird: '小三度', thirdToFifth: '小三度', rootToFifth: '减五度' })
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
