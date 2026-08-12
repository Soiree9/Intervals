import { useCallback, useEffect, useId } from 'react'
import type { ChordMember } from '../domain/types'
import { activeAnswerSlot, focusAnswerSlot, isPlainHotkey, useCompleteAnswerSubmit, wraps } from './answerHotkeys'
import { ChordMemberSymbol, MusicAccidental } from './MusicText'

interface ChordMemberKeyboardProps {
  values: string[]
  correctValues?: readonly ChordMember[]
  activeIndex: number
  allowedMembers: Array<'R' | '3' | '5' | '7'>
  disabled?: boolean
  focusKey?: string
  onActiveIndexChange: (index: number) => void
  onChange: (values: string[]) => void
  onSubmit?: () => void
}

export function ChordMemberKeyboard({
  values,
  correctValues,
  activeIndex,
  allowedMembers,
  disabled = false,
  focusKey,
  onActiveIndexChange,
  onChange,
  onSubmit,
}: ChordMemberKeyboardProps) {
  const scopeId = useId()
  const updateActive = useCallback((value: string) => {
    const next = [...values]
    next[activeIndex] = value
    onChange(next)
  }, [activeIndex, onChange, values])

  const focusActive = useCallback(() => focusAnswerSlot(scopeId, activeIndex), [activeIndex, scopeId])

  const chooseMember = useCallback((member: 'R' | '3' | '5' | '7') => {
    const flattened = values[activeIndex]?.startsWith('♭') && member !== 'R'
    updateActive(`${flattened ? '♭' : ''}${member}`)
    focusActive()
  }, [activeIndex, focusActive, updateActive, values])

  const chooseAccidental = useCallback((flat: boolean) => {
    const current = values[activeIndex]
    if (!current || current === 'R') return
    updateActive(`${flat ? '♭' : ''}${current.replace('♭', '')}`)
    focusActive()
  }, [activeIndex, focusActive, updateActive, values])

  useCompleteAnswerSubmit({ scopeId, enabled: !disabled, complete: values.every(Boolean), onSubmit })

  useEffect(() => {
    if (!disabled) focusAnswerSlot(scopeId, 0)
  }, [disabled, focusKey, scopeId, values.length])

  useEffect(() => {
    if (disabled || !values.length) return
    const move = (offset: number) => {
      const nextIndex = wraps(activeIndex, offset, values.length)
      onActiveIndexChange(nextIndex)
      focusAnswerSlot(scopeId, nextIndex)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlainHotkey(event) || !activeAnswerSlot(scopeId)) return
      if (event.key === 'Tab') {
        event.preventDefault()
        move(event.shiftKey ? -1 : 1)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        move(-1)
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(1)
        return
      }
      const member = event.key.toUpperCase()
      if (allowedMembers.includes(member as 'R' | '3' | '5' | '7')) {
        event.preventDefault()
        chooseMember(member as 'R' | '3' | '5' | '7')
        return
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        chooseAccidental(true)
        return
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        chooseAccidental(false)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        updateActive('')
        focusActive()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, allowedMembers, chooseAccidental, chooseMember, disabled, focusActive, onActiveIndexChange, scopeId, updateActive, values])

  return (
    <div className="member-entry">
      <div className="member-slots" aria-label="和弦成员顺序">
        {values.map((value, index) => (
          <button
            type="button"
            key={index}
            className={`member-slot ${activeIndex === index && !disabled ? 'active' : ''} ${correctValues ? value === correctValues[index] ? 'correct' : 'wrong' : ''}`}
            onClick={() => !disabled && onActiveIndexChange(index)}
            disabled={disabled}
            data-answer-scope-id={scopeId}
            data-answer-slot={index}
            data-quiz-answer-control="true"
            tabIndex={activeIndex === index && !disabled ? 0 : -1}
            aria-label={`第 ${index + 1} 个成员：${value || '未填写'}`}
          >
            {value ? <ChordMemberSymbol value={value} /> : '—'}
          </button>
        ))}
      </div>
      <div className="member-keyboard" aria-label="选择和弦成员">
        <div className="member-row">
          {allowedMembers.map((member) => <button type="button" key={member} onClick={() => chooseMember(member)} disabled={disabled}><ChordMemberSymbol value={member} /></button>)}
        </div>
        <div className="member-row modifiers">
          <button type="button" aria-label="降号" onClick={() => chooseAccidental(true)} disabled={disabled}><MusicAccidental value="♭" context="keyboard" /></button>
          <button type="button" aria-label="还原号" onClick={() => chooseAccidental(false)} disabled={disabled}><MusicAccidental value="♮" context="keyboard" /></button>
          <button type="button" className="clear-key" onClick={() => { updateActive(''); focusActive() }} disabled={disabled}>清除</button>
        </div>
      </div>
    </div>
  )
}
