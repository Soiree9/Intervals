import type { AppSettings, ChordNotation, LifetimeStats, PracticeQuestion, ProgressionVoicingMode, WrongItem } from '../domain/types'
import { questionStorageKey } from '../domain/questions'

const SETTINGS_KEY = 'interval-trainer:settings:v4'
const PREVIOUS_SETTINGS_KEY = 'interval-trainer:settings:v3'
const OLDER_SETTINGS_KEY = 'interval-trainer:settings:v2'
const LEGACY_SETTINGS_KEY = 'interval-trainer:settings:v1'
const WRONG_KEY = 'interval-trainer:wrong:v3'
const PREVIOUS_WRONG_KEY = 'interval-trainer:wrong:v2'
const LEGACY_WRONG_KEY = 'interval-trainer:wrong:v1'
const STATS_KEY = 'interval-trainer:stats:v1'
const ORDER_KEY = 'interval-trainer:order:v1'
const LAST_QUESTION_KEY = 'interval-trainer:last-question:v1'

export const DEFAULT_SETTINGS: AppSettings = {
  chordNotation: 'text',
  instrument: 'piano',
  interval: {
    degrees: [2, 3, 4, 5, 6, 7],
    difficulty: 'basic',
    playback: 'melodic',
    showOctaves: true,
  },
  triad: {
    qualities: ['major', 'minor', 'diminished'],
    spellingLevel: 1,
    playback: 'harmonic',
  },
  seventh: {
    qualities: ['major7', 'minor7', 'dominant7'],
    playback: 'arpeggio',
  },
  keyPractice: {
    keyName: 'C',
    scaleDirection: 'mixed',
    progressionDirection: 'mixed',
    voicingMode: 'four',
  },
}

const DEFAULT_STATS: LifetimeStats = { sessions: 0, attempts: 0, correct: 0 }

function loadJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

function legacySpellingLevel(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1
}

function migratedChordNotation(value: unknown): ChordNotation {
  return value === 'symbol' || value === 'jazz' ? 'symbol' : 'text'
}

export function loadSettings(): AppSettings {
  const saved = loadJson<Record<string, unknown>>(SETTINGS_KEY, {})
  const previousV3 = loadJson<Record<string, unknown>>(PREVIOUS_SETTINGS_KEY, {})
  const previous = Object.keys(saved).length
    ? saved
    : Object.keys(previousV3).length
      ? previousV3
      : loadJson<Record<string, unknown>>(OLDER_SETTINGS_KEY, {})
  if (Object.keys(previous).length) {
    const interval = previous.interval as Partial<AppSettings['interval']> | undefined
    const triad = previous.triad as Partial<AppSettings['triad']> | undefined
    const seventh = previous.seventh as Partial<AppSettings['seventh']> | undefined
    const keyPractice = previous.keyPractice as (Partial<AppSettings['keyPractice']> & { voiceCount?: 3 | 4 }) | undefined
    const voicingMode: ProgressionVoicingMode = keyPractice?.voicingMode
      ?? (keyPractice?.voiceCount === 3 ? 'three' : 'four')
    const showOctaves = typeof interval?.showOctaves === 'boolean'
      ? interval.showOctaves
      : typeof previous.showOctaves === 'boolean'
        ? previous.showOctaves
        : DEFAULT_SETTINGS.interval.showOctaves
    return {
      chordNotation: migratedChordNotation(previous.chordNotation),
      instrument: previous.instrument === 'nylon-guitar' ? 'nylon-guitar' : 'piano',
      interval: { ...DEFAULT_SETTINGS.interval, ...interval, showOctaves },
      triad: { ...DEFAULT_SETTINGS.triad, ...triad },
      seventh: { ...DEFAULT_SETTINGS.seventh, ...seventh },
      keyPractice: { ...DEFAULT_SETTINGS.keyPractice, ...keyPractice, voicingMode },
    }
  }
  const legacy = loadJson<Record<string, unknown>>(LEGACY_SETTINGS_KEY, {})
  const legacyTriad = legacy.triad as Record<string, unknown> | undefined
  const migrated = {
    ...DEFAULT_SETTINGS,
    chordNotation: migratedChordNotation(legacy.chordNotation),
    interval: {
      ...DEFAULT_SETTINGS.interval,
      ...(legacy.interval as Partial<AppSettings['interval']> | undefined),
      showOctaves: typeof legacy.showOctaves === 'boolean' ? legacy.showOctaves : DEFAULT_SETTINGS.interval.showOctaves,
    },
    triad: {
      ...DEFAULT_SETTINGS.triad,
      qualities: Array.isArray(legacyTriad?.qualities) ? legacyTriad.qualities as AppSettings['triad']['qualities'] : DEFAULT_SETTINGS.triad.qualities,
      spellingLevel: legacySpellingLevel(legacyTriad?.circleLevel),
    },
  }
  saveSettings(migrated)
  return migrated
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadWrongItems(): WrongItem[] {
  const sourceKey = localStorage.getItem(WRONG_KEY) !== null
    ? WRONG_KEY
    : localStorage.getItem(PREVIOUS_WRONG_KEY) !== null
      ? PREVIOUS_WRONG_KEY
      : LEGACY_WRONG_KEY
  const saved = loadJson<WrongItem[]>(sourceKey, [])
  return saved.flatMap((item) => {
    if (!item?.question || item.question.kind !== item.kind) return []
    const raw = item.question as unknown as Record<string, unknown> & { kind: string; triads?: unknown; voiceCount?: 3 | 4 }
    if (raw.kind !== 'progression' || Array.isArray(raw.chords)) return [item]
    if (!Array.isArray(raw.triads) || raw.triads.length !== 4) return []
    const question = {
      ...raw,
      chords: raw.triads,
      voicingMode: raw.voiceCount === 3 ? 'three' : 'four',
    } as unknown as PracticeQuestion
    return [{ ...item, question }]
  })
}

function saveWrongItems(items: WrongItem[]): void {
  localStorage.setItem(WRONG_KEY, JSON.stringify(items))
}

export function upsertWrongItem(items: WrongItem[], question: PracticeQuestion): WrongItem[] {
  const key = questionStorageKey(question)
  const existing = items.find((item) => item.key === key)
  const next = existing
    ? items.map((item) => item.key === key ? { ...item, question, wrongCount: item.wrongCount + 1, lastWrongAt: Date.now() } : item)
    : [{ key, kind: question.kind, question, wrongCount: 1, lastWrongAt: Date.now() }, ...items]
  saveWrongItems(next)
  return next
}

export function removeWrongItem(items: WrongItem[], question: PracticeQuestion): WrongItem[] {
  const next = items.filter((item) => item.key !== questionStorageKey(question))
  saveWrongItems(next)
  return next
}

export function loadLastOrder(key: string): string {
  return loadJson<Record<string, string>>(ORDER_KEY, {})[key] ?? ''
}

export function saveLastOrder(key: string, signature: string): void {
  const orders = loadJson<Record<string, string>>(ORDER_KEY, {})
  localStorage.setItem(ORDER_KEY, JSON.stringify({ ...orders, [key]: signature }))
}

export function loadLastQuestion(key: string): string {
  return loadJson<Record<string, string>>(LAST_QUESTION_KEY, {})[key] ?? ''
}

export function saveLastQuestion(key: string, identity: string): void {
  const questions = loadJson<Record<string, string>>(LAST_QUESTION_KEY, {})
  localStorage.setItem(LAST_QUESTION_KEY, JSON.stringify({ ...questions, [key]: identity }))
}

export function loadStats(): LifetimeStats {
  return loadJson<LifetimeStats>(STATS_KEY, DEFAULT_STATS)
}

export function recordSession(stats: LifetimeStats, attempts: number, correct: number): LifetimeStats {
  const next = { sessions: stats.sessions + 1, attempts: stats.attempts + attempts, correct: stats.correct + correct }
  localStorage.setItem(STATS_KEY, JSON.stringify(next))
  return next
}
