import type { NoteSpelling } from '../domain/types'
import type { PolySynth, Sampler } from 'tone'

type ToneModule = typeof import('tone')
export type AudioSource = 'piano' | 'synth'

let tone: ToneModule | null = null
let sampler: Sampler | null = null
let synth: PolySynth | null = null
let sampleReady = false
let initialization: Promise<AudioSource> | null = null

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

export async function playNotes(notes: NoteSpelling[], mode: 'melodic' | 'harmonic' | 'arpeggio'): Promise<AudioSource> {
  const source = await initializeAudio()
  if (!tone) return source
  sampler?.releaseAll()
  synth?.releaseAll()
  const now = tone.now() + 0.05
  const frequencies = notes.map(frequency)
  if (mode === 'harmonic') {
    trigger(frequencies, 1.2, now)
  } else {
    const gap = mode === 'arpeggio' ? 0.48 : 0.68
    frequencies.forEach((value, index) => trigger(value, 0.58, now + index * gap))
  }
  return source
}
