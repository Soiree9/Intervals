import type { AppSettings, LifetimeStats, PracticeKind, PracticeQuestion, WrongItem } from '../domain/types'
import { questionStorageKey } from '../domain/questions'

const SETTINGS_KEY = 'interval-trainer:settings:v1'
const WRONG_KEY = 'interval-trainer:wrong:v1'
const STATS_KEY = 'interval-trainer:stats:v1'

export const DEFAULT_SETTINGS: AppSettings = {
  showOctaves: true,
  interval: {
    degrees: [2, 3, 4, 5, 6, 7],
    difficulty: 'basic',
    playback: 'melodic',
  },
  triad: {
    qualities: ['major', 'minor', 'diminished'],
    circleLevel: 1,
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

export function loadSettings(): AppSettings {
  const saved = loadJson<Partial<AppSettings>>(SETTINGS_KEY, {})
  return {
    showOctaves: saved.showOctaves ?? DEFAULT_SETTINGS.showOctaves,
    interval: { ...DEFAULT_SETTINGS.interval, ...saved.interval },
    triad: { ...DEFAULT_SETTINGS.triad, ...saved.triad },
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadWrongItems(): WrongItem[] {
  return loadJson<WrongItem[]>(WRONG_KEY, []).filter((item) => item?.question?.kind === item.kind)
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
  const key = questionStorageKey(question)
  const next = items.filter((item) => item.key !== key)
  saveWrongItems(next)
  return next
}

export function clearWrongItems(items: WrongItem[], kind?: PracticeKind): WrongItem[] {
  const next = kind ? items.filter((item) => item.kind !== kind) : []
  saveWrongItems(next)
  return next
}

export function loadStats(): LifetimeStats {
  return loadJson<LifetimeStats>(STATS_KEY, DEFAULT_STATS)
}

export function recordSession(stats: LifetimeStats, attempts: number, correct: number): LifetimeStats {
  const next = {
    sessions: stats.sessions + 1,
    attempts: stats.attempts + attempts,
    correct: stats.correct + correct,
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(next))
  return next
}
