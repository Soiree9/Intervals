import { describe, expect, it } from 'vitest'
import { MAJOR_KEYS, analyzeInterval, buildTriad, pitchName } from './music'
import {
  createIntervalExample,
  createChordToneQuestion,
  createIntervalQuestion,
  createSession,
  createTriadFillQuestion,
  createVoicing,
  intervalOptionsFor,
} from './questions'
import type { IntervalSettings, TriadSettings } from './types'

const intervalSettings: IntervalSettings = {
  degrees: [2, 3, 4, 5, 6, 7],
  difficulty: 'advanced',
  playback: 'melodic',
}

const triadSettings: TriadSettings = {
  qualities: ['major', 'minor', 'diminished'],
  circleLevel: 3,
}

describe('question generation', () => {
  it('keeps interval options in a fixed, degree-specific order', () => {
    for (let run = 0; run < 50; run += 1) {
      const question = createIntervalQuestion(intervalSettings)
      expect(question.upper.midi).toBeGreaterThan(question.lower.midi)
      expect(question.options).toEqual(intervalOptionsFor(intervalSettings.degrees, 'advanced'))
      expect(question.options.map((option) => option.label)).toContain(question.answer.label)
    }
  })

  it('reduces basic interval options to qualities natural notes can produce', () => {
    expect(intervalOptionsFor([3], 'basic').map((option) => option.label)).toEqual(['小三度', '大三度'])
    expect(intervalOptionsFor([4], 'basic').map((option) => option.label)).toEqual(['纯四度', '增四度'])
  })

  it('builds a playable, correctly spelled example for every interval option', () => {
    for (const option of intervalOptionsFor(intervalSettings.degrees, 'advanced')) {
      const [lower, upper] = createIntervalExample(option)
      expect(upper.midi).toBeGreaterThan(lower.midi)
      expect(analyzeInterval(lower, upper)).toEqual(option)
    }
  })

  it('keeps basic questions natural', () => {
    for (let run = 0; run < 30; run += 1) {
      const question = createIntervalQuestion({ ...intervalSettings, difficulty: 'basic' })
      expect(question.lower.accidental).toBe(0)
      expect(question.upper.accidental).toBe(0)
    }
  })

  it('voices all inversions in ascending order inside the supported range', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 1)
    expect(createVoicing(triad.tones, 0).map((note) => pitchName(note))).toEqual(['C', 'E', 'G'])
    expect(createVoicing(triad.tones, 1).map((note) => pitchName(note))).toEqual(['E', 'G', 'C'])
    expect(createVoicing(triad.tones, 2).map((note) => pitchName(note))).toEqual(['G', 'C', 'E'])
    for (const inversion of [0, 1, 2] as const) {
      const notes = createVoicing(triad.tones, inversion)
      expect(notes[0].midi).toBeLessThan(notes[1].midi)
      expect(notes[1].midi).toBeLessThan(notes[2].midi)
      expect(notes.every((note) => note.midi >= 59 && note.midi <= 84)).toBe(true)
    }
  })

  it('creates triad fill and member questions with exact spellings', () => {
    for (let run = 0; run < 50; run += 1) {
      const fill = createTriadFillQuestion(triadSettings)
      expect(fill.answers).toEqual(fill.notes.map((note) => pitchName(note)))
      const member = createChordToneQuestion(triadSettings)
      expect(member.answer).toBe(pitchName(member.triad.tones[member.targetIndex]))
    }
  })

  it('balances all three inversions within a ten-question session while shuffling their order', () => {
    let seed = 246813579
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    const session = createSession('triad-fill', intervalSettings, triadSettings, 10, random)
    const inversions = session.map((question) => question.kind === 'triad-fill' ? question.inversion : -1)
    const counts = [0, 1, 2].map((inversion) => inversions.filter((value) => value === inversion).length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    expect(inversions).not.toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, expect.any(Number)])
  })
})
