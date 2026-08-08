import { describe, expect, it } from 'vitest'
import { MAJOR_KEYS, analyzeInterval, buildTriad, makeNote, pitchName } from './music'
import {
  PROGRESSION_TEMPLATES,
  createChordToneQuestion,
  createIntervalAudition,
  createIntervalQuestion,
  createProgressionVoicings,
  createSession,
  createTriadFillQuestion,
  createVoicing,
  intervalOptionsFor,
  hasParallelPerfects,
  sessionSignature,
} from './questions'
import type { IntervalSettings, KeyPracticeSettings, ScaleDegree, TriadSettings } from './types'

const intervalSettings: IntervalSettings = {
  degrees: [2, 3, 4, 5, 6, 7],
  difficulty: 'advanced',
  playback: 'melodic',
}

const triadSettings: TriadSettings = {
  qualities: ['major', 'minor', 'diminished'],
  spellingLevel: 3,
}

const keySettings: KeyPracticeSettings = {
  keyName: 'E',
  scaleDirection: 'mixed',
  progressionDirection: 'mixed',
  voiceCount: 4,
}

function seeded(seed = 246813579) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

describe('question generation', () => {
  it('keeps interval options fixed and degree-specific', () => {
    for (let run = 0; run < 20; run += 1) {
      const question = createIntervalQuestion(intervalSettings)
      expect(question.upper.midi).toBeGreaterThan(question.lower.midi)
      expect(question.options).toEqual(intervalOptionsFor(intervalSettings.degrees, 'advanced'))
      expect(question.options.map((option) => option.label)).toContain(question.answer.label)
    }
  })

  it('uses the supplied lower note for post-answer interval auditions', () => {
    const lower = makeNote('F', 1, 4)
    for (const option of intervalOptionsFor(intervalSettings.degrees, 'advanced')) {
      const [auditionLower, upper] = createIntervalAudition(lower, option)
      expect(auditionLower).toEqual(lower)
      expect(analyzeInterval(auditionLower, upper)).toEqual(option)
    }
  })

  it('keeps basic questions natural', () => {
    for (let run = 0; run < 20; run += 1) {
      const question = createIntervalQuestion({ ...intervalSettings, difficulty: 'basic' })
      expect(question.lower.accidental).toBe(0)
      expect(question.upper.accidental).toBe(0)
    }
  })

  it('voices all inversions in ascending order', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 1)
    expect(createVoicing(triad.tones, 0).map(pitchName)).toEqual(['C', 'E', 'G'])
    expect(createVoicing(triad.tones, 1).map(pitchName)).toEqual(['E', 'G', 'C'])
    expect(createVoicing(triad.tones, 2).map(pitchName)).toEqual(['G', 'C', 'E'])
  })

  it('creates triad answers using exact spellings', () => {
    for (let run = 0; run < 20; run += 1) {
      const fill = createTriadFillQuestion(triadSettings)
      expect(fill.answers).toEqual(fill.notes.map(pitchName))
      const member = createChordToneQuestion(triadSettings)
      expect(member.answer).toBe(pitchName(member.triad.tones[member.targetIndex]))
    }
  })

  it('covers all seven scale degrees and exactly five questions in each mixed direction', () => {
    const session = createSession('scale-degree', intervalSettings, triadSettings, keySettings, 10, seeded())
    const questions = session.filter((question) => question.kind === 'scale-degree')
    expect(questions).toHaveLength(10)
    expect(new Set(questions.map((question) => question.degree))).toEqual(new Set<ScaleDegree>([1, 2, 3, 4, 5, 6, 7]))
    expect(questions.filter((question) => question.direction === 'forward')).toHaveLength(5)
    expect(questions.filter((question) => question.direction === 'reverse')).toHaveLength(5)
    expect(questions.find((question) => question.degree === 6)?.note && pitchName(questions.find((question) => question.degree === 6)!.note)).toBe('C♯')
  })

  it('changes a repeated coverage order even with an identical random source', () => {
    const first = createSession('scale-degree', intervalSettings, triadSettings, keySettings, 10, seeded())
    const second = createSession('scale-degree', intervalSettings, triadSettings, keySettings, 10, seeded(), sessionSignature(first))
    expect(sessionSignature(second)).not.toBe(sessionSignature(first))
  })

  it('covers all nine progression templates with exactly one repeat and mixed directions', () => {
    const session = createSession('progression', intervalSettings, triadSettings, keySettings, 10, seeded())
    const questions = session.filter((question) => question.kind === 'progression')
    expect(questions).toHaveLength(10)
    expect(new Set(questions.map((question) => question.templateId))).toEqual(new Set(PROGRESSION_TEMPLATES.map((template) => template.id)))
    expect(questions.filter((question) => question.direction === 'forward')).toHaveLength(5)
    expect(questions.filter((question) => question.direction === 'reverse')).toHaveLength(5)
  })

  it('keeps generated progression voices complete, ascending, in range and free of parallel perfects', () => {
    for (const key of MAJOR_KEYS) {
      for (const template of PROGRESSION_TEMPLATES) {
        const triads = template.degrees.map((degree) => buildTriad(key, degree))
        for (const voiceCount of [3, 4] as const) {
          const voicings = createProgressionVoicings(key, triads, voiceCount)
          expect(voicings).toHaveLength(4)
          voicings.forEach((voicing) => {
            expect(voicing).toHaveLength(voiceCount)
            expect(voicing.every((note, index) => index === 0 || note.midi > voicing[index - 1].midi)).toBe(true)
            expect(voicing[0].midi).toBeGreaterThanOrEqual(36)
            expect(voicing.at(-1)!.midi).toBeLessThanOrEqual(84)
          })
          for (let index = 1; index < voicings.length; index += 1) expect(hasParallelPerfects(voicings[index - 1], voicings[index])).toBe(false)
        }
      }
    }
  })
})
