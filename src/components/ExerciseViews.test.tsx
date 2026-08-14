import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAJOR_KEYS, buildTriad, pitchName } from '../domain/music'
import { createVoicing } from '../domain/questions'
import type { TriadFillQuestion } from '../domain/types'
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
  })
})
