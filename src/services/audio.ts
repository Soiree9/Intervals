import type { InstrumentId, NoteSpelling } from '../domain/types'
import type { EQ3, PolySynth, Sampler } from 'tone'
import { playbackPolicyForInstrument, samplePackForInstrument } from './instruments'

type ToneModule = typeof import('tone')
export type AudioSource = InstrumentId | 'synth'

let tone: ToneModule | null = null
let synth: PolySynth | null = null
const samplers = new Map<InstrumentId, Sampler>()
const equalizers = new Map<InstrumentId, EQ3>()
const readyInstruments = new Set<InstrumentId>()
const initializations = new Map<InstrumentId, Promise<AudioSource>>()
let playbackGeneration = 0
const playbackTimers = new Set<number>()

export const PROGRESSION_BPM = 88 * 1.4
export const PROGRESSION_BAR_SECONDS = (60 / PROGRESSION_BPM) * 4
export const GUITAR_STRUM_SECONDS = playbackPolicyForInstrument('nylon-guitar').strumSeconds
export const SCALE_DEGREE_PLAYBACK_RATE = 0.85
export const SEQUENTIAL_START_LEAD_SECONDS = 0.08

function timeout(milliseconds: number): Promise<never> {
  return new Promise((_, reject) => window.setTimeout(() => reject(new Error('Audio sample loading timed out.')), milliseconds))
}

async function ensureTone(): Promise<ToneModule> {
  if (!tone) tone = await import('tone')
  await tone.start()
  if (!synth) {
    synth = new tone.PolySynth(tone.Synth, {
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.25, release: 0.8 },
      oscillator: { type: 'triangle8' },
      volume: -9,
    }).toDestination()
  }
  return tone
}

export async function initializeAudio(instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const existing = initializations.get(instrument)
  if (existing) return existing
  const initialization = (async () => {
    const toneModule = await ensureTone()
    const samplePack = samplePackForInstrument(instrument)
    try {
      const sampler = new toneModule.Sampler({
        urls: samplePack.urls,
        baseUrl: samplePack.baseUrl,
        release: samplePack.release,
        volume: samplePack.gainDb,
      })
      const equalizer = new toneModule.EQ3(samplePack.eq.low, samplePack.eq.mid, samplePack.eq.high).toDestination()
      sampler.connect(equalizer)
      samplers.set(instrument, sampler)
      equalizers.set(instrument, equalizer)
      await Promise.race([toneModule.loaded(), timeout(8000)])
      readyInstruments.add(instrument)
      return instrument
    } catch {
      samplers.get(instrument)?.dispose()
      equalizers.get(instrument)?.dispose()
      samplers.delete(instrument)
      equalizers.delete(instrument)
      readyInstruments.delete(instrument)
      return 'synth'
    }
  })()
  initializations.set(instrument, initialization)
  return initialization
}

function frequency(note: NoteSpelling): number {
  if (!tone) return 440
  return tone.Frequency(note.midi, 'midi').toFrequency()
}

function trigger(value: number | number[], duration: number, time: number, instrument: InstrumentId): void {
  const sampler = samplers.get(instrument)
  if (readyInstruments.has(instrument) && sampler) sampler.triggerAttackRelease(value, duration, time)
  else synth?.triggerAttackRelease(value, duration, time)
}

export function stopAudio(): void {
  playbackGeneration += 1
  if (tone) playbackTimers.forEach((timer) => tone?.getContext().clearTimeout(timer))
  playbackTimers.clear()
  samplers.forEach((sampler) => sampler.releaseAll())
  synth?.releaseAll()
}

function beginPlayback(): number {
  stopAudio()
  return playbackGeneration
}

function triggerNow(value: number | number[], duration: number, instrument: InstrumentId): void {
  if (tone) trigger(value, duration, tone.now() + 0.02, instrument)
}

function schedulePlayback(generation: number, delay: number, action: () => void): void {
  if (!tone) return
  const timer = tone.getContext().setTimeout(() => {
    playbackTimers.delete(timer)
    if (generation === playbackGeneration) action()
  }, delay / 1000)
  playbackTimers.add(timer)
}

function triggerVoicing(generation: number, values: number[], duration: number, instrument: InstrumentId): void {
  const policy = playbackPolicyForInstrument(instrument)
  if (policy.chordAttack === 'simultaneous') {
    triggerNow(values, duration, instrument)
    return
  }
  values.forEach((value, index) => {
    if (index === 0) triggerNow(value, duration, instrument)
    else schedulePlayback(generation, index * policy.strumSeconds * 1000, () => triggerNow(value, duration, instrument))
  })
}

export async function playNotes(notes: NoteSpelling[], mode: 'melodic' | 'harmonic' | 'arpeggio', instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio(instrument)
  if (!tone || generation !== playbackGeneration) return source
  const frequencies = notes.map(frequency)
  if (mode === 'harmonic') {
    triggerVoicing(generation, frequencies, 1.2, instrument)
  } else {
    const gap = mode === 'arpeggio' ? 0.48 : 0.68
    frequencies.forEach((value, index) => {
      schedulePlayback(generation, (SEQUENTIAL_START_LEAD_SECONDS + index * gap) * 1000, () => triggerNow(value, 0.58, instrument))
    })
  }
  return source
}

export async function playImmediateNote(note: NoteSpelling, instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio(instrument)
  if (!tone || generation !== playbackGeneration) return source
  trigger(frequency(note), 0.8, tone.now(), instrument)
  return source
}

export async function playChordThenTone(chord: NoteSpelling[], target: NoteSpelling, instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio(instrument)
  if (!tone || generation !== playbackGeneration) return source
  triggerVoicing(generation, chord.map(frequency), 1.2, instrument)
  schedulePlayback(generation, 1550, () => triggerNow(frequency(target), 0.8, instrument))
  return source
}

export async function playCadenceThenTone(cadence: [NoteSpelling[], NoteSpelling[]], target: NoteSpelling, instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio(instrument)
  if (!tone || generation !== playbackGeneration) return source
  const slower = (value: number) => value / SCALE_DEGREE_PLAYBACK_RATE
  triggerVoicing(generation, cadence[0].map(frequency), slower(1.05), instrument)
  schedulePlayback(generation, slower(1300), () => triggerVoicing(generation, cadence[1].map(frequency), slower(1.25), instrument))
  schedulePlayback(generation, slower(2900), () => triggerNow(frequency(target), slower(0.8), instrument))
  return source
}

export async function playProgression(voicings: NoteSpelling[][], onStep?: (index: number) => void, instrument: InstrumentId = 'piano'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio(instrument)
  if (!tone || generation !== playbackGeneration) return source
  voicings.forEach((voicing, index) => {
    const playBar = () => {
      onStep?.(index)
      triggerVoicing(generation, voicing.map(frequency), PROGRESSION_BAR_SECONDS - 0.18, instrument)
    }
    if (index === 0) playBar()
    else schedulePlayback(generation, index * PROGRESSION_BAR_SECONDS * 1000, playBar)
  })
  return source
}
