import { formatChordSymbol, pitchName } from '../domain/music'
import { SMUFL_CHORD_GLYPHS } from '../domain/smufl'
import type { ChordNotation, ChordQuality, PitchSpelling } from '../domain/types'
import { MusicAccidental } from './MusicText'

function ChordRoot({ root }: { root: PitchSpelling }) {
  const text = pitchName(root)
  return <span className="chord-root" aria-hidden="true">
    <span className="chord-root-letter">{text[0]}</span>
    {text.slice(1) && <MusicAccidental value={text.slice(1)} context="chord" />}
  </span>
}

function SymbolGlyph({ children }: { children: string }) {
  return <span className="smufl-chord-glyph">{children}</span>
}

function QualitySuffix({ quality, notation }: { quality: ChordQuality; notation: ChordNotation }) {
  if (quality === 'major') return null
  if (quality === 'minor') return notation === 'symbol' ? <SymbolGlyph>{SMUFL_CHORD_GLYPHS.minor}</SymbolGlyph> : <>m</>
  if (quality === 'diminished') return notation === 'symbol' ? <SymbolGlyph>{SMUFL_CHORD_GLYPHS.diminished}</SymbolGlyph> : <>dim</>
  if (quality === 'major7') return notation === 'symbol' ? <SymbolGlyph>{SMUFL_CHORD_GLYPHS.majorSeventh}</SymbolGlyph> : <>maj7</>
  if (quality === 'minor7') return notation === 'symbol'
    ? <><SymbolGlyph>{SMUFL_CHORD_GLYPHS.minor}</SymbolGlyph><span className="chord-extension">7</span></>
    : <>m7</>
  if (quality === 'dominant7') return <>7</>
  return notation === 'symbol'
    ? <><SymbolGlyph>{SMUFL_CHORD_GLYPHS.halfDiminished}</SymbolGlyph><span className="chord-extension">7</span></>
    : <>m7<span className="quality-alteration"><MusicAccidental value="♭" context="chord" /><span>5</span></span></>
}

export function ChordSymbol({ chord, notation, className = '' }: { chord: { root: PitchSpelling; quality: ChordQuality }; notation: ChordNotation; className?: string }) {
  const symbol = formatChordSymbol(chord, notation)
  return (
    <span className={`chord-symbol ${className}`.trim()} aria-label={symbol}>
      <ChordRoot root={chord.root} />
      <span className="chord-quality" aria-hidden="true"><QualitySuffix quality={chord.quality} notation={notation} /></span>
    </span>
  )
}
