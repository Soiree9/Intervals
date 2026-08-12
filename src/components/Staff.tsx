import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Accidental,
  Annotation,
  BarlineType,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow'
import type { Accidental as AccidentalValue } from '../domain/types'
import {
  keyNameForSignature,
  resolveAccidentals,
  type AccidentalMark,
  type ScoreEvent,
  type ScoreSpec,
} from '../domain/notation'

interface MusicScoreProps {
  score: ScoreSpec
  label: string
}

const HIGHLIGHT_STYLE = { fillStyle: '#db5b3f', strokeStyle: '#db5b3f' }
const SYSTEM_HEIGHT = 148
const NARROW_MEASURES_PER_SYSTEM = 2
const NARROW_SCORE_WIDTH = 560

function accidentalTokens(accidental: AccidentalValue): string[] {
  if (accidental === -3) return ['bb', 'b']
  if (accidental === -2) return ['bb']
  if (accidental === -1) return ['b']
  if (accidental === 0) return ['n']
  if (accidental === 1) return ['#']
  if (accidental === 2) return ['##']
  return ['##', '#']
}

function createStaveNote(event: ScoreEvent, marks: AccidentalMark[]) {
  const staveNote = new StaveNote({
    clef: 'treble',
    keys: event.notes.map((note) => `${note.letter.toLowerCase()}/${note.octave}`),
    duration: 'w',
  })
  marks.forEach((mark, noteIndex) => {
    if (mark === null) return
    accidentalTokens(mark).forEach((token) => staveNote.addModifier(new Accidental(token), noteIndex))
  })
  event.highlightedNoteIndexes?.forEach((noteIndex) => staveNote.setKeyStyle(noteIndex, HIGHLIGHT_STYLE))
  if (event.annotation) {
    staveNote.addModifier(
      new Annotation(event.annotation).setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
    )
  }
  return staveNote
}

function splitMeasures<T>(values: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let index = 0; index < values.length; index += size) rows.push(values.slice(index, index + size))
  return rows
}

function addSystemModifiers(stave: Stave, score: ScoreSpec, includeTimeSignature: boolean) {
  stave.addClef(score.clef)
  if (score.keySignatureFifths !== undefined) stave.addKeySignature(keyNameForSignature(score.keySignatureFifths))
  if (includeTimeSignature && score.timeSignature) {
    stave.addTimeSignature(`${score.timeSignature.beats}/${score.timeSignature.beatValue}`)
  }
}

function scoreSystemCount(score: ScoreSpec, width: number): number {
  if (!score.measured || width >= NARROW_SCORE_WIDTH) return 1
  return Math.max(1, Math.ceil(score.measures.length / NARROW_MEASURES_PER_SYSTEM))
}

function measuredStaveWidths(score: ScoreSpec, systemIndex: number, measureCount: number, availableWidth: number): number[] {
  if (measureCount === 1) return [availableWidth]
  const evenWidth = availableWidth / measureCount
  const signatureSpace = Math.abs(score.keySignatureFifths ?? 0) * 6
  const timeSignatureSpace = systemIndex === 0 && score.timeSignature ? 20 : 0
  const leadingExtra = Math.min(evenWidth * 0.35, 24 + signatureSpace + timeSignatureSpace)
  const remainingWidth = (availableWidth - evenWidth - leadingExtra) / (measureCount - 1)
  return [evenWidth + leadingExtra, ...Array.from({ length: measureCount - 1 }, () => remainingWidth)]
}

export function MusicScore({ score, label }: MusicScoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  const accidentalMarks = useMemo(() => resolveAccidentals(score), [score])
  const systemCount = scoreSystemCount(score, width)
  const height = systemCount * SYSTEM_HEIGHT + 28

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))))
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !score.measures.length) return
    container.replaceChildren()
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const context = renderer.getContext()

    if (!score.measured) {
      const stave = new Stave(12, 36, width - 24)
      stave.setBegBarType(BarlineType.NONE).setEndBarType(BarlineType.NONE)
      addSystemModifiers(stave, score, true)
      stave.setContext(context).draw()
      const events = score.measures.flatMap((measure) => measure.events)
      const marks = accidentalMarks.flatMap((measure) => measure)
      const notes = events.map((event, index) => createStaveNote(event, marks[index]))
      const voice = new Voice({ numBeats: events.length * 4, beatValue: 4 }).addTickables(notes)
      new Formatter().joinVoices([voice]).formatToStave([voice], stave)
      voice.draw(context, stave)
      return
    }

    const measuresPerSystem = width < NARROW_SCORE_WIDTH ? NARROW_MEASURES_PER_SYSTEM : score.measures.length
    const systems = splitMeasures(score.measures, measuresPerSystem)
    let measureOffset = 0
    systems.forEach((measures, systemIndex) => {
      const staveWidths = measuredStaveWidths(score, systemIndex, measures.length, width - 24)
      let x = 12
      measures.forEach((measure, indexInSystem) => {
        const globalMeasureIndex = measureOffset + indexInSystem
        const staveWidth = indexInSystem === measures.length - 1 ? width - 12 - x : staveWidths[indexInSystem]
        const stave = new Stave(Math.round(x), 36 + systemIndex * SYSTEM_HEIGHT, Math.round(staveWidth))
        stave.setBegBarType(BarlineType.NONE)
        const isFinalMeasure = globalMeasureIndex === score.measures.length - 1
        stave.setEndBarType(isFinalMeasure && score.finalBarline ? BarlineType.END : BarlineType.SINGLE)
        if (indexInSystem === 0) addSystemModifiers(stave, score, systemIndex === 0)
        stave.setContext(context).draw()

        const notes = measure.events.map((event, eventIndex) => (
          createStaveNote(event, accidentalMarks[globalMeasureIndex][eventIndex])
        ))
        const voice = new Voice({
          numBeats: score.timeSignature?.beats ?? 4,
          beatValue: score.timeSignature?.beatValue ?? 4,
        }).addTickables(notes)
        new Formatter().joinVoices([voice]).formatToStave([voice], stave)
        voice.draw(context, stave)
        x += staveWidths[indexInSystem]
      })
      measureOffset += measures.length
    })
  }, [accidentalMarks, height, score, width])

  return <div className={`staff ${score.measured ? 'measured-score' : 'unmeasured-score'}`} style={{ height }} ref={containerRef} role="img" aria-label={label} />
}
