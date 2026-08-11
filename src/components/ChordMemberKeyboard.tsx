import type { ChordMember } from '../domain/types'

interface ChordMemberKeyboardProps {
  values: string[]
  correctValues?: readonly ChordMember[]
  activeIndex: number
  allowedMembers: Array<'R' | '3' | '5' | '7'>
  disabled?: boolean
  onActiveIndexChange: (index: number) => void
  onChange: (values: string[]) => void
}

export function ChordMemberKeyboard({
  values,
  correctValues,
  activeIndex,
  allowedMembers,
  disabled = false,
  onActiveIndexChange,
  onChange,
}: ChordMemberKeyboardProps) {
  const updateActive = (value: string) => {
    const next = [...values]
    next[activeIndex] = value
    onChange(next)
  }

  const chooseMember = (member: 'R' | '3' | '5' | '7') => {
    const flattened = values[activeIndex]?.startsWith('♭') && member !== 'R'
    updateActive(`${flattened ? '♭' : ''}${member}`)
  }

  const chooseAccidental = (flat: boolean) => {
    const current = values[activeIndex]
    if (!current || current === 'R') return
    updateActive(`${flat ? '♭' : ''}${current.replace('♭', '')}`)
  }

  return (
    <div className="member-entry">
      <div className="member-slots" aria-label="和弦成员排列">
        {values.map((value, index) => (
          <button
            type="button"
            key={index}
            className={`member-slot ${activeIndex === index && !disabled ? 'active' : ''} ${correctValues ? value === correctValues[index] ? 'correct' : 'wrong' : ''}`}
            onClick={() => !disabled && onActiveIndexChange(index)}
            disabled={disabled}
            aria-label={`第 ${index + 1} 个成员：${value || '未填写'}`}
          >
            {value || '—'}
          </button>
        ))}
      </div>
      <div className="member-keyboard" aria-label="和弦成员键盘">
        <div className="member-row">
          {allowedMembers.map((member) => <button type="button" key={member} onClick={() => chooseMember(member)} disabled={disabled}>{member}</button>)}
        </div>
        <div className="member-row modifiers">
          <button type="button" onClick={() => chooseAccidental(true)} disabled={disabled}>♭</button>
          <button type="button" onClick={() => chooseAccidental(false)} disabled={disabled}>♮</button>
          <button type="button" className="clear-key" onClick={() => updateActive('')} disabled={disabled}>清除</button>
        </div>
      </div>
    </div>
  )
}
