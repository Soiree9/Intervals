export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Accidental = -3 | -2 | -1 | 0 | 1 | 2 | 3
export type IntervalDegree = 2 | 3 | 4 | 5 | 6 | 7
export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type IntervalQuality = 'diminished' | 'minor' | 'major' | 'perfect' | 'augmented'
export type TriadQuality = 'major' | 'minor' | 'diminished'
export type SeventhChordQuality = 'major7' | 'minor7' | 'dominant7' | 'half-diminished7'
export type PracticeSeventhChordQuality = Exclude<SeventhChordQuality, 'half-diminished7'>
export type ChordQuality = TriadQuality | SeventhChordQuality
export type ChordMember = 'R' | '3' | '♭3' | '5' | '♭5' | '7' | '♭7'
export type SpreadTriadPattern = 'R53' | '3R5' | '53R'
export type Drop2Pattern = '5R37' | '37R5' | '735R' | 'R573'
export type ShellPattern = 'R37' | 'R73'
export type ChordNotation = 'text' | 'symbol'
export type InstrumentId = 'piano' | 'nylon-guitar'
export type Inversion = 0 | 1 | 2
export type ChordFamily = 'triad' | 'seventh'
export type KeyPracticeDirection = 'forward' | 'reverse' | 'mixed'
export type ProgressionVoiceCount = 3 | 4
export type ProgressionVoicingMode = 'three' | 'four' | 'shell' | 'drop2'
export type PracticeKind = 'interval' | 'triad-fill' | 'spread-triad-fill' | 'chord-tone' | 'drop2-voicing' | 'shell-voicing' | 'scale-degree' | 'progression'

export interface PitchSpelling {
  letter: Letter
  accidental: Accidental
}

export interface NoteSpelling extends PitchSpelling {
  octave: number
  midi: number
  displayName: string
}

export interface IntervalIdentity {
  degree: IntervalDegree
  quality: IntervalQuality
  semitones: number
  label: string
}

export interface MajorKey {
  name: string
  tonic: PitchSpelling
  signature: number
  notes: PitchSpelling[]
}

export interface TriadIdentity {
  keyName: string
  scaleDegree: ScaleDegree
  roman: string
  root: PitchSpelling
  quality: TriadQuality
  tones: [PitchSpelling, PitchSpelling, PitchSpelling]
  symbol: string
  label: string
}

export interface SeventhChordIdentity {
  keyName?: string
  scaleDegree?: ScaleDegree
  roman?: string
  root: PitchSpelling
  quality: SeventhChordQuality
  tones: [PitchSpelling, PitchSpelling, PitchSpelling, PitchSpelling]
  symbol: string
  label: string
}

export interface IntervalQuestion {
  kind: 'interval'
  id: string
  lower: NoteSpelling
  upper: NoteSpelling
  answer: IntervalIdentity
  options: IntervalIdentity[]
}

export interface TriadFillQuestion {
  kind: 'triad-fill'
  id: string
  triad: TriadIdentity
  inversion: Inversion
  notes: [NoteSpelling, NoteSpelling, NoteSpelling]
  answers: [string, string, string]
}

export interface SpreadTriadFillQuestion {
  kind: 'spread-triad-fill'
  id: string
  triad: TriadIdentity
  pattern: SpreadTriadPattern
  notes: [NoteSpelling, NoteSpelling, NoteSpelling]
  answers: [string, string, string]
}

export interface ChordToneQuestion {
  kind: 'chord-tone'
  id: string
  triad: TriadIdentity
  target: 'third' | 'fifth'
  targetIndex: 1 | 2
  notes: [NoteSpelling, NoteSpelling, NoteSpelling]
  answer: string
}

export interface Drop2VoicingQuestion {
  kind: 'drop2-voicing'
  id: string
  chord: SeventhChordIdentity
  pattern: Drop2Pattern
  answer: [ChordMember, ChordMember, ChordMember, ChordMember]
  notes: [NoteSpelling, NoteSpelling, NoteSpelling, NoteSpelling]
}

export interface ShellVoicingQuestion {
  kind: 'shell-voicing'
  id: string
  chord: SeventhChordIdentity
  pattern: ShellPattern
  answer: [ChordMember, ChordMember, ChordMember]
  notes: [NoteSpelling, NoteSpelling, NoteSpelling]
}

export interface ScaleDegreeQuestion {
  kind: 'scale-degree'
  id: string
  key: MajorKey
  degree: ScaleDegree
  note: NoteSpelling
  direction: Exclude<KeyPracticeDirection, 'mixed'>
  cadence: [NoteSpelling[], NoteSpelling[]]
}

export interface ProgressionQuestion {
  kind: 'progression'
  id: string
  key: MajorKey
  templateId: string
  degrees: [ScaleDegree, ScaleDegree, ScaleDegree, ScaleDegree]
  chords: [TriadIdentity | SeventhChordIdentity, TriadIdentity | SeventhChordIdentity, TriadIdentity | SeventhChordIdentity, TriadIdentity | SeventhChordIdentity]
  direction: Exclude<KeyPracticeDirection, 'mixed'>
  voicingMode: ProgressionVoicingMode
  voicings: [NoteSpelling[], NoteSpelling[], NoteSpelling[], NoteSpelling[]]
}

export type PracticeQuestion = IntervalQuestion | TriadFillQuestion | SpreadTriadFillQuestion | ChordToneQuestion | Drop2VoicingQuestion | ShellVoicingQuestion | ScaleDegreeQuestion | ProgressionQuestion

export interface IntervalSettings {
  degrees: IntervalDegree[]
  difficulty: 'basic' | 'advanced'
  playback: 'melodic' | 'harmonic'
  showOctaves: boolean
}

export interface TriadSettings {
  qualities: TriadQuality[]
  spellingLevel: 1 | 2 | 3
  playback: 'melodic' | 'harmonic'
}

export interface SeventhChordSettings {
  qualities: PracticeSeventhChordQuality[]
  playback: 'arpeggio' | 'harmonic'
}

export interface KeyPracticeSettings {
  keyName: string
  scaleDirection: KeyPracticeDirection
  progressionDirection: KeyPracticeDirection
  voicingMode: ProgressionVoicingMode
}

export interface PracticePlaybackSettings {
  interval: IntervalSettings['playback']
  triad: TriadSettings['playback']
  seventh: SeventhChordSettings['playback']
}

export interface AppSettings {
  chordNotation: ChordNotation
  instrument: InstrumentId
  interval: IntervalSettings
  triad: TriadSettings
  seventh: SeventhChordSettings
  keyPractice: KeyPracticeSettings
}

export interface WrongItem {
  key: string
  kind: PracticeKind
  question: PracticeQuestion
  wrongCount: number
  lastWrongAt: number
}

export interface LifetimeStats {
  sessions: number
  attempts: number
  correct: number
}
