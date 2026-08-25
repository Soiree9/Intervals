import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAJOR_KEYS, analyzeInterval, buildTriad, makeNote, pitchName } from '../domain/music'
import { createVoicing } from '../domain/questions'
import type { IntervalQuestion, TriadFillQuestion } from '../domain/types'
import { FeedbackPanel } from './ExerciseViews'

describe('triad answer feedback', () => {
  it('explains inversion, root-position tones, solfege, and member intervals', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 1)
    const notes = createVoicing(triad.tones, 1)
    const question: TriadFillQuestion = {
      kind: 'triad-fill',
      id: 'c-major-first-inversion',
      triad,
      inversion: 1,
      notes,
      answers: notes.map(pitchName) as [string, string, string],
    }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    const feedback = screen.getByRole('status')
    expect(feedback).toHaveTextContent('本题为第一转位')
    expect(feedback).toHaveTextContent('根、三、五音是')
    expect(feedback).toHaveTextContent('C-E-G')
    expect(feedback).toHaveTextContent('音名为')
    expect(feedback).toHaveTextContent('E-G-C')
    expect(feedback).toHaveTextContent('从低到高是')
    expect(feedback).toHaveTextContent('Mi-Sol-Do')
    expect(feedback).toHaveTextContent('音程关系是')
    expect(feedback).toHaveTextContent('M3-5-R')
    expect([...feedback.querySelectorAll('.triad-feedback-value')].map((value) => value.textContent)).toEqual([
      'C-E-G',
      '第一转位',
      'E-G-C',
      'Mi-Sol-Do',
      'M3-5-R',
    ])
  })

  it('renders flat triad members through the shared music-symbol component', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 7)
    const notes = createVoicing(triad.tones, 2)
    const question: TriadFillQuestion = {
      kind: 'triad-fill',
      id: 'b-diminished-second-inversion',
      triad,
      inversion: 2,
      notes,
      answers: notes.map(pitchName) as [string, string, string],
    }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    expect(screen.getByLabelText('♭5')).toBeInTheDocument()
    expect(screen.getByLabelText('♭3')).toBeInTheDocument()
    expect(screen.getByRole('status').querySelectorAll('.chord-member-separator')).toHaveLength(2)
  })
})

describe('interval answer feedback', () => {
  it('splits the degree and the shortest useful method into separate lines', () => {
    const lower = makeNote('F', 0, 4)
    const upper = makeNote('E', 0, 5)
    const answer = analyzeInterval(lower, upper)
    const question: IntervalQuestion = { kind: 'interval', id: 'f-major-seventh', lower, upper, answer, options: [answer] }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    const lines = screen.getByRole('status').querySelectorAll('.interval-feedback-line')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveTextContent('度数F-G-A-B-C-D-E→七度')
    expect(lines[1]).toHaveTextContent('判断转位 E-F：小二度')
    expect(lines[1].querySelector('.interval-feedback-result')).toHaveTextContent('大七度')
    expect(screen.getByText('七＋二＝九；')).toBeInTheDocument()
    expect(screen.getByText('小 ↔ 大')).toBeInTheDocument()
    expect(screen.getByRole('status')).not.toHaveTextContent('11 个半音')
  })

  it('renders altered pitches with standard accidental glyphs and names the tritone', () => {
    const lower = makeNote('E', -1, 4)
    const upper = makeNote('A', 0, 4)
    const answer = analyzeInterval(lower, upper)
    const question: IntervalQuestion = { kind: 'interval', id: 'e-flat-tritone', lower, upper, answer, options: [answer] }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    expect(screen.getByLabelText('E♭')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('E-A 纯四度音程扩大半音 → 三全音')
    expect(screen.getByRole('status')).toHaveTextContent('增四度')
  })

  it('keeps double accidentals in interval degree paths', () => {
    const lower = makeNote('E', -2, 4)
    const upper = makeNote('F', -2, 4)
    const answer = analyzeInterval(lower, upper)
    const question: IntervalQuestion = { kind: 'interval', id: 'double-flat-second', lower, upper, answer, options: [answer] }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    expect(screen.getByLabelText('E♭♭')).toBeInTheDocument()
    expect(screen.getByLabelText('F♭♭')).toBeInTheDocument()
    expect(screen.getByRole('status').querySelectorAll('.music-accidental')).toHaveLength(2)
  })
})
