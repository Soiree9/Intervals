import type { AppSettings, LifetimeStats, PracticeQuestion, WrongItem } from '../domain/types'
import { questionStorageKey } from '../domain/questions'

const SETTINGS_KEY = 'interval-trainer:settings:v2'
const LEGACY_SETTINGS_KEY = 'interval-trainer:settings:v1'
const WRONG_KEY = 'interval-trainer:wrong:v2'
const LEGACY_WRONG_KEY = 'interval-trainer:wrong:v1'
const STATS_KEY = 'interval-trainer:stats:v1'
const ORDER_KEY = 'interval-trainer:order:v1'

export const DEFAULT_SETTINGS: AppSettings = {
  showOctaves: true,
  interval: {
    degrees: [2, 3, 4, 5, 6, 7],
    difficulty: 'basic',
    playback: 'melodic',
  },
  triad: {
    qualities: ['major', 'minor', 'diminished'],
    spellingLevel: 1,
  },
  keyPractice: {
    keyName: 'C',
    scaleDirection: 'mixed',
    progressionDirection: 'mixed',
    voiceCount: 4,
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

export function loadSettings(): AppSettings {
  const saved = loadJson<Partial<AppSettings>>(SETTINGS_KEY, {})
  if (Object.keys(saved).length) {
    return {
      showOctaves: saved.showOctaves ?? DEFAULT_SETTINGS.showOctaves,
      interval: { ...DEFAULT_SETTINGS.interval, ...saved.interval },
      triad: { ...DEFAULT_SETTINGS.triad, ...saved.triad },
      keyPractice: { ...DEFAULT_SETTINGS.keyPractice, ...saved.keyPractice },
    }
  }
  const legacy = loadJson<Record<string, unknown>>(LEGACY_SETTINGS_KEY, {})
  const legacyTriad = legacy.triad as Record<string, unknown> | undefined
  const migrated = {
    ...DEFAULT_SETTINGS,
    showOctaves: typeof legacy.showOctaves === 'boolean' ? legacy.showOctaves : DEFAULT_SETTINGS.showOctaves,
    interval: { ...DEFAULT_SETTINGS.interval, ...(legacy.interval as Partial<AppSettings['interval']> | undefined) },
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
  const saved = loadJson<WrongItem[]>(WRONG_KEY, [])
  const legacy = saved.length ? saved : loadJson<WrongItem[]>(LEGACY_WRONG_KEY, [])
  return legacy.filter((item) => item?.question?.kind === item.kind)
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

export function loadStats(): LifetimeStats {
  return loadJson<LifetimeStats>(STATS_KEY, DEFAULT_STATS)
}

export function recordSession(stats: LifetimeStats, attempts: number, correct: number): LifetimeStats {
  const next = { sessions: stats.sessions + 1, attempts: stats.attempts + attempts, correct: stats.correct + correct }
  localStorage.setItem(STATS_KEY, JSON.stringify(next))
  return next
}
