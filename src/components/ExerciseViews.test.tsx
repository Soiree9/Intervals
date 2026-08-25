import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAJOR_KEYS, SEVENTH_ROOTS, analyzeInterval, buildSeventhChord, buildTriad, makeNote, pitchName } from '../domain/music'
import { createSpreadVoicing, createVoicing } from '../domain/questions'
import type { ChordToneQuestion, Drop2VoicingQuestion, IntervalQuestion, ShellVoicingQuestion, SpreadTriadFillQuestion, TriadFillQuestion } from '../domain/types'
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
    expect([...feedback.querySelectorAll('.chord-feedback-value')].map((value) => value.textContent)).toEqual([
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

  it('splits spread-triad details into lines and identifies the inversion', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 1)
    const notes = createSpreadVoicing(triad.tones, 'R53')
    const question: SpreadTriadFillQuestion = {
      kind: 'spread-triad-fill',
      id: 'c-major-root-position-spread',
      triad,
      pattern: 'R53',
      notes,
      answers: notes.map(pitchName) as [string, string, string],
    }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    const feedback = screen.getByRole('status')
    const details = feedback.querySelector('.chord-feedback-details')
    expect(details?.children).toHaveLength(4)
    expect(details?.children[0]).toHaveTextContent('根、三、五音是 C-E-G')
    expect(details?.children[1]).toHaveTextContent('本题为原位（Spread R53），音名为 C-G-E')
    expect(details?.children[2]).toHaveTextContent('从低到高是 Do-Sol-Mi')
    expect(details?.children[3]).toHaveTextContent('音程关系是 R-5-M3')
  })
})

describe('seventh-chord answer feedback', () => {
  it('keeps the chord, member order, and pitches while splitting their visual flow', () => {
    const root = SEVENTH_ROOTS[0]
    const drop2Question: Drop2VoicingQuestion = {
      kind: 'drop2-voicing',
      id: 'c-major-seven-drop2',
      chord: buildSeventhChord(root, 'major7'),
      pattern: '5R37',
      answer: ['5', 'R', '3', '7'],
      notes: [makeNote('G', 0, 3), makeNote('C', 0, 4), makeNote('E', 0, 4), makeNote('B', 0, 4)],
    }
    const shellQuestion: ShellVoicingQuestion = {
      kind: 'shell-voicing',
      id: 'c-dominant-seven-shell',
      chord: buildSeventhChord(root, 'dominant7'),
      pattern: 'R73',
      answer: ['R', '♭7', '3'],
      notes: [makeNote('C', 0, 4), makeNote('B', -1, 4), makeNote('E', 0, 5)],
    }

    for (const [question, chordText, members, pitches] of [
      [drop2Question, 'Cmaj7', ['5', 'R', 'M3', 'M7'], ['G', 'C', 'E', 'B']],
      [shellQuestion, 'C7', ['R', '♭7', 'M3'], ['C', 'B♭', 'E']],
    ] as const) {
      const { unmount } = render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)
      const details = screen.getByRole('status').querySelector('.chord-feedback-details')
      expect(details?.children).toHaveLength(2)
      expect(details?.children[0]).toHaveTextContent('排列是：')
      expect(details?.children[1]).toHaveTextContent('组成音是：')
      const values = details!.querySelectorAll('.chord-feedback-value')
      expect(values).toHaveLength(2)
      expect([...values[0].querySelectorAll('.chord-member-symbol')].map((value) => value.getAttribute('aria-label'))).toEqual(members)
      expect([...values[1].querySelectorAll('.pitch-name')].map((value) => value.getAttribute('aria-label'))).toEqual(pitches)
      expect(details).not.toHaveTextContent(chordText)
      unmount()
    }
  })
})

describe('chord-tone answer feedback', () => {
  it('teaches the two inner thirds and the outer fifth before the target answer', () => {
    const triad = buildTriad(MAJOR_KEYS[0], 1)
    const notes = createVoicing(triad.tones, 0)
    const question: ChordToneQuestion = {
      kind: 'chord-tone',
      id: 'c-major-third',
      triad,
      target: 'third',
      targetIndex: 1,
      notes,
      answer: pitchName(triad.tones[1]),
    }

    render(<FeedbackPanel question={question} notation="text" feedback={{ correct: true }} onReplay={vi.fn()} onNext={vi.fn()} isLast={false} />)

    const details = screen.getByRole('status').querySelector('.chord-feedback-details')
    expect(details?.children).toHaveLength(3)
    expect(details?.children[0]).toHaveTextContent('内部：根–三音 大三度，三音–五音 小三度')
    expect(details?.children[1]).toHaveTextContent('外框：根–五音 纯五度')
    expect(details?.children[2]).toHaveTextContent('题目的三音是 E')
    expect([...details!.querySelectorAll('.chord-feedback-value')].map((value) => value.textContent)).toEqual(['大三度', '小三度', '纯五度', 'E'])
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
