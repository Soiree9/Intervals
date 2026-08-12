import type { PracticeKind } from './types'

export type QuizExitView = 'home' | 'triad-practice' | 'seventh-practice' | 'key' | 'wrongs'

export function quizExitView(kind: PracticeKind, isReview: boolean): QuizExitView {
  if (isReview) return 'wrongs'
  if (kind === 'triad-fill' || kind === 'spread-triad-fill' || kind === 'chord-tone') return 'triad-practice'
  if (kind === 'drop2-voicing' || kind === 'shell-voicing') return 'seventh-practice'
  if (kind === 'scale-degree' || kind === 'progression') return 'key'
  return 'home'
}
