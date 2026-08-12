import { describe, expect, it } from 'vitest'
import { MAJOR_KEYS, makeNote } from './music'
import {
  asKeySignatureFifths,
  buildProgressionScore,
  buildScaleDegreeScore,
  buildStandaloneScore,
  keyNameForSignature,
  keySignatureAccidentals,
  resolveAccidentals,
  type ScoreSpec,
} from './notation'
import type { ProgressionQuestion, ScaleDegreeQuestion } from './types'

describe('key signatures and accidental state', () => {
  it('maps the full circle-of-fifths range to standard key names', () => {
    expect(([-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7] as const).map(keyNameForSignature)).toEqual([
      'Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
    ])
  })

  it('matches every selected major key spelling to its signature', () => {
    for (const key of MAJOR_KEYS) {
      const signature = keySignatureAccidentals(asKeySignatureFifths(key.signature))
      for (const note of key.notes) expect(note.accidental).toBe(signature[note.letter])
    }
  })

  it('suppresses signature accidentals and writes cancellations only when required', () => {
    const score: ScoreSpec = {
      clef: 'treble',
      keySignatureFifths: 1,
      measured: false,
      measures: [{ events: [
        { notes: [makeNote('F', 1, 4)], duration: 'whole' },
        { notes: [makeNote('F', 0, 4)], duration: 'whole' },
        { notes: [makeNote('F', 0, 4)], duration: 'whole' },
        { notes: [makeNote('F', 1, 4)], duration: 'whole' },
      ] }],
    }
    expect(resolveAccidentals(score)).toEqual([[[null], [0], [null], [1]]])
  })

  it('resets accidental state at every barline', () => {
    const score: ScoreSpec = {
      clef: 'treble',
      keySignatureFifths: 2,
      timeSignature: { beats: 4, beatValue: 4 },
      measured: true,
      measures: [
        { events: [{ notes: [makeNote('C', 0, 4)], duration: 'whole' }] },
        { events: [{ notes: [makeNote('C', 1, 4)], duration: 'whole' }] },
      ],
    }
    expect(resolveAccidentals(score)).toEqual([[[0]], [[null]]])
  })

  it('uses explicit accidentals when no tonal context exists', () => {
    expect(resolveAccidentals(buildStandaloneScore([makeNote('B', -1, 4), makeNote('F', 1, 4)]))).toEqual([[[-1, 1]]])
  })
})

describe('question-to-score adapters', () => {
  it('preserves the exact V-I-target pitches without inventing a meter', () => {
    const key = MAJOR_KEYS.find((candidate) => candidate.name === 'E')!
    const question: ScaleDegreeQuestion = {
      kind: 'scale-degree',
      id: 'scale',
      key,
      degree: 6,
      direction: 'forward',
      cadence: [
        [makeNote('B', 0, 3), makeNote('D', 1, 4), makeNote('F', 1, 4)],
        [makeNote('E', 0, 4), makeNote('G', 1, 4), makeNote('B', 0, 4)],
      ],
      note: makeNote('C', 1, 5),
    }
    const score = buildScaleDegreeScore(question)
    expect(score.keySignatureFifths).toBe(4)
    expect(score.timeSignature).toBeUndefined()
    expect(score.measured).toBe(false)
    expect(score.measures[0].events.map((event) => event.annotation)).toEqual(['V', 'I', '目标'])
    expect(score.measures[0].events.map((event) => event.notes.map((note) => note.midi))).toEqual([
      ...question.cadence.map((notes) => notes.map((note) => note.midi)),
      [question.note.midi],
    ])
  })

  it('turns the four played voicings into four real 4/4 measures', () => {
    const key = MAJOR_KEYS.find((candidate) => candidate.name === 'F')!
    const voicings = [
      [makeNote('F', 0, 3), makeNote('A', 0, 3), makeNote('C', 0, 4)],
      [makeNote('C', 0, 4), makeNote('E', 0, 4), makeNote('G', 0, 4)],
      [makeNote('D', 0, 4), makeNote('F', 0, 4), makeNote('A', 0, 4)],
      [makeNote('B', -1, 3), makeNote('D', 0, 4), makeNote('F', 0, 4)],
    ] as ProgressionQuestion['voicings']
    const question = { key, voicings } as ProgressionQuestion
    const score = buildProgressionScore(question)
    expect(score.keySignatureFifths).toBe(-1)
    expect(score.timeSignature).toEqual({ beats: 4, beatValue: 4 })
    expect(score.measures).toHaveLength(4)
    expect(score.measures.map((measure) => measure.events[0].notes.map((note) => note.midi))).toEqual(
      voicings.map((notes) => notes.map((note) => note.midi)),
    )
  })
})
