import { describe, expect, it } from 'vitest'
import { quizExitView } from './navigation'
import type { PracticeKind } from './types'

describe('quizExitView', () => {
  it.each([
    ['triad-fill', 'triad-practice'],
    ['spread-triad-fill', 'triad-practice'],
    ['chord-tone', 'triad-practice'],
    ['drop2-voicing', 'seventh-practice'],
    ['shell-voicing', 'seventh-practice'],
    ['scale-degree', 'key'],
    ['progression', 'key'],
    ['interval', 'home'],
  ] satisfies [PracticeKind, ReturnType<typeof quizExitView>][])('routes %s to %s for a normal quiz', (kind, destination) => {
    expect(quizExitView(kind, false)).toBe(destination)
  })

  it.each([
    'interval',
    'triad-fill',
    'spread-triad-fill',
    'chord-tone',
    'drop2-voicing',
    'shell-voicing',
    'scale-degree',
    'progression',
  ] satisfies PracticeKind[])('returns every %s review session to wrong answers', (kind) => {
    expect(quizExitView(kind, true)).toBe('wrongs')
  })
})
