interface NoteKeyboardProps {
  values: string[]
  correctValues?: string[]
  activeIndex: number
  disabled?: boolean
  onActiveIndexChange: (index: number) => void
  onChange: (values: string[]) => void
  onValuePlay?: (value: string, index: number) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

function accidentalOf(value: string): string {
  return value.slice(1)
}

export function NoteKeyboard({ values, correctValues, activeIndex, disabled = false, onActiveIndexChange, onChange, onValuePlay }: NoteKeyboardProps) {
  const updateActive = (value: string) => {
    const next = [...values]
    next[activeIndex] = value
    onChange(next)
  }

  const chooseLetter = (letter: string) => updateActive(`${letter}${accidentalOf(values[activeIndex] ?? '')}`)
  const chooseAccidental = (accidental: string) => {
    const current = values[activeIndex]
    if (!current) return
    updateActive(`${current[0]}${accidental}`)
  }

  return (
    <div className="note-entry">
      <div className="note-slots" aria-label="音名填空">
        {values.map((value, index) => (
          <button
            type="button"
            key={index}
            className={`note-slot ${activeIndex === index && !disabled ? 'active' : ''} ${correctValues ? (value === correctValues[index] ? 'correct' : 'wrong') : ''} ${disabled && value && onValuePlay ? 'playable' : ''}`}
            onClick={() => disabled ? value && onValuePlay?.(value, index) : onActiveIndexChange(index)}
            disabled={disabled && (!value || !onValuePlay)}
            aria-label={`第 ${index + 1} 个音${value ? `，当前为 ${value}` : ''}${disabled && value && onValuePlay ? '，点击试听' : ''}`}
          >
            {value || '—'}
          </button>
        ))}
      </div>
      <div className="note-keyboard" aria-label="音名键盘">
        <div className="letter-row">
          {LETTERS.map((letter) => (
            <button type="button" key={letter} onClick={() => chooseLetter(letter)} disabled={disabled}>{letter}</button>
          ))}
        </div>
        <div className="accidental-row">
          <button type="button" onClick={() => chooseAccidental('♭')} disabled={disabled}>♭</button>
          <button type="button" onClick={() => chooseAccidental('')} disabled={disabled}>♮</button>
          <button type="button" onClick={() => chooseAccidental('♯')} disabled={disabled}>♯</button>
          <button type="button" className="clear-key" onClick={() => updateActive('')} disabled={disabled}>清除</button>
        </div>
      </div>
    </div>
  )
}
