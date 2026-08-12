import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import {
  INVERSION_TEXT,
  pitchName,
  triadFormula,
  triadSolfege,
} from '../domain/music'
import { buildStandaloneScore } from '../domain/notation'
import type { AppSettings, IntervalIdentity, IntervalQuestion, IntervalSettings, NoteSpelling, PitchSpelling, PracticeQuestion } from '../domain/types'
import { ChordMemberKeyboard } from './ChordMemberKeyboard'
import { ChordSymbol } from './ChordSymbol'
import { ChordMemberSequence, PitchName } from './MusicText'
import { NoteKeyboard } from './NoteKeyboard'
import { PlayWithInstrument } from './PlaybackControls'
import { MusicScore } from './Staff'

export interface AnswerFeedback {
  correct: boolean
  selected?: string
  values?: string[]
  enharmonic?: boolean
}

export interface IntervalPreview {
  option: IntervalIdentity
  notes: [NoteSpelling, NoteSpelling]
}

function visibleNoteName(note: NoteSpelling, showOctaves: boolean): string {
  return showOctaves ? note.displayName : pitchName(note)
}

function PitchSequence({ values }: { values: readonly (string | PitchSpelling | NoteSpelling)[] }) {
  return <>{values.map((value, index) => <span key={`${typeof value === 'string' ? value : pitchName(value)}-${index}`}>{index > 0 && '–'}<PitchName value={value} /></span>)}</>
}

export function QuestionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle: ReactNode }) {
  return <div className="question-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>
}

export function IntervalExercise({ question, settings, feedback, preview, onAnswer, onExplore, onPlay, onPlaybackChange, onShowOctavesChange }: { question: IntervalQuestion; settings: IntervalSettings; feedback: AnswerFeedback | null; preview: IntervalPreview | null; onAnswer: (answer: string) => void; onExplore: (option: IntervalIdentity) => void; onPlay: () => void; onPlaybackChange: (mode: 'melodic' | 'harmonic') => void; onShowOctavesChange: (show: boolean) => void }) {
  const scopeId = useId()
  const [activeOption, setActiveOption] = useState(0)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    setActiveOption(0)
    optionRefs.current[0]?.focus()
  }, [question.id])

  const move = (offset: number) => {
    const next = (activeOption + offset + question.options.length) % question.options.length
    setActiveOption(next)
    optionRefs.current[next]?.focus()
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (feedback) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onAnswer(question.options[activeOption].label)
    }
  }

  return <>
    <QuestionHeading eyebrow="INTERVAL READING" title={<><PitchName value={visibleNoteName(question.lower, settings.showOctaves)} /> – <PitchName value={visibleNoteName(question.upper, settings.showOctaves)} /></>} subtitle="观察音名和谱面，选择它们构成的完整音程。" />
    <MusicScore score={buildStandaloneScore([question.lower, question.upper])} label="音程五线谱" />
    <PlayWithInstrument label="▶ 重新播放" onPlay={onPlay}><div className="interval-control-groups"><div className="control-group"><span>播放</span><div className="segmented compact"><button type="button" aria-pressed={settings.playback === 'melodic'} className={settings.playback === 'melodic' ? 'selected' : ''} onClick={() => onPlaybackChange('melodic')}>旋律</button><button type="button" aria-pressed={settings.playback === 'harmonic'} className={settings.playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>和声</button></div></div><div className="control-group"><span>音名</span><div className="segmented compact"><button type="button" aria-pressed={!settings.showOctaves} className={!settings.showOctaves ? 'selected' : ''} onClick={() => onShowOctavesChange(false)}>C</button><button type="button" aria-pressed={settings.showOctaves} className={settings.showOctaves ? 'selected' : ''} onClick={() => onShowOctavesChange(true)}>C4</button></div></div></div></PlayWithInstrument>
    <div className="answer-grid" data-answer-scope={scopeId} onKeyDown={handleKeyDown}>{question.options.map((option, index) => {
      const state = !feedback ? '' : option.label === question.answer.label ? 'correct' : option.label === feedback.selected ? 'wrong' : 'muted'
      return <button type="button" key={option.label} ref={(element) => { optionRefs.current[index] = element }} data-quiz-answer-control="true" tabIndex={!feedback && activeOption === index ? 0 : -1} className={`answer-option ${state} ${preview?.option.label === option.label ? 'exploring' : ''}`} onClick={() => feedback ? onExplore(option) : onAnswer(option.label)}>{option.label}</button>
    })}</div>
    {!feedback && <p className="note-shortcut-hint">键盘：方向键选择 · Enter 提交 · 空格重播</p>}
    {feedback && <div className="interval-preview" aria-live="polite">{preview ? <><strong>{preview.option.label}</strong><span><PitchName value={visibleNoteName(preview.notes[0], settings.showOctaves)} /> – <PitchName value={visibleNoteName(preview.notes[1], settings.showOctaves)} /></span><small>固定本题低音，只改变高音试听。</small></> : <span>答题后可点击任一选项，试听固定低音下的该音程。</span>}</div>}
  </>
}

export function TriadFillExercise({ question, notation, playback, feedback, noteValues, activeSlot, onActiveSlotChange, onChange, onPlay, onPlaybackChange, onSubmit, onValuePlay }: { question: Extract<PracticeQuestion, { kind: 'triad-fill' | 'spread-triad-fill' }>; notation: AppSettings['chordNotation']; playback: AppSettings['triad']['playback']; feedback: AnswerFeedback | null; noteValues: string[]; activeSlot: number; onActiveSlotChange: (index: number) => void; onChange: (values: string[]) => void; onPlay: () => void; onPlaybackChange: (playback: AppSettings['triad']['playback']) => void; onSubmit: () => void; onValuePlay: (value: string, index: number) => void }) {
  const spread = question.kind === 'spread-triad-fill'
  return <>
    <QuestionHeading eyebrow={spread ? 'SPREAD TRIAD SPELLING' : 'CLOSED TRIAD SPELLING'} title={<ChordSymbol chord={question.triad} notation={notation} />} subtitle={spread ? '听一种 Spread Triad 排列，按实际低到高填写三个音名。' : '听原位或转位，按实际低到高填写三个音名。'} />
    <PlayWithInstrument label="▶ 重播当前排列" onPlay={onPlay}><div className="segmented compact"><button type="button" aria-pressed={playback === 'melodic'} className={playback === 'melodic' ? 'selected' : ''} onClick={() => onPlaybackChange('melodic')}>旋律</button><button type="button" aria-pressed={playback === 'harmonic'} className={playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>和声</button></div></PlayWithInstrument>
    {feedback && <MusicScore score={buildStandaloneScore(question.notes)} label="三和弦谱面" />}
    <NoteKeyboard values={noteValues} correctValues={feedback ? question.answers : undefined} activeIndex={activeSlot} disabled={Boolean(feedback)} focusKey={question.id} onActiveIndexChange={onActiveSlotChange} onChange={onChange} onValuePlay={feedback ? onValuePlay : undefined} onSubmit={onSubmit} />
    {feedback && <p className="note-play-hint">点击已填写的音名，可以试听自己的答案。</p>}
    {!feedback && <button type="button" className="submit-button" disabled={noteValues.some((value) => !value)} onClick={onSubmit}>提交三个音名</button>}
  </>
}

export function ChordToneExercise({ question, notation, feedback, noteValues, onChange, onPlay, onSubmit }: { question: Extract<PracticeQuestion, { kind: 'chord-tone' }>; notation: AppSettings['chordNotation']; feedback: AnswerFeedback | null; noteValues: string[]; onChange: (values: string[]) => void; onPlay: () => void; onSubmit: () => void }) {
  const target = question.target === 'third' ? '三音' : '五音'
  return <>
    <QuestionHeading eyebrow="CHORD MEMBER" title={<ChordSymbol chord={question.triad} notation={notation} />} subtitle={<>{'这个和弦的 '}<strong className="question-target">{target}</strong>{' 是什么？'}</>} />
    <PlayWithInstrument label="▶ 和弦后播放目标音" onPlay={onPlay} />
    {feedback && <MusicScore score={buildStandaloneScore(question.notes, [question.targetIndex])} label="三和弦原位谱面，目标音已高亮" />}
    <NoteKeyboard values={noteValues} correctValues={feedback ? [question.answer] : undefined} activeIndex={0} disabled={Boolean(feedback)} focusKey={question.id} onActiveIndexChange={() => undefined} onChange={onChange} onSubmit={onSubmit} />
    {!feedback && <button type="button" className="submit-button" disabled={!noteValues[0]} onClick={onSubmit}>提交音名</button>}
  </>
}

export function SeventhVoicingExercise({ question, notation, playback, feedback, memberValues, activeSlot, onActiveSlotChange, onChange, onPlay, onPlaybackChange, onSubmit }: {
  question: Extract<PracticeQuestion, { kind: 'drop2-voicing' | 'shell-voicing' }>
  notation: AppSettings['chordNotation']
  playback: AppSettings['seventh']['playback']
  feedback: AnswerFeedback | null
  memberValues: string[]
  activeSlot: number
  onActiveSlotChange: (index: number) => void
  onChange: (values: string[]) => void
  onPlay: () => void
  onPlaybackChange: (playback: AppSettings['seventh']['playback']) => void
  onSubmit: () => void
}) {
  const drop2 = question.kind === 'drop2-voicing'
  return <>
    <QuestionHeading eyebrow={drop2 ? 'DROP 2 VOICING' : 'SHELL CHORD'} title={<ChordSymbol chord={question.chord} notation={notation} />} subtitle={`听和弦后，按实际低到高填写${drop2 ? '四个' : '三个'}成员。`} />
    <PlayWithInstrument label="▶ 重新播放" onPlay={onPlay}><div className="segmented compact"><button type="button" aria-pressed={playback === 'arpeggio'} className={playback === 'arpeggio' ? 'selected' : ''} onClick={() => onPlaybackChange('arpeggio')}>琶音</button><button type="button" aria-pressed={playback === 'harmonic'} className={playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>和声</button></div></PlayWithInstrument>
    {feedback && <><MusicScore score={buildStandaloneScore(question.notes)} label={`${drop2 ? 'Drop 2' : 'Shell'} 七和弦谱面`} /><p className="voicing-answer"><strong><ChordMemberSequence values={question.answer} /></strong><span><PitchSequence values={question.notes} /></span></p></>}
    <ChordMemberKeyboard values={memberValues} correctValues={feedback ? question.answer : undefined} activeIndex={activeSlot} allowedMembers={drop2 ? ['R', '3', '5', '7'] : ['R', '3', '7']} disabled={Boolean(feedback)} focusKey={question.id} onActiveIndexChange={onActiveSlotChange} onChange={onChange} onSubmit={onSubmit} />
    {!feedback && <button type="button" className="submit-button" disabled={memberValues.some((value) => !value)} onClick={onSubmit}>提交成员排列</button>}
  </>
}

export function FeedbackPanel({ question, notation, feedback, onReplay, onNext, isLast }: { question: PracticeQuestion; notation: AppSettings['chordNotation']; feedback: AnswerFeedback; onReplay: () => void; onNext: () => void; isLast: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => panelRef.current?.focus({ preventScroll: true }), [question.id])
  let explanation: ReactNode = ''
  if (question.kind === 'interval') explanation = `${question.lower.letter} 到 ${question.upper.letter} 数 ${question.answer.degree} 度；实际相差 ${question.answer.semitones} 个半音，所以是${question.answer.label}。`
  else if (question.kind === 'triad-fill') explanation = <>根、三、五音是 <PitchSequence values={question.triad.tones} />（{triadSolfege(question.triad.quality)}）；本题为{INVERSION_TEXT[question.inversion]}，低到高是 <PitchSequence values={question.answers} />（{triadSolfege(question.triad.quality, question.inversion)}）。</>
  else if (question.kind === 'spread-triad-fill') explanation = <>根、三、五音是 <PitchSequence values={question.triad.tones} />；本题为 Spread {question.pattern}，低到高是 <PitchSequence values={question.answers} />。</>
  else if (question.kind === 'chord-tone') explanation = <>{triadFormula(question.triad.quality)}；题目的{question.target === 'third' ? '三音' : '五音'}是 <PitchName value={question.answer} />。</>
  else if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') explanation = <><ChordSymbol chord={question.chord} notation={notation} /> 本题低到高为 <ChordMemberSequence values={question.answer} />，实际音名是 <PitchSequence values={question.notes} />。</>
  else if (question.kind === 'scale-degree') explanation = <><PitchName value={question.key.tonic} /> 大调第 {question.degree} 级是 <PitchName value={question.note} />；调内音名必须依照该调的正确拼写。</>
  else explanation = <><PitchName value={question.key.tonic} /> 大调中：{question.chords.map((chord, index) => <span key={index}>{index > 0 && '，'}{chord.roman}=<ChordSymbol chord={chord} notation={notation} /></span>)}。</>
  return <div ref={panelRef} tabIndex={-1} className={`feedback-panel ${feedback.correct ? 'correct' : 'wrong'}`} role="status"><div className="feedback-title"><span>{feedback.correct ? '✓' : '!'}</span><strong>{feedback.correct ? '答对了' : '再看一步'}</strong></div>{feedback.enharmonic && <p className="enharmonic-note">音高相同，但理论拼写不正确。</p>}<p>{explanation}</p><p className="feedback-shortcut-hint">键盘：Enter 下一题 · 空格重播</p><div className="feedback-actions"><button type="button" className="secondary-button" onClick={onReplay}>▶ 再听一次</button><button type="button" className="primary-button" onClick={onNext}>{isLast ? '查看本轮结果' : '下一题 →'}</button></div></div>
}
