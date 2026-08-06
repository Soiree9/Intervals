import {
  ALL_INTERVAL_IDENTITIES,
  INVERSION_TEXT,
  LETTERS,
  analyzeInterval,
  buildTriad,
  keysForCircleLevel,
  makeNote,
  pitchName,
} from './music'
import type {
  Accidental,
  ChordToneQuestion,
  IntervalIdentity,
  IntervalQuestion,
  IntervalSettings,
  Inversion,
  NoteSpelling,
  PitchSpelling,
  PracticeKind,
  PracticeQuestion,
  TriadFillQuestion,
  TriadQuality,
  TriadSettings,
} from './types'

export type RandomSource = () => number

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function pickOne<T>(values: T[], random: RandomSource = Math.random): T {
  return values[Math.floor(random() * values.length)]
}

export function shuffle<T>(values: T[], random: RandomSource = Math.random): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function writtenNotes(accidentals: Accidental[]): NoteSpelling[] {
  const notes: NoteSpelling[] = []
  for (let octave = 4; octave <= 6; octave += 1) {
    for (const letter of LETTERS) {
      if (octave === 6 && letter !== 'C') break
      for (const accidental of accidentals) notes.push(makeNote(letter, accidental, octave))
    }
  }
  return notes
}

function intervalCandidates(settings: IntervalSettings): Array<{ lower: NoteSpelling; upper: NoteSpelling; answer: IntervalIdentity }> {
  const notes = writtenNotes(settings.difficulty === 'basic' ? [0] : [-1, 0, 1])
  const candidates: Array<{ lower: NoteSpelling; upper: NoteSpelling; answer: IntervalIdentity }> = []
  for (let lowerIndex = 0; lowerIndex < notes.length; lowerIndex += 1) {
    const lower = notes[lowerIndex]
    for (let upperIndex = lowerIndex + 1; upperIndex < notes.length; upperIndex += 1) {
      const upper = notes[upperIndex]
      if (upper.midi <= lower.midi) continue
      try {
        const answer = analyzeInterval(lower, upper)
        if (settings.degrees.includes(answer.degree)) candidates.push({ lower, upper, answer })
      } catch {
        // Reject unisons, octaves, compound qualities, and double-altered relationships.
      }
    }
  }
  return candidates
}

export function intervalOptionsFor(degrees: IntervalSettings['degrees'], difficulty: IntervalSettings['difficulty']): IntervalIdentity[] {
  const basicLabels = new Set(['小二度', '大二度', '小三度', '大三度', '纯四度', '增四度', '减五度', '纯五度', '小六度', '大六度', '小七度', '大七度'])
  return ALL_INTERVAL_IDENTITIES
    .filter((identity) => degrees.includes(identity.degree))
    .filter((identity) => difficulty === 'advanced' || basicLabels.has(identity.label))
}

export function createIntervalExample(identity: IntervalIdentity): [NoteSpelling, NoteSpelling] {
  const notes = writtenNotes([0, -1, 1])
  const candidates: Array<[NoteSpelling, NoteSpelling]> = []
  for (const lower of notes.filter((note) => note.midi >= 60 && note.midi < 72)) {
    for (const upper of notes) {
      if (upper.midi <= lower.midi) continue
      try {
        if (analyzeInterval(lower, upper).label === identity.label) candidates.push([lower, upper])
      } catch {
        // Keep searching for a simple, single-accidental spelling.
      }
    }
  }
  const accidentalCount = (pair: [NoteSpelling, NoteSpelling]) => Math.abs(pair[0].accidental) + Math.abs(pair[1].accidental)
  candidates.sort((left, right) => accidentalCount(left) - accidentalCount(right) || Math.abs(left[0].midi - 60) - Math.abs(right[0].midi - 60))
  if (!candidates[0]) throw new Error(`No playable example for ${identity.label}.`)
  return candidates[0]
}

export function createIntervalQuestion(settings: IntervalSettings, random: RandomSource = Math.random): IntervalQuestion {
  const candidates = intervalCandidates(settings)
  if (!candidates.length) throw new Error('No interval candidates match the selected settings.')
  const candidate = pickOne(candidates, random)
  return {
    kind: 'interval',
    id: randomId('interval'),
    ...candidate,
    options: intervalOptionsFor(settings.degrees, settings.difficulty),
  }
}

const QUALITY_DEGREES: Record<TriadQuality, number[]> = {
  major: [1, 4, 5],
  minor: [2, 3, 6],
  diminished: [7],
}

export function createVoicing(tones: [PitchSpelling, PitchSpelling, PitchSpelling], inversion: Inversion): [NoteSpelling, NoteSpelling, NoteSpelling] {
  const order = [tones[inversion], tones[(inversion + 1) % 3], tones[(inversion + 2) % 3]]
  const voiced: NoteSpelling[] = []
  for (const pitch of order) {
    let octave = 4
    let note = makeNote(pitch.letter, pitch.accidental, octave)
    while (voiced.length && note.midi <= voiced[voiced.length - 1].midi) {
      octave += 1
      note = makeNote(pitch.letter, pitch.accidental, octave)
    }
    voiced.push(note)
  }
  if (voiced.some((note) => note.midi < 59 || note.midi > 84)) throw new Error('Triad voicing left the supported staff range.')
  return voiced as [NoteSpelling, NoteSpelling, NoteSpelling]
}

function chooseTriad(settings: TriadSettings, random: RandomSource) {
  const quality = pickOne(settings.qualities, random)
  const key = pickOne(keysForCircleLevel(settings.circleLevel), random)
  const degree = pickOne(QUALITY_DEGREES[quality], random)
  return buildTriad(key, degree)
}

export function createTriadFillQuestion(settings: TriadSettings, random: RandomSource = Math.random, forcedInversion?: Inversion): TriadFillQuestion {
  const triad = chooseTriad(settings, random)
  const inversion = forcedInversion ?? Math.floor(random() * 3) as Inversion
  const notes = createVoicing(triad.tones, inversion)
  return {
    kind: 'triad-fill',
    id: randomId('triad-fill'),
    triad,
    inversion,
    notes,
    answers: notes.map((note) => pitchName(note)) as [string, string, string],
  }
}

export function createChordToneQuestion(settings: TriadSettings, random: RandomSource = Math.random): ChordToneQuestion {
  const triad = chooseTriad(settings, random)
  const targetIndex = (random() < 0.5 ? 1 : 2) as 1 | 2
  const notes = createVoicing(triad.tones, 0)
  return {
    kind: 'chord-tone',
    id: randomId('chord-tone'),
    triad,
    target: targetIndex === 1 ? 'third' : 'fifth',
    targetIndex,
    notes,
    answer: pitchName(triad.tones[targetIndex]),
  }
}

function balancedInversionOrder(count: number, random: RandomSource): Inversion[] {
  const inversions: Inversion[] = []
  while (inversions.length + 3 <= count) inversions.push(0, 1, 2)
  inversions.push(...shuffle<Inversion>([0, 1, 2], random).slice(0, count - inversions.length))
  return shuffle(inversions, random)
}

export function createSession(kind: PracticeKind, intervalSettings: IntervalSettings, triadSettings: TriadSettings, count = 10, random: RandomSource = Math.random): PracticeQuestion[] {
  if (kind === 'triad-fill') {
    return balancedInversionOrder(count, random).map((inversion) => createTriadFillQuestion(triadSettings, random, inversion))
  }
  return Array.from({ length: count }, () => kind === 'interval'
    ? createIntervalQuestion(intervalSettings, random)
    : createChordToneQuestion(triadSettings, random))
}

export function questionStorageKey(question: PracticeQuestion): string {
  if (question.kind === 'interval') return `interval:${question.lower.displayName}:${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `triad-fill:${question.triad.symbol}:${question.inversion}`
  return `chord-tone:${question.triad.symbol}:${question.target}`
}

export function questionSummary(question: PracticeQuestion): string {
  if (question.kind === 'interval') return `${question.lower.displayName} — ${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `${question.triad.label} · ${INVERSION_TEXT[question.inversion]}`
  return `${question.triad.label} · ${question.target === 'third' ? '三音' : '五音'}`
}
