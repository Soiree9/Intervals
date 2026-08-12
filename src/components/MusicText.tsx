import { parsePitchName, pitchName } from '../domain/music'
import { ACCIDENTAL_GLYPHS, CHORD_ACCIDENTAL_GLYPHS } from '../domain/smufl'
import type { ChordMember, PitchSpelling } from '../domain/types'

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

function accidentalGlyph(value: string, context: AccidentalContext): string {
  return (context === 'chord' ? CHORD_ACCIDENTAL_GLYPHS : ACCIDENTAL_GLYPHS)[value] ?? value
}

export function MusicAccidental({ value, context = 'pitch' }: { value: string; context?: AccidentalContext }) {
  return <span className={`music-accidental music-accidental-${context}`} aria-hidden="true">{accidentalGlyph(value, context)}</span>
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

export function ChordMemberSymbol({ value }: { value: string | ChordMember }) {
  const flat = value.startsWith('♭')
  return <span className="chord-member-symbol" aria-label={value}>
    {flat && <MusicAccidental value="♭" context="member" />}
    <span className="chord-member-value" aria-hidden="true">{value.replace('♭', '')}</span>
  </span>
}

export function ChordMemberSequence({ values }: { values: readonly string[] }) {
  return <span className="chord-member-sequence">
    {values.map((value, index) => <span className="chord-member-token" key={`${value}-${index}`}>
      {index > 0 && <span className="chord-member-separator" aria-hidden="true">–</span>}
      <ChordMemberSymbol value={value} />
    </span>)}
  </span>
}
