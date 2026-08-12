import { PROGRESSION_TEMPLATES } from '../catalogs'
import { majorKeyByName } from '../music'
import { arrangeSessionQuestions, createProgressionQuestion, createScaleDegreeQuestion, pickOne, shuffle } from '../questions'
import type { RandomSource } from '../questions'
import type { KeyPracticeDirection, KeyPracticeSettings, PracticeQuestion, ProgressionQuestion, ScaleDegree, ScaleDegreeQuestion } from '../types'

function directionsFor(direction: KeyPracticeDirection, random: RandomSource): Array<Exclude<KeyPracticeDirection, 'mixed'>> {
  return direction === 'mixed'
    ? shuffle([...Array(5).fill('forward'), ...Array(5).fill('reverse')] as Array<Exclude<KeyPracticeDirection, 'mixed'>>, random)
    : Array(10).fill(direction) as Array<Exclude<KeyPracticeDirection, 'mixed'>>
}

function createScaleSession(settings: KeyPracticeSettings, random: RandomSource, previousSignature: string, previousIdentity: string): ScaleDegreeQuestion[] {
  const key = majorKeyByName(settings.keyName)
  const scaleDegrees = [1, 2, 3, 4, 5, 6, 7] as ScaleDegree[]
  const degrees = [...scaleDegrees, pickOne(scaleDegrees, random), pickOne(scaleDegrees, random), pickOne(scaleDegrees, random)]
  const directions = directionsFor(settings.scaleDirection, random)
  const questions = degrees.map((degree, index) => createScaleDegreeQuestion(key, degree, directions[index]))
  return arrangeSessionQuestions(questions, previousSignature, previousIdentity, random)
}

function createProgressionSession(settings: KeyPracticeSettings, random: RandomSource, previousSignature: string, previousIdentity: string): ProgressionQuestion[] {
  const key = majorKeyByName(settings.keyName)
  const templates = [...PROGRESSION_TEMPLATES, pickOne(PROGRESSION_TEMPLATES, random)]
  const directions = directionsFor(settings.progressionDirection, random)
  const questions = templates.map((template, index) => createProgressionQuestion(key, template, directions[index], settings.voicingMode))
  return arrangeSessionQuestions(questions, previousSignature, previousIdentity, random)
}

export function createKeySession(kind: 'scale-degree' | 'progression', settings: KeyPracticeSettings, random: RandomSource, previousSignature: string, previousIdentity: string): PracticeQuestion[] {
  return kind === 'scale-degree'
    ? createScaleSession(settings, random, previousSignature, previousIdentity)
    : createProgressionSession(settings, random, previousSignature, previousIdentity)
}
