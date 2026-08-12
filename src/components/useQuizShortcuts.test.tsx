import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePreserveAnswerFocus, useQuizShortcuts } from './useQuizShortcuts'

function Harness({ feedbackVisible, onReplay, onNext }: { feedbackVisible: boolean; onReplay: () => void; onNext: () => void }) {
  useQuizShortcuts({ enabled: true, feedbackVisible, onReplay, onNext })
  usePreserveAnswerFocus(true)
  return <>
    <button type="button">模式按钮</button>
    <button type="button" data-quiz-answer-control="true">答案按钮</button>
  </>
}

describe('quiz shortcuts', () => {
  it('uses Space for replay and Enter for the next question after feedback', () => {
    const onReplay = vi.fn()
    const onNext = vi.fn()
    render(<Harness feedbackVisible onReplay={onReplay} onNext={onNext} />)

    expect(fireEvent.keyDown(window, { key: ' ' })).toBe(false)
    expect(onReplay).toHaveBeenCalledTimes(1)
    expect(fireEvent.keyDown(screen.getByRole('button', { name: '答案按钮' }), { key: 'Enter' })).toBe(false)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('preserves native keyboard behavior on explicit non-answer controls', () => {
    const onReplay = vi.fn()
    const onNext = vi.fn()
    render(<Harness feedbackVisible onReplay={onReplay} onNext={onNext} />)
    const modeButton = screen.getByRole('button', { name: '模式按钮' })

    fireEvent.keyDown(modeButton, { key: ' ' })
    fireEvent.keyDown(modeButton, { key: 'Enter' })
    expect(onReplay).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('does not use Enter as a global action before feedback', () => {
    const onNext = vi.fn()
    render(<Harness feedbackVisible={false} onReplay={() => undefined} onNext={onNext} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('keeps the answer control focused when an auxiliary button is clicked with a mouse', () => {
    render(<Harness feedbackVisible={false} onReplay={() => undefined} onNext={() => undefined} />)
    const answer = screen.getByRole('button', { name: '答案按钮' })
    const mode = screen.getByRole('button', { name: '模式按钮' })
    answer.focus()

    expect(fireEvent.mouseDown(mode)).toBe(false)
    fireEvent.click(mode)
    expect(answer).toHaveFocus()
  })

  it('does not leave an auxiliary button focused after feedback, so Space still replays', () => {
    const onReplay = vi.fn()
    render(<Harness feedbackVisible onReplay={onReplay} onNext={() => undefined} />)
    const mode = screen.getByRole('button', { name: '模式按钮' })

    expect(fireEvent.mouseDown(mode)).toBe(false)
    fireEvent.click(mode)
    expect(mode).not.toHaveFocus()
    fireEvent.keyDown(window, { key: ' ' })
    expect(onReplay).toHaveBeenCalledTimes(1)
  })
})
