import type { ScaleDegree } from './types'

export type ProgressionCategory = 'major' | 'minor' | 'modal-borrowing'

export interface ProgressionTemplate {
  id: string
  category: ProgressionCategory
  degrees: [ScaleDegree, ScaleDegree, ScaleDegree, ScaleDegree]
}

export const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
  { id: 'pop-1564', category: 'major', degrees: [1, 5, 6, 4] },
  { id: 'pop-1645', category: 'major', degrees: [1, 6, 4, 5] },
  { id: 'pop-6415', category: 'major', degrees: [6, 4, 1, 5] },
  { id: 'cadence-1451', category: 'major', degrees: [1, 4, 5, 1] },
  { id: 'cadence-1251', category: 'major', degrees: [1, 2, 5, 1] },
  { id: 'cadence-2511', category: 'major', degrees: [2, 5, 1, 1] },
  { id: 'lift-1345', category: 'major', degrees: [1, 3, 4, 5] },
  { id: 'circle-3625', category: 'major', degrees: [3, 6, 2, 5] },
  { id: 'leading-1271', category: 'major', degrees: [1, 2, 7, 1] },
]

export interface ModeDefinition {
  id: string
  label: string
  semitones: readonly [number, number, number, number, number, number, number]
  degreeLabels: readonly [string, string, string, string, string, string, string]
}

export const IONIAN_MODE: ModeDefinition = {
  id: 'ionian',
  label: '大调',
  semitones: [0, 2, 4, 5, 7, 9, 11],
  degreeLabels: ['1', '2', '3', '4', '5', '6', '7'],
}
