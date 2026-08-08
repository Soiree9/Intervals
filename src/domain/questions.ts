import {
  ALL_INTERVAL_IDENTITIES,
  INVERSION_TEXT,
  LETTERS,
  analyzeInterval,
  buildTriad,
  keysForCircleLevel,
  majorKeyByName,
  makeNote,
  mod,
  pitchName,
} from './music'
import type {
  Accidental,
  ChordToneQuestion,
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
  ProgressionVoiceCount,
  ScaleDegree,
  ScaleDegreeQuestion,
  TriadFillQuestion,
  TriadIdentity,
  TriadSettings,
} from './types'

export type RandomSource = () => number

export interface ProgressionTemplate {
  id: string
  degrees: [ScaleDegree, ScaleDegree, ScaleDegree, ScaleDegree]
}

export const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
  { id: 'pop-1564', degrees: [1, 5, 6, 4] },
  { id: 'pop-1645', degrees: [1, 6, 4, 5] },
  { id: 'pop-6415', degrees: [6, 4, 1, 5] },
  { id: 'cadence-1451', degrees: [1, 4, 5, 1] },
  { id: 'cadence-1251', degrees: [1, 2, 5, 1] },
  { id: 'cadence-2511', degrees: [2, 5, 1, 1] },
  { id: 'lift-1345', degrees: [1, 3, 4, 5] },
  { id: 'circle-3625', degrees: [3, 6, 2, 5] },
  { id: 'leading-1271', degrees: [1, 2, 7, 1] },
]

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
  for (const lower of notes) {
    for (const upper of notes) {
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

export function createIntervalAudition(lower: NoteSpelling, identity: IntervalIdentity): [NoteSpelling, NoteSpelling] {
  const lowerIndex = LETTERS.indexOf(lower.letter)
  const upperIndex = (lowerIndex + identity.degree - 1) % 7
  const upperOctave = lower.octave + (upperIndex <= lowerIndex ? 1 : 0)
  const targetMidi = lower.midi + identity.semitones
  const naturalMidi = makeNote(LETTERS[upperIndex], 0, upperOctave).midi
  const accidental = (targetMidi - naturalMidi) as Accidental
  if (accidental < -3 || accidental > 3) throw new Error(`Fixed-low audition for ${identity.label} requires an unsupported accidental.`)
  return [lower, makeNote(LETTERS[upperIndex], accidental, upperOctave)]
}

export function createIntervalExample(identity: IntervalIdentity): [NoteSpelling, NoteSpelling] {
  return createIntervalAudition(makeNote('C', 0, 4), identity)
}

export function createIntervalQuestion(settings: IntervalSettings, random: RandomSource = secureRandom): IntervalQuestion {
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

function chooseTriad(settings: TriadSettings, random: RandomSource): TriadIdentity {
  return pickOne(triadsForSpellingLevel(settings), random)
}

export function createTriadFillQuestion(settings: TriadSettings, random: RandomSource = secureRandom): TriadFillQuestion {
  const triad = chooseTriad(settings, random)
  const inversion = randomIndex(3, random) as Inversion
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

export function createChordToneQuestion(settings: TriadSettings, random: RandomSource = secureRandom): ChordToneQuestion {
  const triad = chooseTriad(settings, random)
  const targetIndex = (1 + randomIndex(2, random)) as 1 | 2
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
  const inversions = forcedInversion === undefined ? (triad.quality === 'diminished' ? [1] as Inversion[] : [0, 1, 2] as Inversion[]) : [forcedInversion]
  const candidates: NoteSpelling[][] = []
  for (const inversion of inversions) {
    const bassPitch = triad.tones[inversion]
    const full = voiceCount === 3
      ? [...triad.tones]
      : [...triad.tones, triad.quality === 'diminished' ? triad.tones[1] : triad.tones[0]]
    const bassIndex = full.findIndex((pitch) => pitchEquals(pitch, bassPitch))
    const remaining = [...full.slice(0, bassIndex), ...full.slice(bassIndex + 1)]
    for (const bassOctave of voiceCount === 3 ? [3, 4] : [2, 3]) {
      const bass = makeNote(bassPitch.letter, bassPitch.accidental, bassOctave)
      for (const upper of uniquePermutations(remaining)) {
        const voiced = [bass]
        upper.forEach((pitch) => voiced.push(noteAtOrAbove(pitch, voiced[voiced.length - 1].midi + 1)))
        const maxMidi = voiceCount === 3 ? 79 : 84
        if (voiced[0].midi < 36 || voiced[voiced.length - 1].midi > maxMidi) continue
        if (voiceCount === 4 && (voiced[1].midi - voiced[0].midi > 19 || voiced[2].midi - voiced[1].midi > 12 || voiced[3].midi - voiced[2].midi > 12)) continue
        candidates.push(voiced)
      }
    }
  }
  const unique = new Map(candidates.map((item) => [item.map((note) => note.midi).join(','), item]))
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

export function createProgressionVoicings(key: MajorKey, triads: TriadIdentity[], voiceCount: ProgressionVoiceCount): NoteSpelling[][] {
  const candidateSets = triads.map((triad, index) => {
    const isOpeningTonic = index === 0 && triad.scaleDegree === 1
    const isClosingTonic = index === triads.length - 1 && triad.scaleDegree === 1
    return voicingCandidates(triad, voiceCount, isOpeningTonic || isClosingTonic ? 0 : undefined)
  })
  if (candidateSets.some((items) => !items.length)) throw new Error('Unable to create a valid progression voicing.')
  const costs = candidateSets.map((items) => items.map(() => Number.POSITIVE_INFINITY))
  const back = candidateSets.map((items) => items.map(() => -1))
  costs[0] = candidateSets[0].map((voicing) => voicing.reduce((total, note) => total + Math.abs(note.midi - 60), 0) / 20)
  for (let index = 1; index < candidateSets.length; index += 1) {
    candidateSets[index].forEach((next, nextIndex) => {
      candidateSets[index - 1].forEach((previous, previousIndex) => {
        if (hasParallelPerfects(previous, next)) return
        const cost = costs[index - 1][previousIndex] + movementCost(previous, next, triads[index - 1], triads[index], key)
        if (cost < costs[index][nextIndex]) {
          costs[index][nextIndex] = cost
          back[index][nextIndex] = previousIndex
        }
      })
    })
    if (costs[index].every((cost) => !Number.isFinite(cost))) {
      candidateSets[index].forEach((next, nextIndex) => {
        candidateSets[index - 1].forEach((previous, previousIndex) => {
          const cost = costs[index - 1][previousIndex] + movementCost(previous, next, triads[index - 1], triads[index], key) + 500
          if (cost < costs[index][nextIndex]) {
            costs[index][nextIndex] = cost
            back[index][nextIndex] = previousIndex
          }
        })
      })
    }
  }
  let selected = costs[costs.length - 1].reduce((best, cost, index, values) => cost < values[best] ? index : best, 0)
  const result: NoteSpelling[][] = []
  for (let index = candidateSets.length - 1; index >= 0; index -= 1) {
    result.unshift(candidateSets[index][selected])
    selected = back[index][selected]
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

export function createProgressionQuestion(key: MajorKey, template: ProgressionTemplate, direction: Exclude<KeyPracticeDirection, 'mixed'>, voiceCount: ProgressionVoiceCount): ProgressionQuestion {
  const triads = template.degrees.map((degree) => buildTriad(key, degree)) as [TriadIdentity, TriadIdentity, TriadIdentity, TriadIdentity]
  return {
    kind: 'progression',
    id: randomId('progression'),
    key,
    templateId: template.id,
    degrees: template.degrees,
    triads,
    direction,
    voiceCount,
    voicings: createProgressionVoicings(key, triads, voiceCount) as ProgressionQuestion['voicings'],
  }
}

function directionsFor(direction: KeyPracticeDirection, random: RandomSource): Array<Exclude<KeyPracticeDirection, 'mixed'>> {
  return direction === 'mixed'
    ? shuffle([...Array(5).fill('forward'), ...Array(5).fill('reverse')] as Array<Exclude<KeyPracticeDirection, 'mixed'>>, random)
    : Array(10).fill(direction) as Array<Exclude<KeyPracticeDirection, 'mixed'>>
}

function shuffleCoverage<T extends { token: string }>(items: T[], previousSignature: string, random: RandomSource): T[] {
  let next = shuffle(items, random)
  for (let attempt = 0; attempt < 4 && next.map((item) => item.token).join('|') === previousSignature; attempt += 1) next = shuffle(items, random)
  if (next.map((item) => item.token).join('|') === previousSignature && next.length > 1) {
    const offset = 1 + randomIndex(next.length - 1, random)
    next = [...next.slice(offset), ...next.slice(0, offset)]
  }
  return next
}

function createScaleSession(settings: KeyPracticeSettings, random: RandomSource, previousSignature: string): ScaleDegreeQuestion[] {
  const key = majorKeyByName(settings.keyName)
  const degrees = [...([1, 2, 3, 4, 5, 6, 7] as ScaleDegree[]), pickOne([1, 2, 3, 4, 5, 6, 7] as ScaleDegree[], random), pickOne([1, 2, 3, 4, 5, 6, 7] as ScaleDegree[], random), pickOne([1, 2, 3, 4, 5, 6, 7] as ScaleDegree[], random)]
  const directions = directionsFor(settings.scaleDirection, random)
  const entries = degrees.map((degree, index) => ({ degree, direction: directions[index], token: `${degree}:${directions[index]}` }))
  return shuffleCoverage(entries, previousSignature, random).map((entry) => createScaleDegreeQuestion(key, entry.degree, entry.direction))
}

function createProgressionSession(settings: KeyPracticeSettings, random: RandomSource, previousSignature: string): ProgressionQuestion[] {
  const key = majorKeyByName(settings.keyName)
  const templates = [...PROGRESSION_TEMPLATES, pickOne(PROGRESSION_TEMPLATES, random)]
  const directions = directionsFor(settings.progressionDirection, random)
  const entries = templates.map((template, index) => ({ template, direction: directions[index], token: `${template.id}:${directions[index]}` }))
  return shuffleCoverage(entries, previousSignature, random).map((entry) => createProgressionQuestion(key, entry.template, entry.direction, settings.voiceCount))
}

export function createSession(kind: PracticeKind, intervalSettings: IntervalSettings, triadSettings: TriadSettings, keySettings: KeyPracticeSettings, count = 10, random: RandomSource = secureRandom, previousSignature = ''): PracticeQuestion[] {
  if (kind === 'scale-degree') return createScaleSession(keySettings, random, previousSignature)
  if (kind === 'progression') return createProgressionSession(keySettings, random, previousSignature)
  return Array.from({ length: count }, () => kind === 'interval'
    ? createIntervalQuestion(intervalSettings, random)
    : kind === 'triad-fill'
      ? createTriadFillQuestion(triadSettings, random)
      : createChordToneQuestion(triadSettings, random))
}

export function sessionSignature(questions: PracticeQuestion[]): string {
  return questions.map((question) => {
    if (question.kind === 'scale-degree') return `${question.degree}:${question.direction}`
    if (question.kind === 'progression') return `${question.templateId}:${question.direction}`
    return question.id
  }).join('|')
}

export function coverageOrderKey(kind: 'scale-degree' | 'progression', settings: KeyPracticeSettings): string {
  const direction = kind === 'scale-degree' ? settings.scaleDirection : settings.progressionDirection
  return `${kind}:${settings.keyName}:${direction}`
}

export function questionStorageKey(question: PracticeQuestion): string {
  if (question.kind === 'interval') return `interval:${question.lower.displayName}:${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `triad-fill:${question.triad.symbol}:${question.inversion}`
  if (question.kind === 'chord-tone') return `chord-tone:${question.triad.symbol}:${question.target}`
  if (question.kind === 'scale-degree') return `scale-degree:${question.key.name}:${question.degree}:${question.direction}`
  return `progression:${question.key.name}:${question.templateId}:${question.direction}`
}

export function questionSummary(question: PracticeQuestion): string {
  if (question.kind === 'interval') return `${question.lower.displayName} — ${question.upper.displayName}`
  if (question.kind === 'triad-fill') return `${question.triad.label} · ${INVERSION_TEXT[question.inversion]}`
  if (question.kind === 'chord-tone') return `${question.triad.label} · ${question.target === 'third' ? '三音' : '五音'}`
  if (question.kind === 'scale-degree') return `${question.key.name} 大调 · ${question.degree} 级`
  return `${question.key.name} 大调 · ${question.triads.map((triad) => triad.roman).join('–')}`
}
