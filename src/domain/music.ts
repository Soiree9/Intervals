import type {
  Accidental,
  IntervalDegree,
  IntervalIdentity,
  IntervalQuality,
  Letter,
  MajorKey,
  NoteSpelling,
  PitchSpelling,
  TriadIdentity,
  TriadQuality,
} from './types'

export const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL_PITCH_CLASS: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const ACCIDENTAL_TEXT: Record<Accidental, string> = {
  [-1]: '♭',
  0: '',
  1: '♯',
}

const QUALITY_TEXT: Record<IntervalQuality, string> = {
  diminished: '减',
  minor: '小',
  major: '大',
  perfect: '纯',
  augmented: '增',
}

export const TRIAD_QUALITY_TEXT: Record<TriadQuality, string> = {
  major: '大三和弦',
  minor: '小三和弦',
  diminished: '减三和弦',
}

export const INVERSION_TEXT = ['原位', '第一转位', '第二转位'] as const

const MAJOR_BASE_SEMITONES: Record<IntervalDegree, number> = {
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
}

const PERFECT_DEGREES = new Set<IntervalDegree>([4, 5])

export function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

export function pitchName(pitch: PitchSpelling): string {
  return `${pitch.letter}${ACCIDENTAL_TEXT[pitch.accidental]}`
}

export function makeNote(letter: Letter, accidental: Accidental, octave: number): NoteSpelling {
  const midi = (octave + 1) * 12 + NATURAL_PITCH_CLASS[letter] + accidental
  return {
    letter,
    accidental,
    octave,
    midi,
    displayName: `${letter}${ACCIDENTAL_TEXT[accidental]}${octave}`,
  }
}

export function pitchClass(pitch: PitchSpelling): number {
  return mod(NATURAL_PITCH_CLASS[pitch.letter] + pitch.accidental, 12)
}

export function parsePitchName(name: string): PitchSpelling {
  const letter = name[0] as Letter
  const suffix = name.slice(1)
  const accidental: Accidental = suffix === '#' || suffix === '♯' ? 1 : suffix === 'b' || suffix === '♭' ? -1 : 0
  return { letter, accidental }
}

export function intervalLabel(degree: IntervalDegree, quality: IntervalQuality): string {
  const degreeText = ['一', '二', '三', '四', '五', '六', '七'][degree - 1]
  return `${QUALITY_TEXT[quality]}${degreeText}度`
}

export function analyzeInterval(lower: NoteSpelling, upper: NoteSpelling): IntervalIdentity {
  const lowerLetter = LETTERS.indexOf(lower.letter)
  const upperLetter = LETTERS.indexOf(upper.letter)
  const degree = (mod(upperLetter - lowerLetter, 7) + 1) as IntervalDegree
  if (degree < 2 || degree > 7 || upper.midi <= lower.midi) {
    throw new Error('Only ascending simple intervals from a second to a seventh are supported.')
  }

  const semitones = upper.midi - lower.midi
  const delta = semitones - MAJOR_BASE_SEMITONES[degree]
  let quality: IntervalQuality

  if (PERFECT_DEGREES.has(degree)) {
    if (delta === -1) quality = 'diminished'
    else if (delta === 0) quality = 'perfect'
    else if (delta === 1) quality = 'augmented'
    else throw new Error('Unsupported compound interval quality.')
  } else {
    if (delta === -2) quality = 'diminished'
    else if (delta === -1) quality = 'minor'
    else if (delta === 0) quality = 'major'
    else if (delta === 1) quality = 'augmented'
    else throw new Error('Unsupported compound interval quality.')
  }

  return { degree, quality, semitones, label: intervalLabel(degree, quality) }
}

export const ALL_INTERVAL_IDENTITIES: IntervalIdentity[] = ([
  [2, 'minor', 1], [2, 'major', 2], [2, 'augmented', 3],
  [3, 'diminished', 2], [3, 'minor', 3], [3, 'major', 4], [3, 'augmented', 5],
  [4, 'diminished', 4], [4, 'perfect', 5], [4, 'augmented', 6],
  [5, 'diminished', 6], [5, 'perfect', 7], [5, 'augmented', 8],
  [6, 'diminished', 7], [6, 'minor', 8], [6, 'major', 9], [6, 'augmented', 10],
  [7, 'diminished', 9], [7, 'minor', 10], [7, 'major', 11], [7, 'augmented', 12],
] as [IntervalDegree, IntervalQuality, number][]).map(([degree, quality, semitones]) => ({
  degree,
  quality,
  semitones,
  label: intervalLabel(degree, quality),
}))

function accidentalForTarget(letter: Letter, targetPitchClass: number): Accidental {
  const difference = mod(targetPitchClass - NATURAL_PITCH_CLASS[letter], 12)
  if (difference === 0) return 0
  if (difference === 1) return 1
  if (difference === 11) return -1
  throw new Error(`Key spelling for ${letter} would require a double accidental.`)
}

export function buildMajorKey(name: string, signature: number): MajorKey {
  const tonic = parsePitchName(name)
  const tonicLetterIndex = LETTERS.indexOf(tonic.letter)
  const tonicPitchClass = pitchClass(tonic)
  const majorSteps = [0, 2, 4, 5, 7, 9, 11]
  const notes = majorSteps.map((step, index) => {
    const letter = LETTERS[(tonicLetterIndex + index) % 7]
    return { letter, accidental: accidentalForTarget(letter, mod(tonicPitchClass + step, 12)) }
  })
  return { name, tonic, signature, notes }
}

export const MAJOR_KEYS: MajorKey[] = [
  buildMajorKey('C', 0),
  buildMajorKey('G', 1),
  buildMajorKey('F', -1),
  buildMajorKey('D', 2),
  buildMajorKey('Bb', -2),
  buildMajorKey('A', 3),
  buildMajorKey('Eb', -3),
  buildMajorKey('E', 4),
  buildMajorKey('Ab', -4),
  buildMajorKey('B', 5),
  buildMajorKey('Db', -5),
  buildMajorKey('F#', 6),
]

export function keysForCircleLevel(level: 1 | 2 | 3): MajorKey[] {
  return MAJOR_KEYS.slice(0, level === 1 ? 3 : level === 2 ? 7 : 12)
}

const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

export function buildTriad(key: MajorKey, scaleDegree: number): TriadIdentity {
  if (scaleDegree < 1 || scaleDegree > 7) throw new Error('Scale degree must be 1–7.')
  const rootIndex = scaleDegree - 1
  const tones = [
    key.notes[rootIndex],
    key.notes[(rootIndex + 2) % 7],
    key.notes[(rootIndex + 4) % 7],
  ] as [PitchSpelling, PitchSpelling, PitchSpelling]
  const third = mod(pitchClass(tones[1]) - pitchClass(tones[0]), 12)
  const fifth = mod(pitchClass(tones[2]) - pitchClass(tones[0]), 12)
  let quality: TriadQuality
  if (third === 4 && fifth === 7) quality = 'major'
  else if (third === 3 && fifth === 7) quality = 'minor'
  else if (third === 3 && fifth === 6) quality = 'diminished'
  else throw new Error(`Unexpected diatonic triad: ${third}/${fifth}`)

  const rootName = pitchName(tones[0])
  const symbolSuffix = quality === 'major' ? '' : quality === 'minor' ? 'm' : '°'
  return {
    keyName: key.name,
    scaleDegree,
    roman: ROMAN[rootIndex],
    root: tones[0],
    quality,
    tones,
    symbol: `${rootName}${symbolSuffix}`,
    label: `${rootName} ${TRIAD_QUALITY_TEXT[quality]}`,
  }
}

export function triadFormula(quality: TriadQuality): string {
  if (quality === 'major') return '大三和弦＝大三度＋纯五度'
  if (quality === 'minor') return '小三和弦＝小三度＋纯五度'
  return '减三和弦＝小三度＋减五度'
}

export function pitchClassIsEnharmonic(left: string, right: string): boolean {
  return pitchClass(parsePitchName(left)) === pitchClass(parsePitchName(right))
}
