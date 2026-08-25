import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeNote } from '../domain/music'
import { buildStandaloneScore, type ScoreSpec } from '../domain/notation'
import { MusicScore } from './Staff'

const vexflowCalls = vi.hoisted(() => ({
  accidental: vi.fn(),
  annotation: vi.fn(),
  barlines: vi.fn(),
  keySignature: vi.fn(),
  resize: vi.fn(),
  stave: vi.fn(),
  staveNote: vi.fn(),
  timeSignature: vi.fn(),
}))

let resizeCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | undefined

vi.mock('vexflow', () => {
  class Renderer {
    static Backends = { SVG: 'svg' }
    resize(width: number, height: number) { vexflowCalls.resize(width, height) }
    getContext() { return {} }
  }
  class Stave {
    constructor(x: number, y: number, width: number) { vexflowCalls.stave(x, y, width) }
    addClef() { return this }
    addKeySignature(value: string) { vexflowCalls.keySignature(value); return this }
    addTimeSignature(value: string) { vexflowCalls.timeSignature(value); return this }
    setBegBarType(value: number) { vexflowCalls.barlines('begin', value); return this }
    setEndBarType(value: number) { vexflowCalls.barlines('end', value); return this }
    setContext() { return this }
    draw() { return this }
  }
  class StaveNote {
    noteHeads: Array<{ getBoundingBox(): { getX(): number; getY(): number; getW(): number; getH(): number } }>
    constructor(options: { keys: string[] }) {
      vexflowCalls.staveNote(options)
      this.noteHeads = options.keys.map((_, index) => ({
        getBoundingBox: () => ({
          getX: () => index === 1 ? 134 : 120,
          getY: () => 72 - index * 12,
          getW: () => 12,
          getH: () => 16,
        }),
      }))
    }
    addModifier() { return this }
    setKeyStyle() { return this }
    getNoteHeadBounds() { return { yTop: 44, yBottom: 72 } }
  }
  class Voice {
    addTickables() { return this }
    draw() { return this }
  }
  class Formatter {
    joinVoices() { return this }
    formatToStave() { return this }
  }
  class Accidental {
    constructor(value: string) { vexflowCalls.accidental(value) }
  }
  class Annotation {
    static VerticalJustify = { BOTTOM: 3 }
    constructor(value: string) { vexflowCalls.annotation(value) }
    setVerticalJustification() { return this }
  }
  return {
    Accidental,
    Annotation,
    BarlineType: { SINGLE: 1, END: 3, NONE: 7 },
    Formatter,
    Renderer,
    Stave,
    StaveNote,
    Voice,
  }
})

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: typeof resizeCallback) { resizeCallback = callback }
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  Object.values(vexflowCalls).forEach((mock) => mock.mockClear())
  resizeCallback = undefined
})

describe('MusicScore', () => {
  it('renders a tonal unmetered score with its key signature and annotations', () => {
    const score: ScoreSpec = {
      clef: 'treble',
      keySignatureFifths: 1,
      measured: false,
      measures: [{ events: [
        { notes: [makeNote('D', 0, 4), makeNote('F', 1, 4), makeNote('A', 0, 4)], duration: 'whole', annotation: 'V' },
        { notes: [makeNote('G', 0, 4), makeNote('B', 0, 4), makeNote('D', 0, 5)], duration: 'whole', annotation: 'I' },
        { notes: [makeNote('F', 1, 4)], duration: 'whole', annotation: '目标', highlightedNoteIndexes: [0] },
      ] }],
    }
    render(<MusicScore score={score} label="终止与目标音" />)
    expect(screen.getByRole('img', { name: '终止与目标音' })).toBeInTheDocument()
    expect(vexflowCalls.keySignature).toHaveBeenCalledWith('G')
    expect(vexflowCalls.timeSignature).not.toHaveBeenCalled()
    expect(vexflowCalls.annotation.mock.calls.map(([value]) => value)).toEqual(['V', 'I', '目标'])
    expect(vexflowCalls.accidental).not.toHaveBeenCalled()
  })

  it('renders four measured whole-note chords as 4/4 and wraps two-by-two at mobile width', () => {
    const score: ScoreSpec = {
      clef: 'treble',
      keySignatureFifths: -3,
      timeSignature: { beats: 4, beatValue: 4 },
      measured: true,
      finalBarline: true,
      measures: [0, 1, 2, 3].map(() => ({
        events: [{ notes: [makeNote('E', -1, 4), makeNote('G', 0, 4), makeNote('B', -1, 4)], duration: 'whole' }],
      })),
    }
    render(<MusicScore score={score} label="四小节和弦进行五线谱" />)
    vexflowCalls.stave.mockClear()
    vexflowCalls.staveNote.mockClear()
    vexflowCalls.keySignature.mockClear()
    vexflowCalls.timeSignature.mockClear()
    vexflowCalls.barlines.mockClear()
    act(() => resizeCallback?.([{ contentRect: { width: 390 } }]))
    expect(vexflowCalls.stave.mock.calls).toEqual([
      [12, 36, 245],
      [257, 36, 121],
      [12, 184, 225],
      [237, 184, 141],
    ])
    expect(vexflowCalls.keySignature.mock.calls.map(([value]) => value)).toEqual(['Eb', 'Eb'])
    expect(vexflowCalls.timeSignature).toHaveBeenCalledTimes(1)
    expect(vexflowCalls.timeSignature).toHaveBeenCalledWith('4/4')
    expect(vexflowCalls.staveNote).toHaveBeenCalledTimes(4)
    expect(vexflowCalls.barlines).toHaveBeenCalledWith('end', 3)
  })

  it('writes an explicit accidental for a standalone altered note', () => {
    render(<MusicScore score={buildStandaloneScore([makeNote('F', 1, 4)])} label="独立音符" />)
    expect(vexflowCalls.keySignature).not.toHaveBeenCalled()
    expect(vexflowCalls.accidental).toHaveBeenCalledWith('#')
  })

  it('renders one focusable hit button per note head and plays on pointer down without a duplicate click', () => {
    const notes = [makeNote('C', 0, 4), makeNote('E', 0, 4)]
    const onNoteClick = vi.fn()
    render(<MusicScore score={buildStandaloneScore(notes)} label="可点击音程" onNoteClick={onNoteClick} />)

    const buttons = screen.getAllByRole('button', { name: /^播放 / })
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveAccessibleName('播放 C4')
    expect(buttons[1]).toHaveAccessibleName('播放 E4')
    expect(buttons[0]).toHaveStyle({ left: '116px', top: '70px', width: '20px', height: '20px' })
    expect(buttons[1]).toHaveStyle({ left: '130px', top: '58px', width: '20px', height: '20px' })
    fireEvent.pointerDown(buttons[1], { button: 0, pointerType: 'mouse' })
    expect(onNoteClick).toHaveBeenCalledWith(notes[1])
    fireEvent.click(buttons[1], { detail: 1 })
    expect(onNoteClick).toHaveBeenCalledOnce()

    onNoteClick.mockClear()
    fireEvent.click(buttons[1], { detail: 0 })
    expect(onNoteClick).toHaveBeenCalledWith(notes[1])
  })

  it('does not render a hit layer without an onNoteClick callback', () => {
    render(<MusicScore score={buildStandaloneScore([makeNote('C', 0, 4)])} label="只读谱面" />)

    expect(document.querySelector('.staff-hit-layer')).toBeNull()
    expect(screen.queryByRole('button', { name: /^播放 / })).not.toBeInTheDocument()
  })
})
