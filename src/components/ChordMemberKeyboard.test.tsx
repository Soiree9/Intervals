import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ChordMemberKeyboard } from './ChordMemberKeyboard'

function MemberHarness() {
  const [values, setValues] = useState(['', '', '', ''])
  const [active, setActive] = useState(0)
  return <ChordMemberKeyboard values={values} activeIndex={active} allowedMembers={['R', '3', '5', '7']} onActiveIndexChange={setActive} onChange={setValues} />
}

describe('ChordMemberKeyboard', () => {
  it('fills independent slots and flattens the active chord member', () => {
    render(<MemberHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'R' }))
    fireEvent.click(screen.getByRole('button', { name: /第 2 个成员/ }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    fireEvent.click(screen.getByRole('button', { name: '♭' }))
    expect(screen.getByRole('button', { name: '第 1 个成员：R' })).toHaveTextContent('R')
    expect(screen.getByRole('button', { name: '第 2 个成员：♭7' })).toHaveTextContent('♭7')
  })

  it('does not apply a flat to the root', () => {
    render(<MemberHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'R' }))
    fireEvent.click(screen.getByRole('button', { name: '♭' }))
    expect(screen.getByRole('button', { name: '第 1 个成员：R' })).toHaveTextContent('R')
  })
})
