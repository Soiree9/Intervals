import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { SEVENTH_QUALITY_TEXT, parsePitchName, pitchName } from '../domain/music'
import { buildProgressionScore, buildScaleDegreeScore } from '../domain/notation'
import type {
  ChordNotation,
  ChordQuality,
  NoteSpelling,
  PracticeQuestion,
  ProgressionQuestion,
  ScaleDegree,
} from '../domain/types'
import { ChordSymbol } from './ChordSymbol'
import { PitchName } from './MusicText'
import { MusicScore } from './Staff'
import { NoteKeyboard } from './NoteKeyboard'
import { PlayWithInstrument } from './PlaybackControls'
import { activeAnswerSlot, focusAnswerSlot, isPlainHotkey, useCompleteAnswerSubmit, wraps } from './answerHotkeys'

interface FeedbackState {
  correct: boolean
}

const PROGRESSION_QUALITY_NAMES: Record<ChordQuality, string> = {
  major: '大三和弦',
  minor: '小三和弦',
  diminished: '减三和弦',
  ...SEVENTH_QUALITY_TEXT,
}

const SCALE_DEGREES: ScaleDegree[] = [1, 2, 3, 4, 5, 6, 7]

export function ScaleDegreeExercise({ question, feedback, noteValues, degreeValues, exploringDegree, onNoteChange, onDegreeChange, onPlay, onNoteClick, onExploreDegree, onSubmitNotes, onSubmitDegrees }: {
  question: Extract<PracticeQuestion, { kind: 'scale-degree' }>
  feedback: FeedbackState | null
  noteValues: string[]
  degreeValues: number[]
  exploringDegree: ScaleDegree | null
  onNoteChange: (values: string[]) => void
  onDegreeChange: (values: number[]) => void
  onPlay: () => void
  onNoteClick: (note: NoteSpelling) => void
  onExploreDegree: (degree: ScaleDegree) => void
  onSubmitNotes: () => void
  onSubmitDegrees: () => void
}) {
  const isForward = question.direction === 'forward'
  const score = useMemo(() => buildScaleDegreeScore(question), [question])
  return (
    <>
      <div className="question-heading"><div className="eyebrow">音名与音级</div><h1>{isForward ? <><PitchName value={question.key.tonic} /> 大调第 {question.degree} 级是什么音？</> : <><PitchName value={question.key.tonic} /> 大调中的 <PitchName value={question.note} /> 是第几级？</>}</h1><p>先听 V–I，再听目标音。</p></div>
      <MusicScore score={score} label="五级、一级与目标单音五线谱" onNoteClick={onNoteClick} />
      <PlayWithInstrument label="▶ 重播 V–I 与目标音" onPlay={onPlay} />
      {isForward ? <>
        <NoteKeyboard values={noteValues} correctValues={feedback ? [pitchName(question.note)] : undefined} activeIndex={0} disabled={Boolean(feedback)} focusKey={question.id} onActiveIndexChange={() => undefined} onChange={onNoteChange} onSubmit={onSubmitNotes} />
        {!feedback && <button type="button" className="submit-button" disabled={!noteValues[0]} onClick={onSubmitNotes}>提交音名</button>}
      </> : <>
        <DegreeChoices values={degreeValues} correct={feedback ? [question.degree] : undefined} disabled={Boolean(feedback)} exploring={exploringDegree} focusKey={question.id} onChange={onDegreeChange} onExplore={feedback ? onExploreDegree : undefined} onSubmit={onSubmitDegrees} />
        {feedback && exploringDegree && <p className="degree-audition-preview" aria-live="polite">正在试听第 {exploringDegree} 级：<PitchName value={question.key.notes[exploringDegree - 1]} /></p>}
        {!feedback && <button type="button" className="submit-button" disabled={!degreeValues[0]} onClick={onSubmitDegrees}>提交音级</button>}
      </>}
    </>
  )
}

export function ProgressionExercise({ question, notation, feedback, noteValues, degreeValues, qualities, activeSlot, activeStep, onActiveSlotChange, onNoteChange, onQualityChange, onDegreeChange, onPlay, onNoteClick, onSubmitNotes, onSubmitDegrees }: {
  question: ProgressionQuestion
  notation: ChordNotation
  feedback: FeedbackState | null
  noteValues: string[]
  degreeValues: number[]
  qualities: ChordQuality[]
  activeSlot: number
  activeStep: number | null
  onActiveSlotChange: (index: number) => void
  onNoteChange: (values: string[]) => void
  onQualityChange: (qualities: ChordQuality[]) => void
  onDegreeChange: (values: number[]) => void
  onPlay: () => void
  onNoteClick: (note: NoteSpelling) => void
  onSubmitNotes: () => void
  onSubmitDegrees: () => void
}) {
  const noteEntryGroupId = useId()
  const score = useMemo(() => buildProgressionScore(question), [question])
  const forward = question.direction === 'forward'
  const seventhMode = question.voicingMode === 'shell' || question.voicingMode === 'drop2'
  const qualityChoices = useMemo<ChordQuality[]>(() => seventhMode ? ['major7', 'minor7', 'dominant7', 'half-diminished7'] : ['major', 'minor', 'diminished'], [seventhMode])
  const setQuality = useCallback((quality: ChordQuality) => {
    const next = [...qualities]
    next[activeSlot] = quality
    onQualityChange(next)
    focusAnswerSlot(noteEntryGroupId, activeSlot)
  }, [activeSlot, noteEntryGroupId, onQualityChange, qualities])
  useEffect(() => {
    if (feedback || !forward) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlainHotkey(event) || !activeAnswerSlot(noteEntryGroupId)) return
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= qualityChoices.length) return
      event.preventDefault()
      setQuality(qualityChoices[index])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [feedback, forward, noteEntryGroupId, qualityChoices, setQuality])
  return (
    <>
      <div className="question-heading"><div className="eyebrow">和弦进行</div><h1><PitchName value={question.key.tonic} /> 大调 · 四小节进行</h1><p>{forward ? '根据级数写出每小节的和弦。' : '根据和弦符号，选择各小节的调内级数。'}</p></div>
      <MusicScore score={score} label="四小节和弦进行五线谱" onNoteClick={onNoteClick} />
      <PlayWithInstrument label="▶ 重播进行" onPlay={onPlay} />
      <div className="progression-grid">
        {question.chords.map((chord, index) => <button type="button" key={index} className={`progression-cell ${activeStep === index ? 'playing' : ''} ${activeSlot === index && !feedback ? 'active' : ''}`} onClick={() => !feedback && onActiveSlotChange(index)} data-note-entry-group={forward ? noteEntryGroupId : undefined} data-note-entry-slot={forward ? index : undefined} data-answer-scope-id={forward ? noteEntryGroupId : undefined} data-answer-slot={forward ? index : undefined} data-quiz-answer-control="true" tabIndex={forward && activeSlot === index && !feedback ? 0 : -1} aria-label={forward ? `第 ${index + 1} 个和弦音名：${noteValues[index] || '未填写'}` : undefined}>
          {forward ? <><small>{chord.roman}</small><strong>{noteValues[index] ? <ChordSymbol chord={{ root: parsePitchName(noteValues[index]), quality: qualities[index] ?? (seventhMode ? 'major7' : 'major') }} notation={notation} /> : '—'}</strong></> : <><small>和弦 {index + 1}</small><strong><ChordSymbol chord={chord} notation={notation} /></strong></>}
          <span>{index + 1}</span>
        </button>)}
      </div>
      {forward ? <>
        <NoteKeyboard values={noteValues} activeIndex={activeSlot} disabled={Boolean(feedback)} showSlots={false} keyboardGroupId={noteEntryGroupId} focusKey={question.id} onActiveIndexChange={onActiveSlotChange} onChange={onNoteChange} onSubmit={onSubmitNotes} />
        <div className="quality-row">{qualityChoices.map((quality, index) => <button type="button" key={quality} className={qualities[activeSlot] === quality ? 'selected' : ''} disabled={Boolean(feedback)} onClick={() => setQuality(quality)}><kbd>{index + 1}</kbd>{PROGRESSION_QUALITY_NAMES[quality]}</button>)}</div>
        {!feedback && <button type="button" className="submit-button" disabled={noteValues.some((value) => !value)} onClick={onSubmitNotes}>提交和弦进行</button>}
      </> : <>
        <DegreeChoices values={degreeValues} correct={feedback ? question.degrees : undefined} disabled={Boolean(feedback)} focusKey={question.id} onChange={onDegreeChange} onSubmit={onSubmitDegrees} />
        {!feedback && <button type="button" className="submit-button" disabled={degreeValues.some((value) => !value)} onClick={onSubmitDegrees}>提交级数进行</button>}
      </>}
      {feedback && <p className="progression-answer">正确答案：{forward ? question.chords.map((chord, index) => <span key={index}>{index > 0 && ' – '}<ChordSymbol chord={chord} notation={notation} /></span>) : question.chords.map((chord) => chord.roman).join(' – ')}</p>}
    </>
  )
}

function DegreeChoices({ values, correct, disabled, exploring, focusKey, onChange, onExplore, onSubmit }: { values: number[]; correct?: readonly number[]; disabled: boolean; exploring?: ScaleDegree | null; focusKey: string; onChange: (values: number[]) => void; onExplore?: (degree: ScaleDegree) => void; onSubmit: () => void }) {
  const scopeId = useId()
  const [active, setActive] = useState(0)
  const chooseDegree = useCallback((degree: ScaleDegree) => {
    const next = [...values]
    next[active] = degree
    onChange(next)
    const nextIndex = values.length === 1 ? 0 : wraps(active, 1, values.length)
    setActive(nextIndex)
    focusAnswerSlot(scopeId, nextIndex)
  }, [active, onChange, scopeId, values])

  useCompleteAnswerSubmit({ scopeId, enabled: !disabled, complete: values.every(Boolean), onSubmit })

  useEffect(() => {
    if (disabled) return
    setActive(0)
    focusAnswerSlot(scopeId, 0)
  }, [disabled, focusKey, scopeId, values.length])

  useEffect(() => {
    if (disabled || !values.length) return
    const move = (offset: number) => {
      const next = wraps(active, offset, values.length)
      setActive(next)
      focusAnswerSlot(scopeId, next)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlainHotkey(event) || !activeAnswerSlot(scopeId)) return
      if (event.key === 'Tab') {
        event.preventDefault()
        move(event.shiftKey ? -1 : 1)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        move(-1)
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(1)
      } else if (/^[1-7]$/.test(event.key)) {
        event.preventDefault()
        chooseDegree(Number(event.key) as ScaleDegree)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        const next = [...values]
        next[active] = 0
        onChange(next)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, chooseDegree, disabled, onChange, scopeId, values])

  return (
    <div className="degree-answer">
      <div className="degree-slots">{values.map((value, index) => <button type="button" key={index} disabled={disabled} data-answer-scope-id={scopeId} data-answer-slot={index} data-quiz-answer-control="true" tabIndex={active === index && !disabled ? 0 : -1} onClick={() => setActive(index)} className={`${active === index && !disabled ? 'active' : ''} ${correct ? value === correct[index] ? 'correct' : 'wrong' : ''}`}>{value ? `${value}级` : '—'}</button>)}</div>
      <div className="degree-grid">{SCALE_DEGREES.map((degree) => <button type="button" key={degree} data-quiz-answer-control="true" disabled={disabled && !onExplore} className={exploring === degree ? 'exploring' : ''} onClick={() => disabled ? onExplore?.(degree) : chooseDegree(degree)} aria-label={disabled && onExplore ? `试听第 ${degree} 级` : undefined}>{degree}</button>)}</div>
    </div>
  )
}
