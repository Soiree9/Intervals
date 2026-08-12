import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parsePitchName } from '../domain/music'
import { ACCIDENTAL_GLYPHS, CHORD_ACCIDENTAL_GLYPHS, SMUFL_CHORD_GLYPHS } from '../domain/smufl'
import { ChordSymbol } from './ChordSymbol'
import { PitchName } from './MusicText'

describe('semantic music text', () => {
  it('keeps plain pitch text for accessibility while rendering a SMuFL accidental', () => {
    render(<PitchName value="A♭4" />)
    const pitch = screen.getByLabelText('A♭4')
    expect(pitch).toHaveTextContent(`A${ACCIDENTAL_GLYPHS['♭']}4`)
    expect(pitch).not.toHaveTextContent('♭')
  })

  it('renders double and triple accidentals as single standard SMuFL glyphs', () => {
    const { rerender } = render(<PitchName value="B♭♭4" />)
    expect(screen.getByLabelText('B♭♭4')).toHaveTextContent(`B${ACCIDENTAL_GLYPHS['♭♭']}4`)
    expect(screen.getByLabelText('B♭♭4').querySelectorAll('.music-accidental')).toHaveLength(1)

    rerender(<PitchName value="F♯♯4" />)
    expect(screen.getByLabelText('F♯♯4')).toHaveTextContent(`F${ACCIDENTAL_GLYPHS['♯♯']}4`)

    rerender(<PitchName value="E♭♭♭5" />)
    expect(screen.getByLabelText('E♭♭♭5')).toHaveTextContent(`E${ACCIDENTAL_GLYPHS['♭♭♭']}5`)
  })

  it('renders symbol major seventh with chord-specific Bravura glyphs', () => {
    render(<ChordSymbol chord={{ root: parsePitchName('D♭'), quality: 'major7' }} notation="symbol" />)
    const chord = screen.getByLabelText('D♭△')
    expect(chord).toHaveTextContent(CHORD_ACCIDENTAL_GLYPHS['♭'])
    expect(chord).toHaveTextContent(SMUFL_CHORD_GLYPHS.majorSeventh)
    expect(chord).not.toHaveTextContent('△')
  })

  it('uses chord-specific double-accidental glyphs for future chord roots', () => {
    render(<ChordSymbol chord={{ root: parsePitchName('Bbb'), quality: 'minor' }} notation="symbol" />)
    expect(screen.getByLabelText('B♭♭−')).toHaveTextContent(CHORD_ACCIDENTAL_GLYPHS['♭♭'])
  })

  it('switches diminished and half-diminished between complete text and symbol systems', () => {
    const { rerender } = render(<ChordSymbol chord={{ root: parsePitchName('C'), quality: 'diminished' }} notation="text" />)
    expect(screen.getByLabelText('Cdim')).toHaveTextContent('Cdim')
    rerender(<ChordSymbol chord={{ root: parsePitchName('C'), quality: 'diminished' }} notation="symbol" />)
    expect(screen.getByLabelText('C°')).toHaveTextContent(SMUFL_CHORD_GLYPHS.diminished)
    rerender(<ChordSymbol chord={{ root: parsePitchName('C'), quality: 'half-diminished7' }} notation="text" />)
    expect(screen.getByLabelText('Cm7♭5')).toHaveTextContent(CHORD_ACCIDENTAL_GLYPHS['♭'])
    rerender(<ChordSymbol chord={{ root: parsePitchName('C'), quality: 'half-diminished7' }} notation="symbol" />)
    expect(screen.getByLabelText('Cø7')).toHaveTextContent(SMUFL_CHORD_GLYPHS.halfDiminished)
  })
})
