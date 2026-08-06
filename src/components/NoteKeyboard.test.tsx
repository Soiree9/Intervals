import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NoteKeyboard } from './NoteKeyboard'

function KeyboardHarness({ slots = 3 }: { slots?: number }) {
  const [values, setValues] = useState(Array.from({ length: slots }, () => ''))
  const [active, setActive] = useState(0)
  return <NoteKeyboard values={values} activeIndex={active} onActiveIndexChange={setActive} onChange={setValues} />
}

describe('NoteKeyboard', () => {
  it('fills independent slots and applies an accidental to the active note', () => {
    render(<KeyboardHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    fireEvent.click(screen.getByRole('button', { name: /第 2 个音/ }))
    fireEvent.click(screen.getByRole('button', { name: 'F' }))
    fireEvent.click(screen.getByRole('button', { name: '♯' }))
    expect(screen.getByRole('button', { name: /第 1 个音，当前为 C/ })).toHaveTextContent('C')
    expect(screen.getByRole('button', { name: /第 2 个音，当前为 F♯/ })).toHaveTextContent('F♯')
  })

  it('clears only the active slot', () => {
    render(<KeyboardHarness slots={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    expect(screen.getByRole('button', { name: '第 1 个音' })).toHaveTextContent('—')
  })
})
