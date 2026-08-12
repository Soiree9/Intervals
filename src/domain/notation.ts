import type {
  Accidental,
  Letter,
  NoteSpelling,
  ProgressionQuestion,
  ScaleDegreeQuestion,
} from './types'

export type KeySignatureFifths = -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type ScoreDuration = 'whole'

export interface ScoreEvent {
  notes: NoteSpelling[]
  duration: ScoreDuration
  annotation?: string
  highlightedNoteIndexes?: number[]
}

export interface ScoreMeasure {
  events: ScoreEvent[]
}

export interface ScoreSpec {
  clef: 'treble'
  keySignatureFifths?: KeySignatureFifths
  timeSignature?: { beats: number; beatValue: number }
  measured: boolean
  measures: ScoreMeasure[]
  finalBarline?: boolean
}

export type AccidentalMark = Accidental | null

const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

const KEY_NAMES_BY_FIFTHS: Record<KeySignatureFifths, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
}

export function asKeySignatureFifths(value: number): KeySignatureFifths {
  if (!Number.isInteger(value) || value < -7 || value > 7) {
    throw new Error(`Unsupported key signature: ${value}`)
  }
  return value as KeySignatureFifths
}

export function keyNameForSignature(fifths: KeySignatureFifths): string {
  return KEY_NAMES_BY_FIFTHS[fifths]
}

export function keySignatureAccidentals(fifths: KeySignatureFifths): Record<Letter, Accidental> {
  const result: Record<Letter, Accidental> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }
  const order = fifths >= 0 ? SHARP_ORDER : FLAT_ORDER
  const accidental = (fifths >= 0 ? 1 : -1) as Accidental
  for (let index = 0; index < Math.abs(fifths); index += 1) result[order[index]] = accidental
  return result
}

export function resolveAccidentals(score: ScoreSpec): AccidentalMark[][][] {
  const signature = keySignatureAccidentals(score.keySignatureFifths ?? 0)
  return score.measures.map((measure) => {
    const current = new Map<string, Accidental>()
    return measure.events.map((event) => event.notes.map((note) => {
      const identity = `${note.letter}${note.octave}`
      const active = current.get(identity) ?? signature[note.letter]
      if (active === note.accidental) return null
      current.set(identity, note.accidental)
      return note.accidental
    }))
  })
}

export function buildStandaloneScore(notes: NoteSpelling[], highlightedNoteIndexes: number[] = []): ScoreSpec {
  return {
    clef: 'treble',
    measured: false,
    measures: [{
      events: [{
        notes,
        duration: 'whole',
        highlightedNoteIndexes,
      }],
    }],
  }
}

export function buildScaleDegreeScore(question: ScaleDegreeQuestion): ScoreSpec {
  return {
    clef: 'treble',
    keySignatureFifths: asKeySignatureFifths(question.key.signature),
    measured: false,
    measures: [{
      events: [
        { notes: question.cadence[0], duration: 'whole', annotation: 'V' },
        { notes: question.cadence[1], duration: 'whole', annotation: 'I' },
        { notes: [question.note], duration: 'whole', annotation: '目标', highlightedNoteIndexes: [0] },
      ],
    }],
  }
}

export function buildProgressionScore(question: ProgressionQuestion): ScoreSpec {
  return {
    clef: 'treble',
    keySignatureFifths: asKeySignatureFifths(question.key.signature),
    timeSignature: { beats: 4, beatValue: 4 },
    measured: true,
    finalBarline: true,
    measures: question.voicings.map((notes) => ({
      events: [{ notes, duration: 'whole' }],
    })),
  }
}
