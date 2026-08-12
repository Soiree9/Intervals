import {
  DROP2_PATTERNS,
  SHELL_PATTERNS,
  SPREAD_TRIAD_PATTERNS,
  arrangeSessionQuestions,
  createChordToneQuestion,
  createSeventhVoicingQuestion,
  createSpreadTriadFillQuestion,
  createTriadFillQuestion,
  questionIdentity,
  shuffle,
} from '../questions'
import type { RandomSource } from '../questions'
import type {
  Drop2VoicingQuestion,
  Inversion,
  PracticeQuestion,
  SeventhChordSettings,
  ShellVoicingQuestion,
  SpreadTriadFillQuestion,
  SpreadTriadPattern,
  TriadFillQuestion,
  TriadSettings,
} from '../types'

export type ChordPracticeKind = 'triad-fill' | 'spread-triad-fill' | 'chord-tone' | 'drop2-voicing' | 'shell-voicing'

function balancedValues<T>(values: T[], count: number, random: RandomSource): T[] {
  if (!values.length) throw new Error('Cannot balance an empty value list.')
  const result: T[] = []
  while (result.length < count) result.push(...shuffle(values, random))
  return result.slice(0, count)
}

function createTriadSpellingSession(kind: 'triad-fill' | 'spread-triad-fill', settings: TriadSettings, count: number, random: RandomSource, previousIdentity: string): Array<TriadFillQuestion | SpreadTriadFillQuestion> {
  if (!settings.qualities.length) throw new Error('请至少选择一种三和弦性质。')
  const arrangements: Array<Inversion | SpreadTriadPattern> = kind === 'triad-fill'
    ? [0, 1, 2]
    : SPREAD_TRIAD_PATTERNS.map((item) => item.id)
  const qualities = balancedValues(settings.qualities, count, random)
  const balancedArrangements = balancedValues(arrangements, count, random)
  const questions: Array<TriadFillQuestion | SpreadTriadFillQuestion> = []
  let previous = previousIdentity
  for (let index = 0; index < count; index += 1) {
    const question = kind === 'triad-fill'
      ? createTriadFillQuestion(settings, random, previous, balancedArrangements[index] as Inversion, qualities[index])
      : createSpreadTriadFillQuestion(settings, random, previous, balancedArrangements[index] as SpreadTriadPattern, qualities[index])
    questions.push(question)
    previous = questionIdentity(question)
  }
  return arrangeSessionQuestions(questions, '', previousIdentity, random)
}

function createSeventhSession(kind: 'drop2-voicing' | 'shell-voicing', settings: SeventhChordSettings, count: number, random: RandomSource, previousIdentity: string): Array<Drop2VoicingQuestion | ShellVoicingQuestion> {
  if (!settings.qualities.length) throw new Error('请至少选择一种七和弦性质。')
  const patterns = kind === 'drop2-voicing'
    ? DROP2_PATTERNS.map((item) => item.id)
    : SHELL_PATTERNS.map((item) => item.id)
  const qualities = balancedValues(settings.qualities, count, random)
  const balancedPatterns = balancedValues(patterns, count, random)
  const questions: Array<Drop2VoicingQuestion | ShellVoicingQuestion> = []
  let previous = previousIdentity
  for (let index = 0; index < count; index += 1) {
    const question = createSeventhVoicingQuestion(kind, settings, qualities[index], balancedPatterns[index], random, previous)
    questions.push(question)
    previous = questionIdentity(question)
  }
  return arrangeSessionQuestions(questions, '', previousIdentity, random)
}

export function createChordSession(kind: ChordPracticeKind, triadSettings: TriadSettings, seventhSettings: SeventhChordSettings, count: number, random: RandomSource, previousIdentity: string): PracticeQuestion[] {
  if (kind === 'triad-fill' || kind === 'spread-triad-fill') return createTriadSpellingSession(kind, triadSettings, count, random, previousIdentity)
  if (kind === 'drop2-voicing' || kind === 'shell-voicing') return createSeventhSession(kind, seventhSettings, count, random, previousIdentity)
  const questions: PracticeQuestion[] = []
  let previous = previousIdentity
  for (let index = 0; index < count; index += 1) {
    const question = createChordToneQuestion(triadSettings, random, previous)
    questions.push(question)
    previous = questionIdentity(question)
  }
  return questions
}
