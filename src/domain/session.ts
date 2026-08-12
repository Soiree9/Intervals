import { createChordSession, type ChordPracticeKind } from './generators/chord'
import { createIntervalSession } from './generators/interval'
import { createKeySession } from './generators/key'
import { secureRandom } from './questions'
import type { RandomSource } from './questions'
import type { IntervalSettings, KeyPracticeSettings, PracticeKind, PracticeQuestion, SeventhChordSettings, TriadSettings } from './types'

export function createSession(kind: PracticeKind, intervalSettings: IntervalSettings, triadSettings: TriadSettings, seventhSettings: SeventhChordSettings, keySettings: KeyPracticeSettings, count = 10, random: RandomSource = secureRandom, previousSignature = '', previousIdentity = ''): PracticeQuestion[] {
  if (kind === 'interval') return createIntervalSession(intervalSettings, count, random, previousIdentity)
  if (kind === 'scale-degree' || kind === 'progression') return createKeySession(kind, keySettings, random, previousSignature, previousIdentity)
  return createChordSession(kind as ChordPracticeKind, triadSettings, seventhSettings, count, random, previousIdentity)
}
