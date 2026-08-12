import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NoteKeyboard } from './NoteKeyboard'

function KeyboardHarness({ slots = 3, onSubmit }: { slots?: number; onSubmit?: () => void }) {
  const [values, setValues] = useState(Array.from({ length: slots }, () => ''))
  const [active, setActive] = useState(0)
  return <NoteKeyboard values={values} activeIndex={active} onActiveIndexChange={setActive} onChange={setValues} onSubmit={onSubmit} />
}

function ExternalSlotsHarness() {
  const [values, setValues] = useState(['', '', '', ''])
  const [active, setActive] = useState(0)
  const groupId = 'progression-test'
  return <>
    {values.map((value, index) => <button
      type="button"
      key={index}
      data-note-entry-group={groupId}
      data-note-entry-slot={index}
      data-answer-scope-id={groupId}
      data-answer-slot={index}
      tabIndex={active === index ? 0 : -1}
      aria-label={`和弦 ${index + 1}：${value || '未填写'}`}
      onClick={() => setActive(index)}
    >{value || '—'}</button>)}
    <NoteKeyboard values={values} activeIndex={active} showSlots={false} keyboardGroupId={groupId} onActiveIndexChange={setActive} onChange={setValues} />
  </>
}

describe('NoteKeyboard', () => {
  it('fills independent slots and applies an accidental to the active note', () => {
    render(<KeyboardHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    fireEvent.click(screen.getByRole('button', { name: /第 2 个音/ }))
    fireEvent.click(screen.getByRole('button', { name: 'F' }))
    fireEvent.click(screen.getByRole('button', { name: '升号' }))
    expect(screen.getByRole('button', { name: '第 1 个音：C' })).toHaveTextContent('C')
    expect(screen.getByRole('button', { name: '第 2 个音：F♯' })).toBeInTheDocument()
  })

  it('clears only the active slot', () => {
    render(<KeyboardHarness slots={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    expect(screen.getByRole('button', { name: '第 1 个音：未填写' })).toHaveTextContent('—')
  })

  it('lets a submitted note slot play its filled value while keeping the keyboard locked', () => {
    const onValuePlay = vi.fn()
    render(<NoteKeyboard values={['E', 'G', 'C']} correctValues={['E', 'G', 'C']} activeIndex={0} disabled onActiveIndexChange={() => undefined} onChange={() => undefined} onValuePlay={onValuePlay} />)
    fireEvent.click(screen.getByRole('button', { name: /第 2 个音：G/ }))
    expect(onValuePlay).toHaveBeenCalledWith('G', 1)
    expect(screen.getByRole('button', { name: 'C' })).toBeDisabled()
  })

  it('can hide slots when another component renders the answer cells', () => {
    render(<NoteKeyboard values={['']} activeIndex={0} showSlots={false} onActiveIndexChange={() => undefined} onChange={() => undefined} />)
    expect(screen.queryByLabelText('音名填空')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
  })

  it('supports letters, accidentals, the b/B conflict, and Backspace', () => {
    render(<KeyboardHarness slots={1} />)
    const slot = () => screen.getByRole('button', { name: /第 1 个音/ })
    expect(slot()).toHaveFocus()

    fireEvent.keyDown(window, { key: 'e' })
    expect(slot()).toHaveTextContent('E')
    fireEvent.keyDown(window, { key: 'b' })
    expect(slot()).toHaveAccessibleName('第 1 个音：E♭')
    fireEvent.keyDown(window, { key: 'n' })
    expect(slot()).toHaveTextContent('E')
    fireEvent.keyDown(window, { key: 's' })
    expect(slot()).toHaveAccessibleName('第 1 个音：E♯')
    fireEvent.keyDown(window, { key: 'F' })
    fireEvent.keyDown(window, { key: '#' })
    expect(slot()).toHaveAccessibleName('第 1 个音：F♯')
    expect(fireEvent.keyDown(window, { key: 'Backspace' })).toBe(false)
    expect(slot()).toHaveTextContent('—')

    fireEvent.keyDown(window, { key: 'b' })
    expect(slot()).toHaveTextContent('B')
    fireEvent.keyDown(window, { key: 'A' })
    fireEvent.keyDown(window, { key: 'b' })
    expect(slot()).toHaveAccessibleName('第 1 个音：A♭')
    fireEvent.keyDown(window, { key: 'B', shiftKey: true })
    expect(slot()).toHaveTextContent('B')
  })

  it('wraps all arrow keys and Tab or Shift+Tab within the slot group', () => {
    render(<KeyboardHarness />)
    const slot = (index: number) => screen.getByRole('button', { name: new RegExp(`第 ${index} 个音`) })
    expect(slot(1)).toHaveFocus()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(slot(3)).toHaveFocus()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(slot(1)).toHaveFocus()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(slot(2)).toHaveFocus()
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(slot(1)).toHaveFocus()
    fireEvent.keyDown(slot(1), { key: 'Tab' })
    expect(slot(2)).toHaveFocus()
    fireEvent.keyDown(slot(2), { key: 'Tab', shiftKey: true })
    expect(slot(1)).toHaveFocus()
    fireEvent.keyDown(slot(1), { key: 'Tab', shiftKey: true })
    expect(slot(3)).toHaveFocus()
  })

  it('keeps a one-slot question stable and supports four external progression cells', () => {
    const { unmount } = render(<KeyboardHarness slots={1} />)
    const onlySlot = screen.getByRole('button', { name: /第 1 个音/ })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onlySlot).toHaveFocus()
    unmount()

    render(<ExternalSlotsHarness />)
    const cell = (index: number) => screen.getByRole('button', { name: new RegExp(`和弦 ${index}`) })
    expect(cell(1)).toHaveFocus()
    fireEvent.keyDown(window, { key: 'C' })
    expect(cell(1)).toHaveTextContent('C')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'E' })
    expect(cell(2)).toHaveTextContent('E')
    fireEvent.keyDown(cell(2), { key: 'Tab' })
    fireEvent.keyDown(window, { key: 'G' })
    expect(cell(3)).toHaveTextContent('G')
    fireEvent.keyDown(cell(3), { key: 'Tab', shiftKey: true })
    expect(cell(2)).toHaveFocus()
  })

  it('disables shortcuts after feedback and leaves normal Tab behavior outside the slot group', () => {
    const onChange = vi.fn()
    const { rerender } = render(<NoteKeyboard values={['C']} activeIndex={0} onActiveIndexChange={() => undefined} onChange={onChange} />)
    const letterButton = screen.getByRole('button', { name: 'A' })
    letterButton.focus()
    expect(fireEvent.keyDown(letterButton, { key: 'Tab' })).toBe(true)

    rerender(<NoteKeyboard values={['C']} activeIndex={0} disabled onActiveIndexChange={() => undefined} onChange={onChange} />)
    fireEvent.keyDown(window, { key: 'D' })
    expect(fireEvent.keyDown(window, { key: 'Backspace' })).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('submits with Enter only after every slot is complete and focus remains in the answer group', () => {
    const onSubmit = vi.fn()
    render(<><button type="button">外部控件</button><KeyboardHarness slots={2} onSubmit={onSubmit} /></>)
    fireEvent.keyDown(window, { key: 'C' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'E' })
    expect(fireEvent.keyDown(window, { key: 'Enter' })).toBe(false)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    screen.getByRole('button', { name: '外部控件' }).focus()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
