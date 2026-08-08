import type { NoteSpelling } from '../domain/types'
import type { PolySynth, Sampler } from 'tone'

type ToneModule = typeof import('tone')
export type AudioSource = 'piano' | 'synth'

let tone: ToneModule | null = null
let sampler: Sampler | null = null
let synth: PolySynth | null = null
let sampleReady = false
let initialization: Promise<AudioSource> | null = null
let playbackGeneration = 0
const playbackTimers = new Set<number>()

export const PROGRESSION_BPM = 88 * 1.4
export const PROGRESSION_BAR_SECONDS = (60 / PROGRESSION_BPM) * 4

const sampleUrls = {
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
}

function timeout(milliseconds: number): Promise<never> {
  return new Promise((_, reject) => window.setTimeout(() => reject(new Error('Audio sample loading timed out.')), milliseconds))
}

export async function initializeAudio(): Promise<AudioSource> {
  if (initialization) return initialization
  initialization = (async () => {
    tone = await import('tone')
    await tone.start()
    synth = new tone.PolySynth(tone.Synth, {
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.25, release: 0.8 },
      oscillator: { type: 'triangle8' },
      volume: -9,
    }).toDestination()

    try {
      sampler = new tone.Sampler({
        urls: sampleUrls,
        baseUrl: `${import.meta.env.BASE_URL}audio/`,
        release: 1.1,
        volume: -5,
      }).toDestination()
      await Promise.race([tone.loaded(), timeout(8000)])
      sampleReady = true
      return 'piano'
    } catch {
      sampler?.dispose()
      sampler = null
      sampleReady = false
      return 'synth'
    }
  })()
  return initialization
}

function frequency(note: NoteSpelling): number {
  if (!tone) return 440
  return tone.Frequency(note.midi, 'midi').toFrequency()
}

function trigger(value: number | number[], duration: number, time: number): void {
  if (sampleReady && sampler) sampler.triggerAttackRelease(value, duration, time)
  else synth?.triggerAttackRelease(value, duration, time)
}

export function stopAudio(): void {
  playbackGeneration += 1
  playbackTimers.forEach((timer) => window.clearTimeout(timer))
  playbackTimers.clear()
  sampler?.releaseAll()
  synth?.releaseAll()
}

function beginPlayback(): number {
  stopAudio()
  return playbackGeneration
}

function triggerNow(value: number | number[], duration: number): void {
  if (tone) trigger(value, duration, tone.now() + 0.02)
}

function schedulePlayback(generation: number, delay: number, action: () => void): void {
  const timer = window.setTimeout(() => {
    playbackTimers.delete(timer)
    if (generation === playbackGeneration) action()
  }, delay)
  playbackTimers.add(timer)
}

export async function playNotes(notes: NoteSpelling[], mode: 'melodic' | 'harmonic' | 'arpeggio'): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio()
  if (!tone || generation !== playbackGeneration) return source
  const frequencies = notes.map(frequency)
  if (mode === 'harmonic') {
    triggerNow(frequencies, 1.2)
  } else {
    const gap = mode === 'arpeggio' ? 0.48 : 0.68
    frequencies.forEach((value, index) => {
      if (index === 0) triggerNow(value, 0.58)
      else schedulePlayback(generation, index * gap * 1000, () => triggerNow(value, 0.58))
    })
  }
  return source
}

export async function playChordThenTone(chord: NoteSpelling[], target: NoteSpelling): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio()
  if (!tone || generation !== playbackGeneration) return source
  triggerNow(chord.map(frequency), 1.2)
  schedulePlayback(generation, 1550, () => triggerNow(frequency(target), 0.8))
  return source
}

export async function playCadenceThenTone(cadence: [NoteSpelling[], NoteSpelling[]], target: NoteSpelling): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio()
  if (!tone || generation !== playbackGeneration) return source
  triggerNow(cadence[0].map(frequency), 1.05)
  schedulePlayback(generation, 1300, () => triggerNow(cadence[1].map(frequency), 1.25))
  schedulePlayback(generation, 2900, () => triggerNow(frequency(target), 0.8))
  return source
}

export async function playProgression(voicings: NoteSpelling[][], onStep?: (index: number) => void): Promise<AudioSource> {
  const generation = beginPlayback()
  const source = await initializeAudio()
  if (!tone || generation !== playbackGeneration) return source
  voicings.forEach((voicing, index) => {
    const playBar = () => {
      onStep?.(index)
      triggerNow(voicing.map(frequency), PROGRESSION_BAR_SECONDS - 0.18)
    }
    if (index === 0) playBar()
    else schedulePlayback(generation, index * PROGRESSION_BAR_SECONDS * 1000, playBar)
  })
  return source
}
