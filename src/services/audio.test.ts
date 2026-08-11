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
    toDestination() { return this }
  }
  return {
    Frequency: (midi: number) => ({ toFrequency: () => midi }),
    PolySynth: InstrumentMock,
    Sampler: InstrumentMock,
    Synth: class {},
    loaded: () => Promise.resolve(),
    now: () => 10,
    start: () => Promise.resolve(),
  }
})

import {
  PROGRESSION_BAR_SECONDS,
  PROGRESSION_BPM,
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
    expect(audioMocks.attack).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1400)
    expect(audioMocks.attack).toHaveBeenCalledTimes(3)
    await playNotes(chord, 'harmonic')
    expect(audioMocks.attack).toHaveBeenCalledTimes(4)
    expect(audioMocks.attack.mock.calls.at(-1)?.[0]).toHaveLength(3)
  })
})
