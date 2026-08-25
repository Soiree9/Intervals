import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parsePitchName } from '../domain/music'
import { CHORD_ACCIDENTAL_GLYPHS, SMUFL_CHORD_GLYPHS, TEXT_ACCIDENTAL_GLYPHS } from '../domain/smufl'
import { ChordSymbol } from './ChordSymbol'
import { ChordMemberSequence, PitchName, PitchSequence, StepFormula } from './MusicText'

describe('semantic music text', () => {
  it('keeps plain pitch text for accessibility while rendering a SMuFL accidental', () => {
    render(<PitchName value="A♭4" />)
    const pitch = screen.getByLabelText('A♭4')
    expect(pitch).toHaveTextContent(`A${TEXT_ACCIDENTAL_GLYPHS['♭']}4`)
    expect(pitch).not.toHaveTextContent('♭')
  })

  it('renders double and triple accidentals as single standard SMuFL glyphs', () => {
    const { rerender } = render(<PitchName value="B♭♭4" />)
    expect(screen.getByLabelText('B♭♭4')).toHaveTextContent(`B${TEXT_ACCIDENTAL_GLYPHS['♭♭']}4`)
    expect(screen.getByLabelText('B♭♭4').querySelectorAll('.music-accidental')).toHaveLength(1)

    rerender(<PitchName value="F♯♯4" />)
    expect(screen.getByLabelText('F♯♯4')).toHaveTextContent(`F${TEXT_ACCIDENTAL_GLYPHS['♯♯']}4`)

    rerender(<PitchName value="E♭♭♭5" />)
    expect(screen.getByLabelText('E♭♭♭5')).toHaveTextContent(`E${TEXT_ACCIDENTAL_GLYPHS['♭♭♭']}5`)
  })

  it('can space a short pitch separator and renders labeled whole/half-step marks', () => {
    const { rerender } = render(<PitchSequence values={[parsePitchName('E♭'), parsePitchName('F')]} />)
    expect(screen.getByText('-')).toHaveClass('pitch-sequence-separator', 'spacious')

    rerender(<StepFormula steps={['whole', 'half']} />)
    expect(screen.getByLabelText('全音加半音')).toBeInTheDocument()
    expect(document.querySelector('.step-unit-whole .step-unit-half-frame')).toBeInTheDocument()
    expect(document.querySelector('.step-unit-half .step-unit-half-frame')).toBeInTheDocument()
  })

  it('renders altered chord members as compact music symbols with short spaced separators', () => {
    render(<ChordMemberSequence values={['♭5', 'R', '♭3']} />)

    expect(screen.getByLabelText('♭5')).toHaveTextContent(`${TEXT_ACCIDENTAL_GLYPHS['♭']}5`)
    expect(screen.getByLabelText('♭3')).toHaveTextContent(`${TEXT_ACCIDENTAL_GLYPHS['♭']}3`)
    expect(screen.getAllByText('-')).toHaveLength(2)
    expect(document.querySelectorAll('.chord-member-separator')).toHaveLength(2)
  })

  it('labels natural thirds and sevenths as major members', () => {
    render(<ChordMemberSequence values={['R', '7', '♭7', '3', '♭3', '5', '♭5']} />)

    expect(screen.getByLabelText('M7')).toHaveTextContent('M7')
    expect(screen.getByLabelText('M3')).toHaveTextContent('M3')
    expect(screen.getByLabelText('♭7')).toBeInTheDocument()
    expect(screen.getByLabelText('♭3')).toBeInTheDocument()
  })

  it('marks the standalone fifth for a lining numeral without changing other member labels', () => {
    render(<ChordMemberSequence values={['M7', 'M3', '5', 'R']} />)

    expect(screen.getByLabelText('5').querySelector('.chord-member-value')).toHaveClass('chord-member-lining-figure')
    expect(screen.getByLabelText('M3').querySelector('.chord-member-value')).not.toHaveClass('chord-member-lining-figure')
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
