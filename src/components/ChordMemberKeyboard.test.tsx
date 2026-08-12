import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChordMemberKeyboard } from './ChordMemberKeyboard'

function MemberHarness({ onSubmit }: { onSubmit?: () => void }) {
  const [values, setValues] = useState(['', '', '', ''])
  const [active, setActive] = useState(0)
  return <ChordMemberKeyboard values={values} activeIndex={active} allowedMembers={['R', '3', '5', '7']} onActiveIndexChange={setActive} onChange={setValues} onSubmit={onSubmit} />
}

describe('ChordMemberKeyboard', () => {
  it('fills independent slots and flattens the active chord member', () => {
    render(<MemberHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'R' }))
    fireEvent.click(screen.getByRole('button', { name: /第 2 个成员/ }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    fireEvent.click(screen.getByRole('button', { name: '降号' }))
    expect(screen.getByRole('button', { name: '第 1 个成员：R' })).toHaveTextContent('R')
    expect(screen.getByRole('button', { name: '第 2 个成员：♭7' })).toBeInTheDocument()
  })

  it('does not apply a flat to the root', () => {
    render(<MemberHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'R' }))
    fireEvent.click(screen.getByRole('button', { name: '降号' }))
    expect(screen.getByRole('button', { name: '第 1 个成员：R' })).toHaveTextContent('R')
  })

  it('supports member, accidental, movement, clear, and complete-answer Enter hotkeys', () => {
    const onSubmit = vi.fn()
    render(<MemberHarness onSubmit={onSubmit} />)
    fireEvent.keyDown(window, { key: 'R' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.getByRole('button', { name: '第 2 个成员：♭3' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.getByRole('button', { name: '第 2 个成员：3' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.getByRole('button', { name: '第 2 个成员：未填写' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: '5' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: '7' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
