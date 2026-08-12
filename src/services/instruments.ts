import type { InstrumentId } from '../domain/types'

export type SamplePackId = 'salamander-v10' | 'quartertone-nylon-v1'

export interface SamplePackProfile {
  id: SamplePackId
  version: string
  baseUrl: string
  urls: Record<string, string>
  release: number
  gainDb: number
  eq: { low: number; mid: number; high: number }
  license: {
    name: string
    url: string
    sourceUrl: string
    attribution: string
  }
}

export interface InstrumentPlaybackPolicy {
  chordAttack: 'simultaneous' | 'strum'
  strumSeconds: number
}

export interface InstrumentDefinition {
  id: InstrumentId
  label: string
  samplePackId: SamplePackId
}

const PIANO_URLS = {
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
}

const GUITAR_URLS = {
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  B3: 'B3.mp3',
  'C#4': 'Cs4.mp3',
  'D#4': 'Ds4.mp3',
  E4: 'E4.mp3',
  'F#4': 'Fs4.mp3',
  'G#4': 'Gs4.mp3',
  A4: 'A4.mp3',
  B4: 'B4.mp3',
  'C#5': 'Cs5.mp3',
  E5: 'E5.mp3',
}

export const SAMPLE_PACKS: Record<SamplePackId, SamplePackProfile> = {
  'salamander-v10': {
    id: 'salamander-v10',
    version: '10',
    baseUrl: `${import.meta.env.BASE_URL}audio/piano-v10/`,
    urls: PIANO_URLS,
    release: 0.9,
    gainDb: -7.5,
    eq: { low: -1.5, mid: -0.8, high: 1.6 },
    license: {
      name: 'CC BY 3.0',
      url: 'https://creativecommons.org/licenses/by/3.0/',
      sourceUrl: 'https://github.com/sfzinstruments/SalamanderGrandPiano',
      attribution: 'Salamander Grand Piano V3 by Alexander Holm',
    },
  },
  'quartertone-nylon-v1': {
    id: 'quartertone-nylon-v1',
    version: '1',
    baseUrl: `${import.meta.env.BASE_URL}audio/guitar-quartertone-v1/`,
    urls: GUITAR_URLS,
    release: 1.05,
    gainDb: -4.5,
    eq: { low: 0.8, mid: 0.3, high: -4.2 },
    license: {
      name: 'CC BY 3.0',
      url: 'https://creativecommons.org/licenses/by/3.0/',
      sourceUrl: 'https://github.com/nbrosowsky/tonejs-instruments',
      attribution: 'Quartertone Yamaha Classical Guitar, edited by nbrosowsky',
    },
  },
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentDefinition> = {
  piano: { id: 'piano', label: '钢琴', samplePackId: 'salamander-v10' },
  'nylon-guitar': { id: 'nylon-guitar', label: '古典吉他', samplePackId: 'quartertone-nylon-v1' },
}

export const INSTRUMENT_PLAYBACK_POLICIES: Record<InstrumentId, InstrumentPlaybackPolicy> = {
  piano: { chordAttack: 'simultaneous', strumSeconds: 0 },
  'nylon-guitar': { chordAttack: 'strum', strumSeconds: 0.03 },
}

export function samplePackForInstrument(instrument: InstrumentId): SamplePackProfile {
  return SAMPLE_PACKS[INSTRUMENTS[instrument].samplePackId]
}

export function playbackPolicyForInstrument(instrument: InstrumentId): InstrumentPlaybackPolicy {
  return INSTRUMENT_PLAYBACK_POLICIES[instrument]
}
