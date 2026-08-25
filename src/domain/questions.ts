import {
  ALL_INTERVAL_IDENTITIES,
  INVERSION_TEXT,
  LETTERS,
  SEVENTH_ROOTS,
  analyzeInterval,
  buildDiatonicSeventhChord,
  buildSeventhChord,
  buildTriad,
  chordMembers,
  formatChordSymbol,
  keysForCircleLevel,
  makeNote,
  mod,
  pitchName,
  spreadTriadOrder,
} from './music'
import { PROGRESSION_TEMPLATES } from './catalogs'
import type { ProgressionTemplate } from './catalogs'
import type {
  Accidental,
  ChordMember,
  ChordToneQuestion,
  ChordNotation,
  Drop2Pattern,
  Drop2VoicingQuestion,
  IntervalIdentity,
  IntervalQuestion,
  IntervalSettings,
  Inversion,
  KeyPracticeDirection,
  KeyPracticeSettings,
  MajorKey,
  NoteSpelling,
  PitchSpelling,
  PracticeKind,
  PracticeQuestion,
  ProgressionQuestion,
  ProgressionVoicingMode,
  ProgressionVoiceCount,
  ScaleDegree,
  ScaleDegreeQuestion,
  SeventhChordIdentity,
  SeventhChordSettings,
  ShellPattern,
  ShellVoicingQuestion,
  SpreadTriadFillQuestion,
  SpreadTriadPattern,
  TriadFillQuestion,
  TriadIdentity,
  TriadSettings,
} from './types'

export type RandomSource = () => number

export const AUDIO_MIN_MIDI = 55 // G3
export const AUDIO_MAX_MIDI = 77 // F5
export const INTERVAL_LOWER_MIN_MIDI = 59 // B3
export const INTERVAL_LOWER_MAX_MIDI = 65 // F4

export const SPREAD_TRIAD_PATTERNS: Array<{ id: SpreadTriadPattern; order: [number, number, number] }> = [
  { id: 'R53', order: spreadTriadOrder('R53') },
  { id: '3R5', order: spreadTriadOrder('3R5') },
  { id: '53R', order: spreadTriadOrder('53R') },
]

export const DROP2_PATTERNS: Array<{ id: Drop2Pattern; order: [number, number, number, number] }> = [
  { id: '5R37', order: [2, 0, 1, 3] },
  { id: '37R5', order: [1, 3, 0, 2] },
  { id: '735R', order: [3, 1, 2, 0] },
  { id: 'R573', order: [0, 2, 3, 1] },
]

export const SHELL_PATTERNS: Array<{ id: ShellPattern; order: [number, number, number] }> = [
  { id: 'R37', order: [0, 1, 3] },
  { id: 'R73', order: [0, 3, 1] },
]

export { PROGRESSION_TEMPLATES }
export type { ProgressionTemplate }

export function secureRandom(): number {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) throw new Error('当前浏览器不支持安全随机源，无法开始练习。')
  const values = new Uint32Array(1)
  cryptoApi.getRandomValues(values)
  return values[0] / 0x1_0000_0000
}

function randomIndex(length: number, random: RandomSource): number {
  if (length < 1) throw new Error('Cannot choose from an empty list.')
  if (random !== secureRandom) return Math.floor(random() * length)
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) throw new Error('Secure random source is unavailable.')
  const range = 0x1_0000_0000
  const limit = range - (range % length)
  const values = new Uint32Array(1)
  do cryptoApi.getRandomValues(values)
  while (values[0] >= limit)
  return values[0] % length
}

function randomId(prefix: string): string {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) throw new Error('当前浏览器不支持安全随机源，无法开始练习。')
  if (cryptoApi.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
  const values = new Uint32Array(2)
  cryptoApi.getRandomValues(values)
  return `${prefix}-${values[0].toString(36)}${values[1].toString(36)}`
}

export function pickOne<T>(values: T[], random: RandomSource = secureRandom): T {
  if (!values.length) throw new Error('Cannot choose from an empty list.')
  return values[randomIndex(values.length, random)]
}

export function shuffle<T>(values: T[], random: RandomSource = secureRandom): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function isTrainableInterval(identity: IntervalIdentity): boolean {
  if (identity.degree === 2 && identity.quality === 'augmented') return false
  if (identity.degree === 3 && (identity.quality === 'diminished' || identity.quality === 'augmented')) return false
  if (identity.degree === 4 && identity.quality === 'diminished') return false
  if (identity.degree === 6 && (identity.quality === 'diminished' || identity.quality === 'augmented')) return false
  return !(identity.degree === 7 && identity.quality === 'augmented')
}

function writtenNotes(accidentals: Accidental[]): NoteSpelling[] {
  const notes: NoteSpelling[] = []
  for (let octave = 3; octave <= 5; octave += 1) {
    for (const letter of LETTERS) {
      for (const accidental of accidentals) {
        const note = makeNote(letter, accidental, octave)
        if (note.midi >= INTERVAL_LOWER_MIN_MIDI && note.midi <= AUDIO_MAX_MIDI) notes.push(note)
      }
    }
  }
  return notes
}

function intervalCandidates(settings: IntervalSettings): Array<{ lower: NoteSpelling; upper: NoteSpelling; answer: IntervalIdentity }> {
  const notes = writtenNotes(settings.difficulty === 'basic' ? [0] : [-1, 0, 1])
  const candidates: Array<{ lower: NoteSpelling; upper: NoteSpelling; answer: IntervalIdentity }> = []
  for (const lower of notes) {
    if (lower.midi > INTERVAL_LOWER_MAX_MIDI) continue
    for (const upper of notes) {
      if (upper.midi <= lower.midi) continue
      try {
        const answer = analyzeInterval(lower, upper)
        if (settings.degrees.includes(answer.degree) && isTrainableInterval(answer)) candidates.push({ lower, upper, answer })
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
    .filter(isTrainableInterval)
    .filter((identity) => difficulty === 'advanced' || basicLabels.has(identity.label))
}

export function createIntervalAudition(lower: NoteSpelling, identity: IntervalIdentity): [NoteSpelling, NoteSpelling] {
  const lowerIndex = LETTERS.indexOf(lower.letter)
  const upperIndex = (lowerIndex + identity.degree - 1) % 7
  const upperOctave = lower.octave + (upperIndex <= lowerIndex ? 1 : 0)
  const targetMidi = lower.midi + identity.semitones
  if (targetMidi > AUDIO_MAX_MIDI) throw new Error(`Fixed-low audition for ${identity.label} exceeds F5.`)
  const naturalMidi = makeNote(LETTERS[upperIndex], 0, upperOctave).midi
  const accidental = (targetMidi - naturalMidi) as Accidental
  if (accidental < -3 || accidental > 3) throw new Error(`Fixed-low audition for ${identity.label} requires an unsupported accidental.`)
  return [lower, makeNote(LETTERS[upperIndex], accidental, upperOctave)]
}

export function createIntervalExample(identity: IntervalIdentity): [NoteSpelling, NoteSpelling] {
  return createIntervalAudition(makeNote('C', 0, 4), identity)
}

export function createScaleDegreeAudition(question: ScaleDegreeQuestion, degree: ScaleDegree): NoteSpelling {
  const pitch = question.key.notes[degree - 1]
  return [question.note.octave - 1, question.note.octave, question.note.octave + 1]
    .map((octave) => makeNote(pitch.letter, pitch.accidental, octave))
    .filter((note) => note.midi >= AUDIO_MIN_MIDI && note.midi <= AUDIO_MAX_MIDI)
    .sort((left, right) => Math.abs(left.midi - question.note.midi) - Math.abs(right.midi - question.note.midi))[0]
}

function intervalQuestionIdentity(lower: NoteSpelling, upper: NoteSpelling): string {
  return `interval:${lower.displayName}:${upper.displayName}`
}

export function createIntervalQuestion(settings: IntervalSettings, random: RandomSource = secureRandom, excludedIdentity = ''): IntervalQuestion {
  const candidates = intervalCandidates(settings)
  if (!candidates.length) throw new Error('No interval candidates match the selected settings.')
  const alternatives = candidates.filter((candidate) => intervalQuestionIdentity(candidate.lower, candidate.upper) !== excludedIdentity)
  const candidate = pickOne(alternatives.length ? alternatives : candidates, random)
  return {
    kind: 'interval',
    id: randomId('interval'),
    ...candidate,
    options: intervalOptionsFor(settings.degrees, settings.difficulty),
  }
}

function createOrderedTriadVoicing(tones: [PitchSpelling, PitchSpelling, PitchSpelling], order: [number, number, number]): [NoteSpelling, NoteSpelling, NoteSpelling] {
  const orderedTones = order.map((index) => tones[index])
  const candidates: NoteSpelling[][] = []
  for (let startingOctave = 3; startingOctave <= 5; startingOctave += 1) {
    const voiced: NoteSpelling[] = []
    for (const pitch of orderedTones) {
      let octave = startingOctave
      let note = makeNote(pitch.letter, pitch.accidental, octave)
      while (voiced.length && note.midi <= voiced[voiced.length - 1].midi) {
        octave += 1
        note = makeNote(pitch.letter, pitch.accidental, octave)
      }
      voiced.push(note)
    }
    if (voiced.every((note) => note.midi >= AUDIO_MIN_MIDI && note.midi <= AUDIO_MAX_MIDI)) candidates.push(voiced)
  }
  if (!candidates.length) throw new Error('Triad voicing left the supported staff range.')
  const voiced = candidates.reduce((best, candidate) => {
    const score = Math.abs(candidate[0].midi - 60) * 3 + candidate.reduce((total, note) => total + Math.abs(note.midi - 64), 0)
    const bestScore = Math.abs(best[0].midi - 60) * 3 + best.reduce((total, note) => total + Math.abs(note.midi - 64), 0)
    return score < bestScore ? candidate : best
  })
  return voiced as [NoteSpelling, NoteSpelling, NoteSpelling]
}

export function createVoicing(tones: [PitchSpelling, PitchSpelling, PitchSpelling], inversion: Inversion): [NoteSpelling, NoteSpelling, NoteSpelling] {
  return createOrderedTriadVoicing(tones, [inversion, (inversion + 1) % 3, (inversion + 2) % 3])
}

export function createSpreadVoicing(tones: [PitchSpelling, PitchSpelling, PitchSpelling], pattern: SpreadTriadPattern): [NoteSpelling, NoteSpelling, NoteSpelling] {
  const definition = SPREAD_TRIAD_PATTERNS.find((item) => item.id === pattern)
  if (!definition) throw new Error(`Unknown spread-triad pattern: ${pattern}`)
  return createOrderedTriadVoicing(tones, definition.order)
}

function triadsForSpellingLevel(settings: TriadSettings): TriadIdentity[] {
  const unique = new Map<string, TriadIdentity>()
  for (const key of keysForCircleLevel(settings.spellingLevel)) {
    for (let degree = 1 as ScaleDegree; degree <= 7; degree = (degree + 1) as ScaleDegree) {
      const triad = buildTriad(key, degree)
      if (settings.qualities.includes(triad.quality) && !unique.has(triad.symbol)) unique.set(triad.symbol, triad)
    }
  }
  return [...unique.values()]
}

export function createTriadFillQuestion(settings: TriadSettings, random: RandomSource = secureRandom, excludedIdentity = '', forcedInversion?: Inversion, forcedQuality?: TriadIdentity['quality']): TriadFillQuestion {
  const inversions = forcedInversion === undefined ? [0, 1, 2] as Inversion[] : [forcedInversion]
  const triads = triadsForSpellingLevel(settings).filter((triad) => !forcedQuality || triad.quality === forcedQuality)
  const candidates = triads.flatMap((triad) => inversions.map((inversion) => ({ triad, inversion })))
  const alternatives = candidates.filter(({ triad, inversion }) => `triad-fill:${triad.symbol}:${inversion}` !== excludedIdentity)
  const { triad, inversion } = pickOne(alternatives.length ? alternatives : candidates, random)
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

export function createSpreadTriadFillQuestion(settings: TriadSettings, random: RandomSource = secureRandom, excludedIdentity = '', forcedPattern?: SpreadTriadPattern, forcedQuality?: TriadIdentity['quality']): SpreadTriadFillQuestion {
  const patterns = forcedPattern ? [forcedPattern] : SPREAD_TRIAD_PATTERNS.map((item) => item.id)
  const triads = triadsForSpellingLevel(settings).filter((triad) => !forcedQuality || triad.quality === forcedQuality)
  const candidates = triads.flatMap((triad) => patterns.flatMap((pattern) => {
    try {
      return [{ triad, pattern, notes: createSpreadVoicing(triad.tones, pattern) }]
    } catch {
      return []
    }
  }))
  const alternatives = candidates.filter(({ triad, pattern }) => `spread-triad-fill:${triad.symbol}:${pattern}` !== excludedIdentity)
  const { triad, pattern, notes } = pickOne(alternatives.length ? alternatives : candidates, random)
  return {
    kind: 'spread-triad-fill',
    id: randomId('spread-triad-fill'),
    triad,
    pattern,
    notes,
    answers: notes.map((note) => pitchName(note)) as [string, string, string],
  }
}

export function createChordToneQuestion(settings: TriadSettings, random: RandomSource = secureRandom, excludedIdentity = ''): ChordToneQuestion {
  const candidates = triadsForSpellingLevel(settings).flatMap((triad) => ([1, 2] as const).map((targetIndex) => ({ triad, targetIndex })))
  const alternatives = candidates.filter(({ triad, targetIndex }) => `chord-tone:${triad.symbol}:${targetIndex === 1 ? 'third' : 'fifth'}` !== excludedIdentity)
  const { triad, targetIndex } = pickOne(alternatives.length ? alternatives : candidates, random)
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

function pitchEquals(left: PitchSpelling, right: PitchSpelling): boolean {
  return left.letter === right.letter && left.accidental === right.accidental
}

function noteAtOrAbove(pitch: PitchSpelling, minimum: number): NoteSpelling {
  let octave = 2
  let note = makeNote(pitch.letter, pitch.accidental, octave)
  while (note.midi < minimum) {
    octave += 1
    note = makeNote(pitch.letter, pitch.accidental, octave)
  }
  return note
}

function voicingOrder(pattern: Drop2Pattern | ShellPattern): number[] {
  const drop2 = DROP2_PATTERNS.find((item) => item.id === pattern)
  if (drop2) return drop2.order
  const shell = SHELL_PATTERNS.find((item) => item.id === pattern)
  if (!shell) throw new Error(`Unknown seventh-chord voicing pattern: ${pattern}`)
  return shell.order
}

function seventhVoicingCandidates(chord: SeventhChordIdentity, patterns: Array<Drop2Pattern | ShellPattern>): NoteSpelling[][] {
  const candidates: NoteSpelling[][] = []
  for (const pattern of patterns) {
    const orderedPitches = voicingOrder(pattern).map((index) => chord.tones[index])
    for (let startingOctave = 2; startingOctave <= 5; startingOctave += 1) {
      const notes = [makeNote(orderedPitches[0].letter, orderedPitches[0].accidental, startingOctave)]
      orderedPitches.slice(1).forEach((pitch) => notes.push(noteAtOrAbove(pitch, notes[notes.length - 1].midi + 1)))
      if (notes[0].midi < AUDIO_MIN_MIDI || notes.at(-1)!.midi > AUDIO_MAX_MIDI) continue
      candidates.push(notes)
    }
  }
  return [...new Map(candidates.map((notes) => [notes.map((note) => note.midi).join(','), notes])).values()]
}

export function createSeventhVoicing(chord: SeventhChordIdentity, pattern: Drop2Pattern | ShellPattern): { answer: ChordMember[]; notes: NoteSpelling[] } {
  const order = voicingOrder(pattern)
  const members = chordMembers(chord.quality)
  const candidates = seventhVoicingCandidates(chord, [pattern])
  if (!candidates.length) throw new Error(`Unable to voice ${chord.symbol} as ${pattern} inside G3–F5.`)
  const notes = candidates.reduce((best, candidate) => {
    const score = candidate.reduce((total, note) => total + Math.abs(note.midi - 65), 0) + Math.abs(candidate[0].midi - 60) * 2
    const bestScore = best.reduce((total, note) => total + Math.abs(note.midi - 65), 0) + Math.abs(best[0].midi - 60) * 2
    return score < bestScore ? candidate : best
  })
  return { answer: order.map((index) => members[index]), notes }
}

export function createSeventhVoicingQuestion(
  kind: 'drop2-voicing' | 'shell-voicing',
  settings: SeventhChordSettings,
  quality: SeventhChordSettings['qualities'][number],
  pattern: Drop2Pattern | ShellPattern,
  random: RandomSource,
  excludedIdentity = '',
): Drop2VoicingQuestion | ShellVoicingQuestion {
  if (!settings.qualities.includes(quality)) throw new Error('Selected seventh-chord quality is disabled.')
  const candidates = SEVENTH_ROOTS.flatMap((root) => {
    const chord = buildSeventhChord(root, quality)
    try {
      return [{ chord, ...createSeventhVoicing(chord, pattern) }]
    } catch {
      return []
    }
  })
  if (!candidates.length) throw new Error(`当前音域无法生成 ${pattern}。`)
  const alternatives = candidates.filter(({ chord }) => `${kind}:${chord.symbol}:${pattern}` !== excludedIdentity)
  const { chord, answer, notes } = pickOne(alternatives.length ? alternatives : candidates, random)
  if (kind === 'drop2-voicing') {
    return {
      kind,
      id: randomId(kind),
      chord,
      pattern: pattern as Drop2Pattern,
      answer: answer as Drop2VoicingQuestion['answer'],
      notes: notes as Drop2VoicingQuestion['notes'],
    }
  }
  return {
    kind,
    id: randomId(kind),
    chord,
    pattern: pattern as ShellPattern,
    answer: answer as ShellVoicingQuestion['answer'],
    notes: notes as ShellVoicingQuestion['notes'],
  }
}

function uniquePermutations<T>(values: T[]): T[][] {
  const results: T[][] = []
  const visit = (prefix: T[], remaining: T[]) => {
    if (!remaining.length) {
      results.push(prefix)
      return
    }
    const seen = new Set<string>()
    remaining.forEach((value, index) => {
      const key = JSON.stringify(value)
      if (seen.has(key)) return
      seen.add(key)
      visit([...prefix, value], [...remaining.slice(0, index), ...remaining.slice(index + 1)])
    })
  }
  visit([], values)
  return results
}

function voicingCandidates(triad: TriadIdentity, voiceCount: ProgressionVoiceCount, forcedInversion?: Inversion): NoteSpelling[][] {
  const inversions = forcedInversion === undefined ? [0, 1, 2] as Inversion[] : [forcedInversion]
  const duplicateChoices = voiceCount === 3
    ? [undefined]
    : triad.quality === 'diminished'
      ? [triad.tones[1], triad.tones[0], triad.tones[2]]
      : [triad.tones[0], triad.tones[1], triad.tones[2]]

  const allCandidates: NoteSpelling[][] = []
  for (const duplicate of duplicateChoices) {
    for (const inversion of inversions) {
      const bassPitch = triad.tones[inversion]
      const full = duplicate ? [...triad.tones, duplicate] : [...triad.tones]
      const bassIndex = full.findIndex((pitch) => pitchEquals(pitch, bassPitch))
      const remaining = [...full.slice(0, bassIndex), ...full.slice(bassIndex + 1)]
      for (const bassOctave of [3, 4]) {
        const bass = makeNote(bassPitch.letter, bassPitch.accidental, bassOctave)
        for (const upper of uniquePermutations(remaining)) {
          const voiced = [bass]
          upper.forEach((pitch) => voiced.push(noteAtOrAbove(pitch, voiced[voiced.length - 1].midi + 1)))
          if (voiced[0].midi < AUDIO_MIN_MIDI || voiced[voiced.length - 1].midi > AUDIO_MAX_MIDI) continue
          if (voiceCount === 4 && (voiced[1].midi - voiced[0].midi > 12 || voiced[2].midi - voiced[1].midi > 12 || voiced[3].midi - voiced[2].midi > 12)) continue
          allCandidates.push(voiced)
        }
      }
    }
  }
  const unique = new Map(allCandidates.map((item) => [item.map((note) => note.midi).join(','), item]))
  return [...unique.values()]
}

function direction(from: number, to: number): number {
  return Math.sign(to - from)
}

export function hasParallelPerfects(previous: NoteSpelling[], next: NoteSpelling[]): boolean {
  for (let low = 0; low < previous.length; low += 1) {
    for (let high = low + 1; high < previous.length; high += 1) {
      const oldInterval = mod(previous[high].midi - previous[low].midi, 12)
      const newInterval = mod(next[high].midi - next[low].midi, 12)
      const oldPerfect = oldInterval === 0 || oldInterval === 7
      const newPerfect = newInterval === 0 || newInterval === 7
      if (oldPerfect && newPerfect && direction(previous[low].midi, next[low].midi) === direction(previous[high].midi, next[high].midi) && direction(previous[low].midi, next[low].midi) !== 0) return true
    }
  }
  return false
}

function movementCost(previous: NoteSpelling[], next: NoteSpelling[], previousTriad: TriadIdentity, nextTriad: TriadIdentity, key: MajorKey): number {
  let cost = next.reduce((total, note, index) => total + Math.abs(note.midi - previous[index].midi), 0)
  next.forEach((note, index) => {
    const leap = Math.abs(note.midi - previous[index].midi)
    if (leap > (index === 0 ? 12 : 5)) cost += 30
    if (note.midi === previous[index].midi) cost -= 4
  })
  if (previousTriad.scaleDegree === 5 && nextTriad.scaleDegree === 1) {
    const leadingPitchClass = mod(makeNote(key.notes[6].letter, key.notes[6].accidental, 4).midi, 12)
    previous.forEach((note, index) => {
      if (mod(note.midi, 12) === leadingPitchClass && next[index].midi - note.midi !== 1) cost += 45
    })
  }
  return cost
}

function voicingPreferenceCost(voicing: NoteSpelling[], triad: TriadIdentity, index: number, length: number): number {
  const bassIndex = triad.tones.findIndex((tone) => pitchEquals(voicing[0], tone))
  let cost = 0
  if ((index === 0 || index === length - 1) && triad.scaleDegree === 1 && bassIndex !== 0) cost += 18
  if (triad.quality === 'diminished' && bassIndex !== 1) cost += 12
  if (voicing.length === 4) {
    const counts = triad.tones.map((tone) => voicing.filter((note) => pitchEquals(note, tone)).length)
    const preferredIndex = triad.quality === 'diminished' ? 1 : 0
    if (counts[preferredIndex] < 2) cost += 6
  }
  return cost
}

export function createProgressionVoicings(key: MajorKey, triads: TriadIdentity[], voiceCount: ProgressionVoiceCount): NoteSpelling[][] {
  const candidateSets = triads.map((triad) => voicingCandidates(triad, voiceCount))
  if (candidateSets.some((items) => !items.length)) throw new Error('Unable to create a valid progression voicing.')
  const costs = candidateSets.map((items) => items.map(() => Number.POSITIVE_INFINITY))
  const back = candidateSets.map((items) => items.map(() => -1))
  costs[0] = candidateSets[0].map((voicing) => voicing.reduce((total, note) => total + Math.abs(note.midi - 60), 0) / 20 + voicingPreferenceCost(voicing, triads[0], 0, triads.length))
  for (let index = 1; index < candidateSets.length; index += 1) {
    candidateSets[index].forEach((next, nextIndex) => {
      candidateSets[index - 1].forEach((previous, previousIndex) => {
        if (hasParallelPerfects(previous, next)) return
        const cost = costs[index - 1][previousIndex] + movementCost(previous, next, triads[index - 1], triads[index], key) + voicingPreferenceCost(next, triads[index], index, triads.length)
        if (cost < costs[index][nextIndex]) {
          costs[index][nextIndex] = cost
          back[index][nextIndex] = previousIndex
        }
      })
    })
    if (costs[index].every((cost) => !Number.isFinite(cost))) throw new Error('Unable to create parallel-free progression voicing.')
  }
  let selected = costs[costs.length - 1].reduce((best, cost, index, values) => cost < values[best] ? index : best, 0)
  const result: NoteSpelling[][] = []
  for (let index = candidateSets.length - 1; index >= 0; index -= 1) {
    result.unshift(candidateSets[index][selected])
    selected = back[index][selected]
  }
  return result
}

export function createJazzProgressionVoicings(chords: SeventhChordIdentity[], mode: Extract<ProgressionVoicingMode, 'shell' | 'drop2'>): NoteSpelling[][] {
  const patterns = mode === 'shell'
    ? SHELL_PATTERNS.map((item) => item.id)
    : DROP2_PATTERNS.map((item) => item.id)
  const candidateSets = chords.map((chord) => seventhVoicingCandidates(chord, patterns))
  if (candidateSets.some((items) => !items.length)) throw new Error(`Unable to create a valid ${mode} progression voicing.`)
  const costs = candidateSets.map((items) => items.map(() => Number.POSITIVE_INFINITY))
  const back = candidateSets.map((items) => items.map(() => -1))
  costs[0] = candidateSets[0].map((voicing) => voicing.reduce((total, note) => total + Math.abs(note.midi - 64), 0) / 20)
  for (let chordIndex = 1; chordIndex < candidateSets.length; chordIndex += 1) {
    candidateSets[chordIndex].forEach((next, nextIndex) => {
      candidateSets[chordIndex - 1].forEach((previous, previousIndex) => {
        const movement = next.reduce((total, note, voiceIndex) => total + Math.abs(note.midi - previous[voiceIndex].midi), 0)
        const largestLeap = next.reduce((largest, note, voiceIndex) => Math.max(largest, Math.abs(note.midi - previous[voiceIndex].midi)), 0)
        const cost = costs[chordIndex - 1][previousIndex] + movement + largestLeap / 100
        if (cost < costs[chordIndex][nextIndex]) {
          costs[chordIndex][nextIndex] = cost
          back[chordIndex][nextIndex] = previousIndex
        }
      })
    })
  }
  let selected = costs.at(-1)!.reduce((best, cost, index, values) => cost < values[best] ? index : best, 0)
  const result: NoteSpelling[][] = []
  for (let chordIndex = candidateSets.length - 1; chordIndex >= 0; chordIndex -= 1) {
    result.unshift(candidateSets[chordIndex][selected])
    selected = back[chordIndex][selected]
  }
  return result
}

function createCadence(key: MajorKey): [NoteSpelling[], NoteSpelling[]] {
  const triads = [buildTriad(key, 5), buildTriad(key, 1)]
  const voicings = createProgressionVoicings(key, triads, 4)
  return [voicings[0], voicings[1]]
}

export function createScaleDegreeQuestion(key: MajorKey, degree: ScaleDegree, direction: Exclude<KeyPracticeDirection, 'mixed'>): ScaleDegreeQuestion {
  const note = makeNote(key.notes[degree - 1].letter, key.notes[degree - 1].accidental, 4)
  return { kind: 'scale-degree', id: randomId('scale-degree'), key, degree, note, direction, cadence: createCadence(key) }
}

export function createProgressionQuestion(key: MajorKey, template: ProgressionTemplate, direction: Exclude<KeyPracticeDirection, 'mixed'>, voicingMode: ProgressionVoicingMode): ProgressionQuestion {
  const seventhMode = voicingMode === 'shell' || voicingMode === 'drop2'
  const chords = template.degrees.map((degree) => seventhMode ? buildDiatonicSeventhChord(key, degree) : buildTriad(key, degree)) as ProgressionQuestion['chords']
  const voicings = seventhMode
    ? createJazzProgressionVoicings(chords as SeventhChordIdentity[], voicingMode)
    : createProgressionVoicings(key, chords as TriadIdentity[], voicingMode === 'three' ? 3 : 4)
  return {
    kind: 'progression',
    id: randomId('progression'),
    key,
    templateId: template.id,
    degrees: template.degrees,
    chords,
    direction,
    voicingMode,
    voicings: voicings as ProgressionQuestion['voicings'],
  }
}

function hasSafeAdjacency(questions: PracticeQuestion[], previousIdentity: string): boolean {
  let previous = previousIdentity
  for (const question of questions) {
    const identity = questionIdentity(question)
    if (identity === previous) return false
    previous = identity
  }
  return true
}

export function arrangeSessionQuestions<T extends PracticeQuestion>(questions: T[], previousSignature = '', previousIdentity = '', random: RandomSource = secureRandom): T[] {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = shuffle(questions, random)
    if (hasSafeAdjacency(candidate, previousIdentity) && sessionSignature(candidate) !== previousSignature) return candidate
  }

  const remaining = [...questions]
  const arranged: T[] = []
  let previous = previousIdentity
  while (remaining.length) {
    const counts = new Map<string, number>()
    remaining.forEach((question) => counts.set(questionIdentity(question), (counts.get(questionIdentity(question)) ?? 0) + 1))
    const eligible = remaining.map((question, index) => ({ question, index, count: counts.get(questionIdentity(question)) ?? 0 })).filter(({ question }) => questionIdentity(question) !== previous)
    if (!eligible.length) throw new Error('Unable to arrange questions without adjacent duplicates.')
    const maxCount = Math.max(...eligible.map((item) => item.count))
    const selected = pickOne(eligible.filter((item) => item.count === maxCount), random)
    const [question] = remaining.splice(selected.index, 1)
    arranged.push(question)
    previous = questionIdentity(question)
  }

  if (sessionSignature(arranged) !== previousSignature) return arranged
  for (let offset = 1; offset < arranged.length; offset += 1) {
    const rotated = [...arranged.slice(offset), ...arranged.slice(0, offset)]
    if (hasSafeAdjacency(rotated, previousIdentity) && sessionSignature(rotated) !== previousSignature) return rotated
  }
  throw new Error('Unable to create a new non-repeating question order.')
}

export function sessionSignature(questions: PracticeQuestion[]): string {
  return questions.map((question) => {
    if (question.kind === 'scale-degree') return `${question.degree}:${question.direction}`
    if (question.kind === 'progression') return `${question.templateId}:${question.direction}:${question.voicingMode}`
    return question.id
  }).join('|')
}

export function questionIdentity(question: PracticeQuestion): string {
  if (question.kind === 'interval') return intervalQuestionIdentity(question.lower, question.upper)
  if (question.kind === 'triad-fill') return `triad-fill:${question.triad.symbol}:${question.inversion}`
  if (question.kind === 'spread-triad-fill') return `spread-triad-fill:${question.triad.symbol}:${question.pattern}`
  if (question.kind === 'chord-tone') return `chord-tone:${question.triad.symbol}:${question.target}`
  if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') return `${question.kind}:${question.chord.symbol}:${question.pattern}`
  if (question.kind === 'scale-degree') return `scale-degree:${question.key.name}:${question.degree}:${question.direction}`
  return `progression:${question.key.name}:${question.templateId}:${question.direction}:${question.voicingMode}`
}

export function coverageOrderKey(kind: 'scale-degree' | 'progression', settings: KeyPracticeSettings): string {
  const direction = kind === 'scale-degree' ? settings.scaleDirection : settings.progressionDirection
  return `${kind}:${settings.keyName}:${direction}${kind === 'progression' ? `:${settings.voicingMode}` : ''}`
}

export function practiceSequenceKey(kind: PracticeKind, intervalSettings: IntervalSettings, triadSettings: TriadSettings, seventhSettings: SeventhChordSettings, keySettings: KeyPracticeSettings): string {
  if (kind === 'interval') return `interval:${[...intervalSettings.degrees].sort().join(',')}:${intervalSettings.difficulty}`
  if (kind === 'triad-fill' || kind === 'spread-triad-fill' || kind === 'chord-tone') return `${kind}:${[...triadSettings.qualities].sort().join(',')}:${triadSettings.spellingLevel}`
  if (kind === 'drop2-voicing' || kind === 'shell-voicing') return `${kind}:${[...seventhSettings.qualities].sort().join(',')}`
  if (kind === 'scale-degree') return `${coverageOrderKey(kind, keySettings)}`
  return coverageOrderKey(kind, keySettings)
}

export function questionStorageKey(question: PracticeQuestion): string {
  if (question.kind === 'interval') return `interval:${question.lower.displayName}:${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `triad-fill:${question.triad.symbol}:${question.inversion}`
  if (question.kind === 'spread-triad-fill') return `spread-triad-fill:${question.triad.symbol}:${question.pattern}`
  if (question.kind === 'chord-tone') return `chord-tone:${question.triad.symbol}:${question.target}`
  if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') return `${question.kind}:${question.chord.symbol}:${question.pattern}`
  if (question.kind === 'scale-degree') return `scale-degree:${question.key.name}:${question.degree}:${question.direction}`
  return `progression:${question.key.name}:${question.templateId}:${question.direction}:${question.voicingMode}`
}

export function questionSummary(question: PracticeQuestion, notation: ChordNotation = 'text'): string {
  if (question.kind === 'interval') return `${question.lower.displayName} — ${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `${question.triad.label} · ${INVERSION_TEXT[question.inversion]}`
  if (question.kind === 'spread-triad-fill') return `${question.triad.label} · Spread ${question.pattern}`
  if (question.kind === 'chord-tone') return `${question.triad.label} · ${question.target === 'third' ? '三音' : '五音'}`
  if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') return `${formatChordSymbol(question.chord, notation)} · ${question.pattern}`
  if (question.kind === 'scale-degree') return `${pitchName(question.key.tonic)} 大调 · ${question.degree} 级`
  return `${pitchName(question.key.tonic)} 大调 · ${question.chords.map((chord) => chord.roman).join('–')} · ${question.voicingMode}`
}
