import { createIntervalQuestion, questionIdentity } from '../questions'
import type { RandomSource } from '../questions'
import type { IntervalQuestion, IntervalSettings } from '../types'

export function createIntervalSession(settings: IntervalSettings, count: number, random: RandomSource, previousIdentity: string): IntervalQuestion[] {
  const questions: IntervalQuestion[] = []
  let previous = previousIdentity
  for (let index = 0; index < count; index += 1) {
    const question = createIntervalQuestion(settings, random, previous)
    questions.push(question)
    previous = questionIdentity(question)
  }
  return questions
}
