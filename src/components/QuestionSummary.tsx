import { INVERSION_TEXT, TRIAD_QUALITY_TEXT } from '../domain/music'
import type { ChordNotation, PracticeQuestion } from '../domain/types'
import { ChordSymbol } from './ChordSymbol'
import { PitchName } from './MusicText'

function TriadName({ question }: { question: Extract<PracticeQuestion, { kind: 'triad-fill' | 'spread-triad-fill' | 'chord-tone' }> }) {
  return <><PitchName value={question.triad.root} />{TRIAD_QUALITY_TEXT[question.triad.quality]}</>
}

export function QuestionSummary({ question, notation }: { question: PracticeQuestion; notation: ChordNotation }) {
  if (question.kind === 'interval') return <><PitchName value={question.lower.displayName} /> — <PitchName value={question.upper.displayName} /></>
  if (question.kind === 'triad-fill') return <><TriadName question={question} /> · {INVERSION_TEXT[question.inversion]}</>
  if (question.kind === 'spread-triad-fill') return <><TriadName question={question} /> · 开放排列 {question.pattern}</>
  if (question.kind === 'chord-tone') return <><TriadName question={question} /> · {question.target === 'third' ? '三音' : '五音'}</>
  if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') return <><ChordSymbol chord={question.chord} notation={notation} /> · {question.pattern}</>
  if (question.kind === 'scale-degree') return <><PitchName value={question.key.tonic} /> 大调 · {question.degree} 级</>
  const voicingName = { three: '三声部', four: '四声部', shell: 'Shell', drop2: 'Drop 2' }[question.voicingMode]
  return <><PitchName value={question.key.tonic} /> 大调 · {question.chords.map((chord) => chord.roman).join('–')} · {voicingName}</>
}
