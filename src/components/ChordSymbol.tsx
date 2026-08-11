import { formatChordSymbol } from '../domain/music'
import type { ChordNotation, ChordQuality, PitchSpelling } from '../domain/types'

export function ChordSymbol({ chord, notation, className = '' }: { chord: { root: PitchSpelling; quality: ChordQuality }; notation: ChordNotation; className?: string }) {
  const symbol = formatChordSymbol(chord, notation)
  const [beforeTriangle, afterTriangle] = symbol.split('△')
  return (
    <span className={`chord-symbol ${className}`.trim()} aria-label={symbol}>
      {beforeTriangle}
      {afterTriangle !== undefined && <><span className="jazz-triangle" aria-hidden="true">△</span>{afterTriangle}</>}
    </span>
  )
}
