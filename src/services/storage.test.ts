import { beforeEach, describe, expect, it } from 'vitest'
import { MAJOR_KEYS, buildTriad } from '../domain/music'
import { DEFAULT_SETTINGS, loadSettings, loadWrongItems } from './storage'

describe('storage migrations', () => {
  beforeEach(() => localStorage.clear())

  it('loads new seventh-chord and notation defaults', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps old settings and maps voice count to the new progression mode', () => {
    localStorage.setItem('interval-trainer:settings:v2', JSON.stringify({
      showOctaves: false,
      keyPractice: { keyName: 'G', scaleDirection: 'forward', progressionDirection: 'reverse', voiceCount: 3 },
    }))
    const settings = loadSettings()
    expect(settings.showOctaves).toBe(false)
    expect(settings.keyPractice.voicingMode).toBe('three')
    expect(settings.seventh).toEqual(DEFAULT_SETTINGS.seventh)
  })

  it('does not restore old wrong items after the new wrong list was cleared', () => {
    localStorage.setItem('interval-trainer:wrong:v3', '[]')
    localStorage.setItem('interval-trainer:wrong:v2', JSON.stringify([{ kind: 'interval', question: { kind: 'interval' } }]))
    expect(loadWrongItems()).toEqual([])
  })

  it('migrates an old progression wrong item to chords and a voicing mode', () => {
    const key = MAJOR_KEYS[0]
    const triads = ([1, 4, 5, 1] as const).map((degree) => buildTriad(key, degree))
    localStorage.setItem('interval-trainer:wrong:v2', JSON.stringify([{
      key: 'old-progression',
      kind: 'progression',
      wrongCount: 1,
      lastWrongAt: 1,
      question: {
        kind: 'progression', id: 'old', key, templateId: 'cadence-1451', degrees: [1, 4, 5, 1], triads,
        direction: 'forward', voiceCount: 4, voicings: [[], [], [], []],
      },
    }]))
    const [item] = loadWrongItems()
    expect(item.question.kind).toBe('progression')
    if (item.question.kind === 'progression') {
      expect(item.question.chords).toHaveLength(4)
      expect(item.question.voicingMode).toBe('four')
    }
  })
})
