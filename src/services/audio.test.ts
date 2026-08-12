import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeNote } from '../domain/music'

const audioMocks = vi.hoisted(() => ({
  attack: vi.fn(),
  release: vi.fn(),
}))

vi.mock('tone', () => {
  class InstrumentMock {
    triggerAttackRelease(value: number | number[], duration: number, time: number) {
      audioMocks.attack(value, duration, time)
    }
    releaseAll() { audioMocks.release() }
    dispose() { return undefined }
    connect() { return this }
    toDestination() { return this }
  }
  return {
    Frequency: (midi: number) => ({ toFrequency: () => midi }),
    PolySynth: InstrumentMock,
    Sampler: InstrumentMock,
    EQ3: InstrumentMock,
    Synth: class {},
    loaded: () => Promise.resolve(),
    getContext: () => ({
      setTimeout: (callback: () => void, seconds: number) => window.setTimeout(callback, seconds * 1000),
      clearTimeout: (id: number) => window.clearTimeout(id),
    }),
    now: () => 10,
    start: () => Promise.resolve(),
  }
})

import {
  GUITAR_STRUM_SECONDS,
  PROGRESSION_BAR_SECONDS,
  PROGRESSION_BPM,
  SCALE_DEGREE_PLAYBACK_RATE,
  SEQUENTIAL_START_LEAD_SECONDS,
  playCadenceThenTone,
  playChordThenTone,
  playNotes,
  playProgression,
  stopAudio,
} from './audio'

const chord = [makeNote('C', 0, 4), makeNote('E', 0, 4), makeNote('G', 0, 4)]

describe('cancelable audio playback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    audioMocks.attack.mockClear()
    audioMocks.release.mockClear()
    stopAudio()
  })

  afterEach(() => {
    stopAudio()
    vi.useRealTimers()
  })

  it('cancels a delayed chord target tone when playback stops', async () => {
    await playChordThenTone(chord, chord[1])
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    stopAudio()
    await vi.advanceTimersByTimeAsync(2000)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    expect(audioMocks.release).toHaveBeenCalled()
  })

  it('lets only the newest playback batch continue', async () => {
    await playCadenceThenTone([chord, chord], chord[2])
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await playChordThenTone(chord, chord[0])
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(3000)
    expect(audioMocks.attack).toHaveBeenCalledTimes(3)
  })

  it('uses 1.4x progression speed and cancels future bars and highlights', async () => {
    const onStep = vi.fn()
    await playProgression([chord, chord, chord, chord], onStep)
    expect(PROGRESSION_BPM).toBeCloseTo(123.2)
    expect(PROGRESSION_BAR_SECONDS).toBeCloseTo((60 / 88 / 1.4) * 4)
    expect(onStep).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(PROGRESSION_BAR_SECONDS * 1000 + 1)
    expect(onStep).toHaveBeenCalledTimes(2)
    stopAudio()
    await vi.advanceTimersByTimeAsync(PROGRESSION_BAR_SECONDS * 3000)
    expect(onStep).toHaveBeenCalledTimes(2)
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
  })

  it('plays seventh-chord notes as an arpeggio or one harmonic attack', async () => {
    await playNotes(chord, 'arpeggio')
    expect(audioMocks.attack).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(SEQUENTIAL_START_LEAD_SECONDS * 1000)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1400)
    expect(audioMocks.attack).toHaveBeenCalledTimes(3)
    await playNotes(chord, 'harmonic')
    expect(audioMocks.attack).toHaveBeenCalledTimes(4)
    expect(audioMocks.attack.mock.calls.at(-1)?.[0]).toHaveLength(3)
  })

  it('keeps melodic attacks evenly spaced after a short start buffer', async () => {
    await playNotes(chord, 'melodic')
    await vi.advanceTimersByTimeAsync(SEQUENTIAL_START_LEAD_SECONDS * 1000)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(679)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(680)
    expect(audioMocks.attack).toHaveBeenCalledTimes(3)
  })

  it('cancels the buffered first melodic note before it starts', async () => {
    await playNotes(chord, 'melodic')
    stopAudio()
    await vi.advanceTimersByTimeAsync(2000)
    expect(audioMocks.attack).not.toHaveBeenCalled()
  })

  it('slows only the V–I–target sequence to 85 percent speed', async () => {
    await playCadenceThenTone([chord, chord], chord[2])
    expect(SCALE_DEGREE_PLAYBACK_RATE).toBe(0.85)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1299 / SCALE_DEGREE_PLAYBACK_RATE)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2)
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync((1600 / SCALE_DEGREE_PLAYBACK_RATE) + 2)
    expect(audioMocks.attack).toHaveBeenCalledTimes(3)
  })

  it('strums guitar chords about 30ms apart and cancels unplayed strings', async () => {
    await playNotes(chord, 'harmonic', 'nylon-guitar')
    expect(GUITAR_STRUM_SECONDS).toBeCloseTo(0.03)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(29)
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
    stopAudio()
    await vi.advanceTimersByTimeAsync(100)
    expect(audioMocks.attack).toHaveBeenCalledTimes(2)
  })

  it('sends identical D-major target midi pitches to piano and guitar playback', async () => {
    const dMajorSecondInversion = [makeNote('F', 1, 4), makeNote('A', 0, 4), makeNote('D', 0, 5)]
    await playNotes(dMajorSecondInversion, 'harmonic', 'piano')
    expect(audioMocks.attack.mock.calls.at(-1)?.[0]).toEqual([66, 69, 74])

    audioMocks.attack.mockClear()
    await playNotes(dMajorSecondInversion, 'harmonic', 'nylon-guitar')
    await vi.advanceTimersByTimeAsync(100)
    expect(audioMocks.attack.mock.calls.map((call) => call[0])).toEqual([66, 69, 74])
  })
})
