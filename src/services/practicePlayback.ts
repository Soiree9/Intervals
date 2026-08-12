import type { InstrumentId, PracticePlaybackSettings, PracticeQuestion } from '../domain/types'
import {
  playCadenceThenTone,
  playChordThenTone,
  playNotes,
  playProgression,
  type AudioSource,
} from './audio'

export interface PracticePlaybackContext {
  instrument: InstrumentId
  settings: PracticePlaybackSettings
  onProgressionStep?: (index: number) => void
}

export async function playPracticeQuestion(
  question: PracticeQuestion,
  context: PracticePlaybackContext,
): Promise<AudioSource> {
  const { instrument, settings } = context
  if (question.kind === 'interval') return playNotes([question.lower, question.upper], settings.interval, instrument)
  if (question.kind === 'triad-fill' || question.kind === 'spread-triad-fill') return playNotes(question.notes, settings.triad, instrument)
  if (question.kind === 'chord-tone') return playChordThenTone(question.notes, question.notes[question.targetIndex], instrument)
  if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') return playNotes(question.notes, settings.seventh, instrument)
  if (question.kind === 'scale-degree') return playCadenceThenTone(question.cadence, question.note, instrument)
  return playProgression(question.voicings, context.onProgressionStep, instrument)
}
