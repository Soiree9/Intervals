import { chordMemberLabel, parsePitchName, pitchName } from '../domain/music'
import { TEXT_ACCIDENTAL_GLYPHS } from '../domain/smufl'
import type { ChordMember, NoteSpelling, PitchSpelling } from '../domain/types'

type AccidentalContext = 'pitch' | 'chord' | 'member' | 'keyboard'

function splitAccidentalAndSuffix(value: string): [string, string] {
  let accidental = ''
  let index = 0
  for (const character of value) {
    if ('b♭#♯♮'.includes(character)) accidental += character === 'b' ? '♭' : character === '#' ? '♯' : character
    else if (character === '𝄫') accidental += '♭♭'
    else if (character === '𝄪') accidental += '♯♯'
    else break
    index += character.length
  }
  return [accidental, value.slice(index)]
}

function accidentalGlyph(value: string): string {
  return TEXT_ACCIDENTAL_GLYPHS[value] ?? value
}

export function MusicAccidental({ value, context = 'pitch' }: { value: string; context?: AccidentalContext }) {
  return <span className={`music-accidental music-accidental-${context}`} aria-hidden="true">{accidentalGlyph(value)}</span>
}

export function PitchName({ value, className = '' }: { value: string | PitchSpelling; className?: string }) {
  const text = typeof value === 'string' ? value : pitchName(value)
  const normalized = typeof value === 'string' ? text : pitchName(parsePitchName(text))
  const letter = normalized[0] ?? ''
  const rest = normalized.slice(1)
  const [accidental, suffix] = splitAccidentalAndSuffix(rest)

  return <span className={`pitch-name ${className}`.trim()} aria-label={text}>
    <span className="pitch-letter" aria-hidden="true">{letter}</span>
    {accidental && <span className="pitch-accidentals" aria-hidden="true">
      <MusicAccidental value={accidental} />
    </span>}
    {suffix && <span className="pitch-suffix" aria-hidden="true">{suffix}</span>}
  </span>
}

export function PitchSequence({ values, separator = '-', spacious = true }: { values: readonly (string | PitchSpelling | NoteSpelling)[]; separator?: string; spacious?: boolean }) {
  return <>{values.map((value, index) => <span key={`${typeof value === 'string' ? value : pitchName(value)}-${index}`}>
    {index > 0 && <span className={`pitch-sequence-separator ${spacious ? 'spacious' : ''}`} aria-hidden="true">{separator}</span>}
    <PitchName value={value} />
  </span>)}</>
}

export function StepFormula({ steps }: { steps: readonly ('whole' | 'half')[] }) {
  const label = steps.map((step) => step === 'whole' ? '全音' : '半音').join('加')
  return <span className="step-formula" aria-label={label}>
    {steps.map((step, index) => <span className="step-formula-part" key={`${step}-${index}`}>
      {index > 0 && <span className="step-formula-plus" aria-hidden="true">＋</span>}
      <span className={`step-unit step-unit-${step}`} aria-hidden="true">
        <span className="step-unit-half-frame" />
        <span>{step === 'whole' ? '全音' : '半音'}</span>
      </span>
    </span>)}
  </span>
}

export function ChordMemberSymbol({ value }: { value: string | ChordMember }) {
  const label = chordMemberLabel(value)
  const flat = label.startsWith('♭')
  const memberValue = label.replace('♭', '')
  return <span className="chord-member-symbol" aria-label={label}>
    {flat && <MusicAccidental value="♭" context="member" />}
    <span className={`chord-member-value ${memberValue === '5' ? 'chord-member-lining-figure' : ''}`} aria-hidden="true">{memberValue}</span>
  </span>
}

export function ChordMemberSequence({ values }: { values: readonly string[] }) {
  return <span className="chord-member-sequence">
    {values.map((value, index) => <span className="chord-member-token" key={`${value}-${index}`}>
      {index > 0 && <span className="chord-member-separator" aria-hidden="true">-</span>}
      <ChordMemberSymbol value={value} />
    </span>)}
  </span>
}
