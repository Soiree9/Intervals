import { describe, expect, it } from 'vitest'
import { MAJOR_KEYS, buildTriad, pitchName } from './music'
import {
  createChordToneQuestion,
  createIntervalQuestion,
  createTriadFillQuestion,
  createVoicing,
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
  it('creates six unique interval options containing the answer', () => {
    for (let run = 0; run < 50; run += 1) {
      const question = createIntervalQuestion(intervalSettings)
      expect(question.upper.midi).toBeGreaterThan(question.lower.midi)
      expect(question.options).toHaveLength(6)
      expect(new Set(question.options.map((option) => option.label)).size).toBe(6)
      expect(question.options.map((option) => option.label)).toContain(question.answer.label)
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
})
