import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ChordFamilyView, ChordSetup, SeventhPracticeView, TriadPracticeView } from './components/ChordNavigation'
import { ChordSymbol } from './components/ChordSymbol'
import { ChordToneExercise, FeedbackPanel, IntervalExercise, SeventhVoicingExercise, TriadFillExercise, type AnswerFeedback, type IntervalPreview } from './components/ExerciseViews'
import { ProgressionExercise, ScaleDegreeExercise } from './components/KeyExercises'
import { PitchName } from './components/MusicText'
import { GlobalInstrumentSwitch } from './components/PlaybackControls'
import { useCountUp } from './components/useCountUp'
import { QuestionSummary } from './components/QuestionSummary'
import { usePreserveAnswerFocus, useQuizShortcuts } from './components/useQuizShortcuts'
import {
  MAJOR_KEYS,
  makeNote,
  parsePitchName,
  pitchClassIsEnharmonic,
  pitchName,
} from './domain/music'
import { quizExitView } from './domain/navigation'
import {
  arrangeSessionQuestions,
  coverageOrderKey,
  createIntervalAudition,
  createScaleDegreeAudition,
  intervalOptionsFor,
  practiceSequenceKey,
  questionIdentity,
  questionStorageKey,
  secureRandom,
  sessionSignature,
} from './domain/questions'
import { createSession } from './domain/session'
import type {
  AppSettings,
  ChordQuality,
  IntervalDegree,
  IntervalIdentity,
  InstrumentId,
  KeyPracticeDirection,
  LifetimeStats,
  NoteSpelling,
  PracticeKind,
  PracticePlaybackSettings,
  PracticeQuestion,
  ScaleDegree,
  WrongItem,
} from './domain/types'
import { initializeAudio, playImmediateNote, playNotes, stopAudio, type AudioSource } from './services/audio'
import { playPracticeQuestion } from './services/practicePlayback'
import {
  loadLastOrder,
  loadLastQuestion,
  loadSettings,
  loadStats,
  loadWrongItems,
  recordSession,
  removeWrongItem,
  saveLastOrder,
  saveLastQuestion,
  saveSettings,
  upsertWrongItem,
} from './services/storage'

type View = 'home' | 'chord-family' | 'triad-practice' | 'seventh-practice' | 'key' | 'setup-interval' | 'setup-chord' | 'setup-key' | 'quiz' | 'summary' | 'wrongs'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DEGREE_NAMES: Record<IntervalDegree, string> = {
  2: '二度', 3: '三度', 4: '四度', 5: '五度', 6: '六度', 7: '七度',
}

const KIND_NAMES: Record<PracticeKind, string> = {
  interval: '音程',
  'triad-fill': '密集三和弦音名',
  'spread-triad-fill': '开放三和弦音名',
  'chord-tone': '三音和五音',
  'drop2-voicing': 'Drop 2 七和弦',
  'shell-voicing': 'Shell 七和弦',
  'scale-degree': '音名与音级',
  progression: '和弦进行与级数',
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function practicePlaybackSettings(settings: AppSettings): PracticePlaybackSettings {
  return {
    interval: settings.interval.playback,
    triad: settings.triad.playback,
    seventh: settings.seventh.playback,
  }
}

function App() {
  const [view, setView] = useState<View>('home')
  const [kind, setKind] = useState<PracticeKind>('interval')
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [wrongItems, setWrongItems] = useState<WrongItem[]>(() => loadWrongItems())
  const [stats, setStats] = useState<LifetimeStats>(() => loadStats())
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [sessionMistakes, setSessionMistakes] = useState<PracticeQuestion[]>([])
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null)
  const [noteValues, setNoteValues] = useState<string[]>([])
  const [memberValues, setMemberValues] = useState<string[]>([])
  const [degreeValues, setDegreeValues] = useState<number[]>([])
  const [progressionQualities, setProgressionQualities] = useState<ChordQuality[]>([])
  const [activeSlot, setActiveSlot] = useState(0)
  const [progressionStep, setProgressionStep] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isReview, setIsReview] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const [wrongFilter, setWrongFilter] = useState<'all' | PracticeKind>('all')
  const [intervalPreview, setIntervalPreview] = useState<IntervalPreview | null>(null)
  const [scaleDegreePreview, setScaleDegreePreview] = useState<ScaleDegree | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const lastAutoplayId = useRef('')
  const activeSequenceKey = useRef('')

  const question = questions[questionIndex]
  const correctCount = results.filter(Boolean).length
  const summaryPercent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const animatedSummaryPercent = useCountUp(summaryPercent)
  const filteredWrongItems = useMemo(
    () => wrongItems.filter((item) => wrongFilter === 'all' || item.kind === wrongFilter),
    [wrongFilter, wrongItems],
  )

  useEffect(() => saveSettings(settings), [settings])

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const installed = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view, questionIndex])

  useEffect(() => {
    if (!question) return
    stopAudio()
    if (activeSequenceKey.current) saveLastQuestion(activeSequenceKey.current, questionIdentity(question))
    setFeedback(null)
    setActiveSlot(0)
    setIntervalPreview(null)
    setScaleDegreePreview(null)
    setProgressionStep(null)
    setProgressionQualities([])
    setMemberValues([])
    if (question.kind === 'triad-fill' || question.kind === 'spread-triad-fill') setNoteValues(['', '', ''])
    else if (question.kind === 'chord-tone') setNoteValues([''])
    else if (question.kind === 'drop2-voicing') {
      setNoteValues([])
      setMemberValues(['', '', '', ''])
    } else if (question.kind === 'shell-voicing') {
      setNoteValues([])
      setMemberValues(['', '', ''])
    }
    else if (question.kind === 'scale-degree') {
      setNoteValues(question.direction === 'forward' ? [''] : [])
      setDegreeValues(question.direction === 'reverse' ? [0] : [])
    } else if (question.kind === 'progression') {
      setNoteValues(question.direction === 'forward' ? ['', '', '', ''] : [])
      setDegreeValues(question.direction === 'reverse' ? [0, 0, 0, 0] : [])
      const defaultQuality: ChordQuality = question.voicingMode === 'shell' || question.voicingMode === 'drop2' ? 'major7' : 'major'
      setProgressionQualities(question.direction === 'forward' ? [defaultQuality, defaultQuality, defaultQuality, defaultQuality] : [])
    } else {
      setNoteValues([])
      setDegreeValues([])
    }
  }, [question])

  useEffect(() => () => stopAudio(), [])

  const playQuestion = async (target: PracticeQuestion = question, overrides: { instrument?: InstrumentId; playback?: Partial<PracticePlaybackSettings> } = {}) => {
    if (!target) return
    if (target.kind === 'progression') setProgressionStep(null)
    const source = await playPracticeQuestion(target, {
      instrument: overrides.instrument ?? settings.instrument,
      settings: { ...practicePlaybackSettings(settings), ...overrides.playback },
      onProgressionStep: setProgressionStep,
    })
    setAudioSource(source)
  }

  const changeInstrument = (instrument: InstrumentId) => {
    if (instrument === settings.instrument) return
    stopAudio()
    setSettings((current) => ({ ...current, instrument }))
    if (view === 'quiz' && question) void playQuestion(question, { instrument })
  }

  const changeIntervalPlayback = (playback: AppSettings['interval']['playback']) => {
    if (playback === settings.interval.playback) return
    stopAudio()
    setSettings((current) => ({ ...current, interval: { ...current.interval, playback } }))
    if (view === 'quiz' && question) void playQuestion(question, { playback: { interval: playback } })
  }

  const changeTriadPlayback = (playback: AppSettings['triad']['playback']) => {
    if (playback === settings.triad.playback) return
    stopAudio()
    setSettings((current) => ({ ...current, triad: { ...current.triad, playback } }))
    if (view === 'quiz' && question) void playQuestion(question, { playback: { triad: playback } })
  }

  const changeSeventhPlayback = (playback: AppSettings['seventh']['playback']) => {
    if (playback === settings.seventh.playback) return
    stopAudio()
    setSettings((current) => ({ ...current, seventh: { ...current.seventh, playback } }))
    if (view === 'quiz' && question) void playQuestion(question, { playback: { seventh: playback } })
  }

  useEffect(() => {
    if (view !== 'quiz' || !question || lastAutoplayId.current === question.id) return
    lastAutoplayId.current = question.id
    const timer = window.setTimeout(() => void playQuestion(question), 220)
    return () => window.clearTimeout(timer)
  // New question identity is intentional; playback settings are read when the timer fires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, view])

  const beginSession = async (nextKind: PracticeKind, suppliedQuestions?: PracticeQuestion[]) => {
    stopAudio()
    setStarting(true)
    setNotice('')
    try {
      const source = await initializeAudio(settings.instrument)
      const isCoverageKind = nextKind === 'scale-degree' || nextKind === 'progression'
      const orderKey = isCoverageKind ? coverageOrderKey(nextKind, settings.keyPractice) : ''
      const previousSignature = isCoverageKind ? loadLastOrder(orderKey) : ''
      const sequenceKey = `${suppliedQuestions ? 'review:' : ''}${practiceSequenceKey(nextKind, settings.interval, settings.triad, settings.seventh, settings.keyPractice)}`
      const previousIdentity = loadLastQuestion(sequenceKey)
      const sourceQuestions = suppliedQuestions
        ? suppliedQuestions.length > 1 ? arrangeSessionQuestions(suppliedQuestions, '', previousIdentity, secureRandom) : suppliedQuestions
        : createSession(
          nextKind,
          settings.interval,
          settings.triad,
          settings.seventh,
          settings.keyPractice,
          10,
          secureRandom,
          previousSignature,
          previousIdentity,
        )
      if (!sourceQuestions.length) throw new Error('没有可复习的题目。')
      const nextQuestions = sourceQuestions.slice(0, 10).map((item) => item.kind === 'interval'
        ? { ...item, options: intervalOptionsFor(settings.interval.degrees, settings.interval.difficulty) }
        : item)
      if (isCoverageKind && !suppliedQuestions) saveLastOrder(orderKey, sessionSignature(nextQuestions))
      activeSequenceKey.current = sequenceKey
      setAudioSource(source)
      setKind(nextKind)
      setQuestions(nextQuestions)
      setQuestionIndex(0)
      setResults([])
      setSessionMistakes([])
      setStartedAt(Date.now())
      setElapsedSeconds(0)
      setIsReview(Boolean(suppliedQuestions))
      lastAutoplayId.current = ''
      setView('quiz')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '练习启动失败，请重试。')
    } finally {
      setStarting(false)
    }
  }

  const recordAnswer = (isCorrect: boolean) => {
    if (!question) return
    setResults((current) => [...current, isCorrect])
    if (isCorrect && isReview) setWrongItems((current) => removeWrongItem(current, question))
    if (!isCorrect) {
      setWrongItems((current) => upsertWrongItem(current, question))
      setSessionMistakes((current) => current.some((item) => questionStorageKey(item) === questionStorageKey(question)) ? current : [...current, question])
    }
  }

  const finishAnswer = (isCorrect: boolean, answer: Omit<AnswerFeedback, 'correct'>) => {
    if (!question || feedback) return
    setFeedback({ correct: isCorrect, ...answer })
    recordAnswer(isCorrect)
    if (isCorrect) void playQuestion(question)
  }

  const answerInterval = (selected: string) => {
    if (question?.kind !== 'interval') return
    finishAnswer(selected === question.answer.label, { selected })
  }

  const submitNotes = () => {
    if (!question || feedback || noteValues.some((value) => !value)) return
    if (question.kind === 'triad-fill' || question.kind === 'spread-triad-fill' || question.kind === 'chord-tone' || (question.kind === 'scale-degree' && question.direction === 'forward')) {
      const answers = question.kind === 'triad-fill' || question.kind === 'spread-triad-fill' ? question.answers : question.kind === 'chord-tone' ? [question.answer] : [pitchName(question.note)]
      const isCorrect = answers.every((answer, index) => noteValues[index] === answer)
      const enharmonic = !isCorrect && answers.some((answer, index) => noteValues[index] !== answer && pitchClassIsEnharmonic(noteValues[index], answer))
      finishAnswer(isCorrect, { values: [...noteValues], enharmonic })
      return
    }
    if (question.kind === 'progression' && question.direction === 'forward') {
      const rootsCorrect = question.chords.every((chord, index) => noteValues[index] === pitchName(chord.root))
      const qualitiesCorrect = question.chords.every((chord, index) => progressionQualities[index] === chord.quality)
      const enharmonic = !rootsCorrect && question.chords.some((chord, index) => noteValues[index] && pitchClassIsEnharmonic(noteValues[index], pitchName(chord.root)))
      finishAnswer(rootsCorrect && qualitiesCorrect, { values: [...noteValues], enharmonic })
    }
  }

  const submitMembers = () => {
    if (!question || feedback || memberValues.some((value) => !value)) return
    if (question.kind !== 'drop2-voicing' && question.kind !== 'shell-voicing') return
    const isCorrect = question.answer.every((answer, index) => memberValues[index] === answer)
    finishAnswer(isCorrect, { values: [...memberValues] })
  }

  const submitDegrees = () => {
    if (!question || feedback || degreeValues.some((value) => !value)) return
    if (question.kind === 'scale-degree' && question.direction === 'reverse') finishAnswer(degreeValues[0] === question.degree, { values: degreeValues.map(String) })
    if (question.kind === 'progression' && question.direction === 'reverse') finishAnswer(question.degrees.every((degree, index) => degreeValues[index] === degree), { values: degreeValues.map(String) })
  }

  const exploreInterval = async (option: IntervalIdentity) => {
    if (question?.kind !== 'interval') return
    const notes = createIntervalAudition(question.lower, option)
    setIntervalPreview({ option, notes })
    setAudioSource(await playNotes(notes, settings.interval.playback, settings.instrument))
  }

  const exploreScaleDegree = async (degree: ScaleDegree) => {
    if (question?.kind !== 'scale-degree' || question.direction !== 'reverse' || !feedback) return
    setScaleDegreePreview(degree)
    setAudioSource(await playNotes([createScaleDegreeAudition(question, degree)], 'harmonic', settings.instrument))
  }

  const playFilledNote = async (value: string, index: number) => {
    if (question?.kind !== 'triad-fill' && question?.kind !== 'spread-triad-fill') return
    const pitch = parsePitchName(value)
    const reference = question.notes[index]
    const note = [reference.octave - 1, reference.octave, reference.octave + 1]
      .map((octave) => makeNote(pitch.letter, pitch.accidental, octave))
      .sort((left, right) => Math.abs(left.midi - reference.midi) - Math.abs(right.midi - reference.midi))[0]
    setAudioSource(await playNotes([note], 'harmonic', settings.instrument))
  }

  const playStaffNote = async (note: NoteSpelling) => {
    setAudioSource(await playImmediateNote(note, settings.instrument))
  }

  const nextQuestion = () => {
    stopAudio()
    setProgressionStep(null)
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((current) => current + 1)
      return
    }
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    setElapsedSeconds(seconds)
    setStats((current) => recordSession(current, results.length, correctCount))
    setView('summary')
  }

  const clearSession = () => {
    stopAudio()
    setQuestionIndex(0)
    setResults([])
    setSessionMistakes([])
    setFeedback(null)
    setNoteValues([])
    setMemberValues([])
    setDegreeValues([])
    setProgressionQualities([])
    setActiveSlot(0)
    setProgressionStep(null)
    setIntervalPreview(null)
    setScaleDegreePreview(null)
    setStartedAt(0)
    setElapsedSeconds(0)
    setQuestions([])
    lastAutoplayId.current = ''
    activeSequenceKey.current = ''
  }

  const goHome = () => {
    clearSession()
    setIsReview(false)
    setView('home')
  }

  const endQuiz = () => {
    const destination = quizExitView(kind, isReview)
    clearSession()
    setIsReview(false)
    setView(destination)
  }

  const triggerInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  useQuizShortcuts({
    enabled: view === 'quiz' && Boolean(question),
    feedbackVisible: Boolean(feedback),
    onReplay: () => void playQuestion(),
    onNext: nextQuestion,
  })
  usePreserveAnswerFocus(view === 'quiz')

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={goHome} aria-label="返回首页"><span className="brand-mark"><img src="/Intervals/images/ui-icons/interval.png" alt="" /></span><span className="brand-copy"><strong>INTERVALS</strong><small>EAR TRAINING</small></span></button>
        <div className="topbar-meta">
          <GlobalInstrumentSwitch instrument={settings.instrument} source={audioSource} onChange={changeInstrument} />
          <button type="button" className="topbar-action notation-toggle chord-notation-toggle" aria-label={`和弦记法：${settings.chordNotation === 'symbol' ? '符号 C△' : '文字 Cmaj7'}`} title="切换和弦记法" aria-pressed={settings.chordNotation === 'symbol'} onClick={() => setSettings((current) => ({ ...current, chordNotation: current.chordNotation === 'symbol' ? 'text' : 'symbol' }))}><img className="topbar-generated-icon" src="/Intervals/images/ui-icons/notation-b.png" alt="" /><span className="topbar-control-copy"><small>NOTATION</small><span><ChordSymbol chord={{ root: parsePitchName('C'), quality: 'major7' }} notation={settings.chordNotation} /></span></span></button>
          <button type="button" className="topbar-action review-toggle" aria-label={`错题 ${wrongItems.length}，进入错题复习`} onClick={() => setView('wrongs')}><img className="topbar-generated-icon" src="/Intervals/images/ui-icons/review-a.png" alt="" /><span className="topbar-control-copy"><small>REVIEW</small><span className="review-count">{wrongItems.length}</span></span></button>
        </div>
      </header>

      <main>
        {view === 'home' && <HomeView stats={stats} installPrompt={installPrompt} onInstall={() => void triggerInstall()} onChoose={(next) => {
          if (next === 'interval') { setKind('interval'); setView('setup-interval') }
          else if (next === 'chord') setView('chord-family')
          else setView('key')
        }} />}

        {view === 'chord-family' && <ChordFamilyView onBack={() => setView('home')} onChoose={(family) => setView(family === 'triad' ? 'triad-practice' : 'seventh-practice')} />}
        {view === 'triad-practice' && <TriadPracticeView onBack={() => setView('chord-family')} onChoose={(nextKind) => { setKind(nextKind); setView('setup-chord') }} />}
        {view === 'seventh-practice' && <SeventhPracticeView onBack={() => setView('chord-family')} onChoose={(nextKind) => { setKind(nextKind); setView('setup-chord') }} />}

        {view === 'key' && <section className="panel navigation-panel">
          <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button>
          <div className="eyebrow">KEYS</div><h1>调内练习</h1><p className="setup-copy">选择一个大调，在调内练习音名、音级和和弦进行。</p>
          <div className="choice-grid two">
            <button type="button" className="choice" onClick={() => { setKind('scale-degree'); setView('setup-key') }}><strong>音名与音级</strong><span>在音名和音级之间转换。</span></button>
            <button type="button" className="choice" onClick={() => { setKind('progression'); setView('setup-key') }}><strong>和弦进行与级数</strong><span>在和弦进行和调内级数之间转换。</span></button>
          </div>
        </section>}

        {view === 'setup-interval' && <IntervalSetup settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView('home')} onStart={() => void beginSession('interval')} />}
        {view === 'setup-chord' && <ChordSetup kind={kind as Extract<PracticeKind, 'triad-fill' | 'spread-triad-fill' | 'chord-tone' | 'drop2-voicing' | 'shell-voicing'>} settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView(kind === 'drop2-voicing' || kind === 'shell-voicing' ? 'seventh-practice' : 'triad-practice')} onStart={() => void beginSession(kind)} />}
        {view === 'setup-key' && <KeySetup kind={kind} settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView('key')} onStart={() => void beginSession(kind)} />}

        {view === 'quiz' && question && <section className="quiz-view">
          <div className="quiz-header">
            <button type="button" className="back-button" onClick={endQuiz}>× 结束</button>
            <div className="progress-wrap"><div className="progress-copy"><span>{KIND_NAMES[question.kind]}</span><strong>{questionIndex + 1} / {questions.length}</strong></div><div className="progress-track"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div></div>
            <div className="score-pill">答对 {correctCount}</div>
          </div>
          <article className={`question-card ${feedback ? feedback.correct ? 'feedback-correct' : 'feedback-wrong' : ''}`}>
            {question.kind === 'interval' && <IntervalExercise question={question} settings={settings.interval} feedback={feedback} preview={intervalPreview} onAnswer={answerInterval} onExplore={(option) => void exploreInterval(option)} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onPlaybackChange={changeIntervalPlayback} onShowOctavesChange={(showOctaves) => setSettings((current) => ({ ...current, interval: { ...current.interval, showOctaves } }))} />}
            {(question.kind === 'triad-fill' || question.kind === 'spread-triad-fill') && <TriadFillExercise question={question} notation={settings.chordNotation} playback={settings.triad.playback} feedback={feedback} noteValues={noteValues} activeSlot={activeSlot} onActiveSlotChange={setActiveSlot} onChange={setNoteValues} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onPlaybackChange={changeTriadPlayback} onSubmit={submitNotes} onValuePlay={(value, index) => void playFilledNote(value, index)} />}
            {question.kind === 'chord-tone' && <ChordToneExercise question={question} notation={settings.chordNotation} feedback={feedback} noteValues={noteValues} onChange={setNoteValues} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onSubmit={submitNotes} />}
            {(question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') && <SeventhVoicingExercise question={question} notation={settings.chordNotation} playback={settings.seventh.playback} feedback={feedback} memberValues={memberValues} activeSlot={activeSlot} onActiveSlotChange={setActiveSlot} onChange={setMemberValues} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onPlaybackChange={changeSeventhPlayback} onSubmit={submitMembers} />}
            {question.kind === 'scale-degree' && <ScaleDegreeExercise question={question} feedback={feedback} noteValues={noteValues} degreeValues={degreeValues} exploringDegree={scaleDegreePreview} onNoteChange={setNoteValues} onDegreeChange={setDegreeValues} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onExploreDegree={(degree) => void exploreScaleDegree(degree)} onSubmitNotes={submitNotes} onSubmitDegrees={submitDegrees} />}
            {question.kind === 'progression' && <ProgressionExercise question={question} notation={settings.chordNotation} feedback={feedback} noteValues={noteValues} degreeValues={degreeValues} qualities={progressionQualities} activeSlot={activeSlot} activeStep={progressionStep} onActiveSlotChange={setActiveSlot} onNoteChange={setNoteValues} onQualityChange={setProgressionQualities} onDegreeChange={setDegreeValues} onPlay={() => void playQuestion()} onNoteClick={(note) => void playStaffNote(note)} onSubmitNotes={submitNotes} onSubmitDegrees={submitDegrees} />}
            {feedback && <FeedbackPanel question={question} notation={settings.chordNotation} feedback={feedback} onReplay={() => void playQuestion()} onNext={nextQuestion} isLast={questionIndex + 1 === questions.length} />}
          </article>
        </section>}

        {view === 'summary' && <section className="summary-view panel">
          <div className="summary-ring" style={{ '--score': `${summaryPercent}%` } as React.CSSProperties}><strong>{animatedSummaryPercent}%</strong><span>正确率</span></div>
          <div className="eyebrow">SESSION COMPLETE</div><h1>本轮完成</h1><p>正确 {correctCount} / {questions.length} · 用时 {elapsedSeconds} 秒 · {sessionMistakes.length} 道错题</p>
          <div className="summary-actions"><button type="button" className="primary-button" onClick={() => void beginSession(kind)}>再来 10 题</button>{sessionMistakes.length > 0 && <button type="button" className="secondary-button" onClick={() => void beginSession(kind, sessionMistakes)}>只练本轮错题</button>}<button type="button" className="text-button" onClick={goHome}>返回首页</button></div>
        </section>}

        {view === 'wrongs' && <section className="wrong-view panel">
          <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button><div className="eyebrow">REVIEW</div><h1>错题复习</h1>
          <div className="chip-row">{(['all', 'interval', 'triad-fill', 'spread-triad-fill', 'chord-tone', 'drop2-voicing', 'shell-voicing', 'scale-degree', 'progression'] as const).map((filter) => <button type="button" key={filter} className={wrongFilter === filter ? 'chip selected' : 'chip'} onClick={() => setWrongFilter(filter)}>{filter === 'all' ? '全部' : KIND_NAMES[filter]}</button>)}</div>
          {filteredWrongItems.length ? <><div className="wrong-list">{filteredWrongItems.map((item) => <div className="wrong-row" key={item.key}><span className="wrong-kind">{KIND_NAMES[item.kind]}</span><strong><QuestionSummary question={item.question} notation={settings.chordNotation} /></strong><small>累计答错 {item.wrongCount} 次</small></div>)}</div><button type="button" className="primary-button" disabled={starting} onClick={() => void beginSession(filteredWrongItems[0].kind, filteredWrongItems.slice(0, 10).map((item) => item.question))}>{starting ? '正在准备音源…' : `复习这 ${Math.min(10, filteredWrongItems.length)} 道题`}</button></> : <div className="empty-state"><span>✓</span><h2>还没有错题</h2><p>答错的题会自动保存在这里。</p></div>}
        </section>}
      </main>
      <footer>
        <div className="footer-note">
          <span className="footer-eyebrow">LOCAL DATA</span>
          <p>练习数据仅保存在当前设备</p>
        </div>
        <details className="audio-credits">
          <summary><span className="footer-eyebrow">AUDIO &amp; LICENSES</span><span className="audio-credits-name">音源与许可</span></summary>
          <div className="audio-credits-list">
            <section className="audio-credit">
              <h3>钢琴<span>Piano</span></h3>
              <p>Salamander Grand Piano V3，CC BY 3.0。使用原始 48 kHz / 24-bit 第 10 力度层转换采样。</p>
            </section>
            <section className="audio-credit">
              <h3>古典吉他<span>Classical Guitar</span></h3>
              <p>Quartertone Yamaha Classical Guitar（Tone.js Instruments），CC BY 3.0。使用 G3–F5 范围的整理版采样。</p>
            </section>
          </div>
          <p className="audio-credits-links"><a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">钢琴官方来源</a><a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer">吉他与整理版来源</a><a href={`${import.meta.env.BASE_URL}audio/ATTRIBUTION.md`} target="_blank" rel="noreferrer">完整文件清单</a></p>
        </details>
      </footer>
    </div>
  )
}

function HomeView({ stats, installPrompt, onInstall, onChoose }: { stats: LifetimeStats; installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void; onChoose: (module: 'interval' | 'chord' | 'key') => void }) {
  const [mastheadOpen, setMastheadOpen] = useState(true)
  const mastheadManuallyClosed = useRef(false)
  const sessions = useCountUp(stats.sessions)
  const attempts = useCountUp(stats.attempts)
  const accuracy = useCountUp(stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0)

  useEffect(() => {
    const updateMasthead = () => {
      const nearTop = window.scrollY < Math.min(96, Math.max(52, window.innerHeight * .08))
      setMastheadOpen(nearTop && !mastheadManuallyClosed.current)
    }
    window.addEventListener('scroll', updateMasthead, { passive: true })
    return () => window.removeEventListener('scroll', updateMasthead)
  }, [])

  const toggleMasthead = () => {
    setMastheadOpen((open) => {
      mastheadManuallyClosed.current = open
      return !open
    })
  }

  return <section className="home-view editorial-home">
    <div className={mastheadOpen ? 'home-masthead open' : 'home-masthead'}>
      <button type="button" className="home-masthead-toggle" aria-label={mastheadOpen ? '收起首页字标' : '展开首页字标'} aria-expanded={mastheadOpen} onClick={toggleMasthead}><img src={mastheadOpen ? '/Intervals/images/ui-icons/chevron-up.png' : '/Intervals/images/ui-icons/chevron-down.png'} alt="" /></button>
      <div className="home-masthead-panel" aria-hidden={!mastheadOpen}><span>INTERVALS</span></div>
    </div>
    <figure className="home-feature">
      <picture>
        <source srcSet="/Intervals/images/home-editorial-hero-detail-v2-4k.webp" type="image/webp" />
        <img src="/Intervals/images/home-editorial-hero-detail-v2.png" alt="红色节拍器、透明音叉和荧光黄耳形雕塑置于亮蓝背景上" fetchPriority="high" />
      </picture>
      <figcaption>
        <div className="home-feature-copy"><span className="eyebrow">LISTEN · READ · NAME / SESSION 01</span><h1>听见关系</h1><p>用五线谱、音名和声音，把音程、和弦与调重新连在一起。</p></div>
        <div className="lifetime-stats"><div><strong>{sessions}</strong><span>完成轮次</span></div><div><strong>{attempts}</strong><span>累计答题</span></div><div><strong>{accuracy}%</strong><span>累计正确率</span></div></div>
      </figcaption>
    </figure>
    <div className="home-actions-heading"><span>CHOOSE A LISTENING PATH</span><p>每轮 10 题。选择一种关系，开始听、读和命名。</p></div>
    <div className="home-action-grid">
      <button type="button" className="mode-card interval-mode" onClick={() => onChoose('interval')}><img className="mode-media" src="/Intervals/images/home-modules/interval-v1.webp" alt="" /><span className="mode-number">01 / INTERVALS</span><div className="mode-copy"><h2>音程</h2><p>看音名和五线谱，判断完整音程；可试听旋律或和声。</p></div><span className="mode-link">开始设置 →</span></button>
      <button type="button" className="mode-card triad-mode" onClick={() => onChoose('chord')}><img className="mode-media" src="/Intervals/images/home-modules/chord-v1.webp" alt="" /><span className="mode-number">02 / CHORDS</span><div className="mode-copy"><h2>和弦</h2><p>练习三和弦与七和弦的音名、排列和听辨。</p></div><span className="mode-link">选择练习 →</span></button>
      <button type="button" className="mode-card key-mode" onClick={() => onChoose('key')}><img className="mode-media" src="/Intervals/images/home-modules/key-v1.webp" alt="" /><span className="mode-number">03 / KEYS</span><div className="mode-copy"><h2>调</h2><p>在一个大调内练习音名、音级与和弦进行。</p></div><span className="mode-link">选择练习 →</span></button>
      <div className="install-card"><img className="mode-media" src="/Intervals/images/home-modules/offline-v1.webp" alt="" /><span className="mode-number">04 / OFFLINE</span><div className="install-copy"><strong>安装到设备</strong><p>安装后可从桌面打开，也可离线练习。</p>{installPrompt ? <button type="button" className="primary-button" onClick={onInstall}>安装应用</button> : <details className="install-help"><summary>查看安装方法</summary><ul className="install-help-list"><li><span>Chrome / Edge</span>点击地址栏右侧的“安装”。</li><li><span>Android</span>Chrome 菜单选择“安装应用”。</li><li><span>iPhone / iPad</span>Safari 的分享菜单选择“添加到主屏幕”。</li></ul></details>}</div></div>
    </div>
  </section>
}

function IntervalSetup({ settings, setSettings, starting, notice, onBack, onStart }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回首页</button><div className="eyebrow">INTERVALS</div><h1>设置音程练习</h1>
    <fieldset><legend>练习音程度数 <small>可多选</small></legend><div className="chip-row">{([2, 3, 4, 5, 6, 7] as IntervalDegree[]).map((degree) => <button type="button" key={degree} className={settings.interval.degrees.includes(degree) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, degrees: toggleValue(current.interval.degrees, degree) } }))}>{DEGREE_NAMES[degree]}</button>)}</div></fieldset>
    <fieldset><legend>音名难度</legend><div className="choice-grid two"><button type="button" className={settings.interval.difficulty === 'basic' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'basic' } }))}><strong>基础</strong><span>仅自然音</span></button><button type="button" className={settings.interval.difficulty === 'advanced' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'advanced' } }))}><strong>进阶</strong><span>加入单升、单降</span></button></div></fieldset>
    <button type="button" className="primary-button" disabled={!settings.interval.degrees.length || starting} onClick={onStart}>{starting ? '正在准备音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}

function KeySetup({ kind, settings, setSettings, starting, notice, onBack, onStart }: { kind: PracticeKind; settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  const isScale = kind === 'scale-degree'
  const direction = isScale ? settings.keyPractice.scaleDirection : settings.keyPractice.progressionDirection
  const updateDirection = (value: KeyPracticeDirection) => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, [isScale ? 'scaleDirection' : 'progressionDirection']: value } }))
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回调内练习</button><div className="eyebrow">KEY TRAINING</div><h1>{isScale ? '设置音名与音级' : '设置和弦进行与级数'}</h1>
    <fieldset><legend>本轮大调</legend><div className="key-grid">{MAJOR_KEYS.map((key) => <button type="button" key={key.name} className={settings.keyPractice.keyName === key.name ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, keyName: key.name } }))}><PitchName value={key.tonic} /> 大调</button>)}</div></fieldset>
    <fieldset><legend>出题方式</legend><div className="segmented"><button type="button" className={direction === 'forward' ? 'selected' : ''} onClick={() => updateDirection('forward')}>音级 → 音名</button><button type="button" className={direction === 'reverse' ? 'selected' : ''} onClick={() => updateDirection('reverse')}>音名 → 音级</button><button type="button" className={direction === 'mixed' ? 'selected' : ''} onClick={() => updateDirection('mixed')}>两种各 5 题</button></div></fieldset>
    {isScale ? <p className="setup-copy">10 题中每个音级至少出现一次；其余 3 题随机复习。</p> : <><fieldset><legend>和弦排列</legend><div className="progression-voicing-grid">{([['three', '三声部', '三和弦'], ['four', '四声部', '三和弦'], ['shell', 'Shell', '七和弦'], ['drop2', 'Drop 2', '七和弦']] as const).map(([mode, title, family]) => <button type="button" key={mode} className={settings.keyPractice.voicingMode === mode ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, voicingMode: mode } }))}><strong>{title}</strong><span>{family}</span></button>)}</div></fieldset><p className="setup-copy">10 题覆盖 9 种常见和弦进行；Shell 和 Drop 2 使用调内七和弦。</p></>}
    <button type="button" className="primary-button" disabled={starting} onClick={onStart}>{starting ? '正在准备音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}

export default App
