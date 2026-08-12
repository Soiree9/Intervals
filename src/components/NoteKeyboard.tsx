import { useCallback, useEffect, useId } from 'react'
import { activeAnswerSlot, answerSlots, focusAnswerSlot, isPlainHotkey, useCompleteAnswerSubmit, wraps } from './answerHotkeys'
import { MusicAccidental, PitchName } from './MusicText'

interface NoteKeyboardProps {
  values: string[]
  correctValues?: string[]
  activeIndex: number
  disabled?: boolean
  showSlots?: boolean
  keyboardGroupId?: string
  focusKey?: string
  onActiveIndexChange: (index: number) => void
  onChange: (values: string[]) => void
  onValuePlay?: (value: string, index: number) => void
  onSubmit?: () => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export function NoteKeyboard({
  values,
  correctValues,
  activeIndex,
  disabled = false,
  showSlots = true,
  keyboardGroupId,
  focusKey,
  onActiveIndexChange,
  onChange,
  onValuePlay,
  onSubmit,
}: NoteKeyboardProps) {
  const generatedGroupId = useId()
  const groupId = keyboardGroupId ?? generatedGroupId

  const updateActive = useCallback((value: string) => {
    const next = [...values]
    next[activeIndex] = value
    onChange(next)
  }, [activeIndex, onChange, values])

  const chooseLetter = (letter: string) => {
    updateActive(letter)
    focusAnswerSlot(groupId, activeIndex)
  }
  const chooseAccidental = (accidental: string) => {
    const current = values[activeIndex]
    if (current) updateActive(`${current[0]}${accidental}`)
    focusAnswerSlot(groupId, activeIndex)
  }

  const focusSlot = useCallback((index: number) => {
    focusAnswerSlot(groupId, index)
  }, [groupId])

  useCompleteAnswerSubmit({ scopeId: groupId, enabled: !disabled, complete: values.every(Boolean), onSubmit })

  useEffect(() => {
    if (disabled) return
    answerSlots(groupId).find((element) => Number(element.dataset.answerSlot) === 0)?.focus()
  }, [disabled, focusKey, focusSlot, groupId, values.length])

  useEffect(() => {
    if (disabled || !values.length) return
    const move = (offset: number) => {
      const nextIndex = wraps(activeIndex, offset, values.length)
      onActiveIndexChange(nextIndex)
      focusSlot(nextIndex)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlainHotkey(event) || !activeAnswerSlot(groupId)) return
      const current = values[activeIndex] ?? ''
      const key = event.key
      const lowerKey = key.toLowerCase()

      if (key === 'Tab') {
        event.preventDefault()
        move(event.shiftKey ? -1 : 1)
        return
      }
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        event.preventDefault()
        move(-1)
        return
      }
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        event.preventDefault()
        move(1)
        return
      }
      if (/^[acdefg]$/i.test(key) || key === 'B') {
        event.preventDefault()
        updateActive(key.toUpperCase())
        focusSlot(activeIndex)
        return
      }
      if (key === 'b') {
        event.preventDefault()
        updateActive(current ? `${current[0]}♭` : 'B')
        focusSlot(activeIndex)
        return
      }
      if (lowerKey === 's' || key === '#') {
        event.preventDefault()
        if (current) updateActive(`${current[0]}♯`)
        focusSlot(activeIndex)
        return
      }
      if (lowerKey === 'n') {
        event.preventDefault()
        if (current) updateActive(current[0])
        focusSlot(activeIndex)
        return
      }
      if (key === 'Backspace') {
        event.preventDefault()
        updateActive('')
        focusSlot(activeIndex)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, disabled, focusSlot, groupId, onActiveIndexChange, updateActive, values])

  return (
    <div className="note-entry">
      {showSlots && <div className="note-slots" aria-label="音名填空">
        {values.map((value, index) => (
          <button
            type="button"
            key={index}
            className={`note-slot ${activeIndex === index && !disabled ? 'active' : ''} ${correctValues ? (value === correctValues[index] ? 'correct' : 'wrong') : ''} ${disabled && value && onValuePlay ? 'playable' : ''}`}
            onClick={() => disabled ? value && onValuePlay?.(value, index) : onActiveIndexChange(index)}
            disabled={disabled && (!value || !onValuePlay)}
            data-note-entry-group={groupId}
            data-note-entry-slot={index}
            data-answer-scope-id={groupId}
            data-answer-slot={index}
            data-quiz-answer-control="true"
            tabIndex={activeIndex === index && !disabled ? 0 : -1}
            aria-label={`第 ${index + 1} 个音：${value || '未填写'}${disabled && value && onValuePlay ? '，点击试听' : ''}`}
          >
            {value ? <PitchName value={value} /> : '—'}
          </button>
        ))}
      </div>}
      <div className="note-keyboard" aria-label="音名键盘">
        <div className="letter-row">
          {LETTERS.map((letter) => <button type="button" key={letter} onClick={() => chooseLetter(letter)} disabled={disabled}>{letter}</button>)}
        </div>
        <div className="accidental-row">
          <button type="button" aria-label="降号" onClick={() => chooseAccidental('♭')} disabled={disabled}><MusicAccidental value="♭" context="keyboard" /></button>
          <button type="button" aria-label="还原号" onClick={() => chooseAccidental('')} disabled={disabled}><MusicAccidental value="♮" context="keyboard" /></button>
          <button type="button" aria-label="升号" onClick={() => chooseAccidental('♯')} disabled={disabled}><MusicAccidental value="♯" context="keyboard" /></button>
          <button type="button" className="clear-key" onClick={() => { updateActive(''); focusAnswerSlot(groupId, activeIndex) }} disabled={disabled}>清除</button>
        </div>
      </div>
    </div>
  )
}
