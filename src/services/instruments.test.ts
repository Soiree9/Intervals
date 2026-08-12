import { describe, expect, it } from 'vitest'
import {
  INSTRUMENTS,
  INSTRUMENT_PLAYBACK_POLICIES,
  SAMPLE_PACKS,
  playbackPolicyForInstrument,
  samplePackForInstrument,
} from './instruments'

describe('instrument rules and sample packs', () => {
  it('keeps stable instrument identities separate from replaceable sample-pack ids', () => {
    expect(INSTRUMENTS.piano.samplePackId).toBe('salamander-v10')
    expect(INSTRUMENTS['nylon-guitar'].samplePackId).toBe('quartertone-nylon-v1')
    expect(samplePackForInstrument('nylon-guitar')).toBe(SAMPLE_PACKS['quartertone-nylon-v1'])
    expect(samplePackForInstrument('nylon-guitar')).not.toHaveProperty('chordAttack')
    expect(playbackPolicyForInstrument('nylon-guitar')).not.toHaveProperty('urls')
  })

  it('keeps articulation in the instrument policy and excludes the mistuned D5 anchor', () => {
    expect(INSTRUMENT_PLAYBACK_POLICIES.piano).toEqual({ chordAttack: 'simultaneous', strumSeconds: 0 })
    expect(INSTRUMENT_PLAYBACK_POLICIES['nylon-guitar']).toEqual({ chordAttack: 'strum', strumSeconds: 0.03 })
    expect(samplePackForInstrument('nylon-guitar').urls).not.toHaveProperty('D5')
    expect(samplePackForInstrument('nylon-guitar').baseUrl).toContain('guitar-quartertone-v1')
    expect(samplePackForInstrument('nylon-guitar')).toMatchObject({
      version: '1',
      gainDb: -4.5,
      license: { name: 'CC BY 3.0' },
    })
  })
})
