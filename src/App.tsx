import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ChordMemberKeyboard } from './components/ChordMemberKeyboard'
import { ChordSymbol } from './components/ChordSymbol'
import { NoteKeyboard } from './components/NoteKeyboard'
import { Staff } from './components/Staff'
import {
  INVERSION_TEXT,
  MAJOR_KEYS,
  SEVENTH_QUALITY_TEXT,
  formatChordSymbol,
  makeNote,
  parsePitchName,
  pitchClassIsEnharmonic,
  pitchName,
  triadFormula,
  triadSolfege,
} from './domain/music'
import {
  arrangeSessionQuestions,
  coverageOrderKey,
  createIntervalAudition,
  createSession,
  intervalOptionsFor,
  practiceSequenceKey,
  questionIdentity,
  questionStorageKey,
  questionSummary,
  secureRandom,
  sessionSignature,
} from './domain/questions'
import type {
  AppSettings,
  ChordQuality,
  IntervalDegree,
  IntervalIdentity,
  IntervalQuestion,
  KeyPracticeDirection,
  LifetimeStats,
  NoteSpelling,
  PracticeKind,
  PracticeQuestion,
  ProgressionQuestion,
  SeventhChordQuality,
  ScaleDegree,
  TriadQuality,
  WrongItem,
} from './domain/types'
import { initializeAudio, playCadenceThenTone, playChordThenTone, playNotes, playProgression, stopAudio, type AudioSource } from './services/audio'
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

type View = 'home' | 'key' | 'setup-interval' | 'setup-chord' | 'setup-key' | 'quiz' | 'summary' | 'wrongs'

interface AnswerFeedback {
  correct: boolean
  selected?: string
  values?: string[]
  enharmonic?: boolean
}

interface IntervalPreview {
  option: IntervalIdentity
  notes: [NoteSpelling, NoteSpelling]
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DEGREE_NAMES: Record<IntervalDegree, string> = {
  2: '二度', 3: '三度', 4: '四度', 5: '五度', 6: '六度', 7: '七度',
}

const KIND_NAMES: Record<PracticeKind, string> = {
  interval: '音程判断',
  'triad-fill': '转位音名填空',
  'chord-tone': '三音 / 五音',
  'drop2-voicing': 'Drop 2 七和弦',
  'shell-voicing': 'Shell 七和弦',
  'scale-degree': '音名与音级',
  progression: '和弦进行与级数',
}

const QUALITY_NAMES: Record<TriadQuality, string> = {
  major: '大三和弦', minor: '小三和弦', diminished: '减三和弦',
}

const SEVENTH_QUALITY_NAMES: Record<Exclude<SeventhChordQuality, 'half-diminished7'>, string> = {
  major7: '大七和弦', minor7: '小七和弦', dominant7: '属七和弦',
}

const PROGRESSION_QUALITY_NAMES: Record<ChordQuality, string> = {
  ...QUALITY_NAMES,
  ...SEVENTH_QUALITY_TEXT,
}

const SCALE_DEGREES: ScaleDegree[] = [1, 2, 3, 4, 5, 6, 7]

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function visibleNoteName(note: NoteSpelling, showOctaves: boolean): string {
  return showOctaves ? note.displayName : pitchName(note)
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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const lastAutoplayId = useRef('')
  const activeSequenceKey = useRef('')

  const question = questions[questionIndex]
  const correctCount = results.filter(Boolean).length
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
    setProgressionStep(null)
    setProgressionQualities([])
    setMemberValues([])
    if (question.kind === 'triad-fill') setNoteValues(['', '', ''])
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

  const playQuestion = async (target: PracticeQuestion = question) => {
    if (!target) return
    let source: AudioSource
    if (target.kind === 'interval') source = await playNotes([target.lower, target.upper], settings.interval.playback)
    else if (target.kind === 'triad-fill') source = await playNotes(target.notes, 'arpeggio')
    else if (target.kind === 'chord-tone') source = await playChordThenTone(target.notes, target.notes[target.targetIndex])
    else if (target.kind === 'drop2-voicing' || target.kind === 'shell-voicing') source = await playNotes(target.notes, settings.seventh.playback)
    else if (target.kind === 'scale-degree') source = await playCadenceThenTone(target.cadence, target.note)
    else {
      setProgressionStep(null)
      source = await playProgression(target.voicings, setProgressionStep)
    }
    setAudioSource(source)
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
      const source = await initializeAudio()
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
    if (question.kind === 'triad-fill' || question.kind === 'chord-tone' || (question.kind === 'scale-degree' && question.direction === 'forward')) {
      const answers = question.kind === 'triad-fill' ? question.answers : question.kind === 'chord-tone' ? [question.answer] : [pitchName(question.note)]
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
    setAudioSource(await playNotes(notes, settings.interval.playback))
  }

  const playFilledNote = async (value: string, index: number) => {
    if (question?.kind !== 'triad-fill') return
    const pitch = parsePitchName(value)
    const reference = question.notes[index]
    const note = [reference.octave - 1, reference.octave, reference.octave + 1]
      .map((octave) => makeNote(pitch.letter, pitch.accidental, octave))
      .sort((left, right) => Math.abs(left.midi - reference.midi) - Math.abs(right.midi - reference.midi))[0]
    setAudioSource(await playNotes([note], 'harmonic'))
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

  const exitSession = () => {
    stopAudio()
    setProgressionStep(null)
    setQuestions([])
    setView('home')
  }

  const triggerInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={exitSession} aria-label="返回首页"><span className="brand-mark">♫</span><span>音程、和弦与调训练</span></button>
        <div className="topbar-meta">
          {audioSource && <span className="audio-badge">● {audioSource === 'piano' ? '钢琴音源' : '备用合成音'}</span>}
          <button type="button" className="text-button notation-toggle" aria-pressed={settings.showOctaves} onClick={() => setSettings((current) => ({ ...current, showOctaves: !current.showOctaves }))}>音名 {settings.showOctaves ? 'C4' : 'C'}</button>
          <button type="button" className="text-button notation-toggle chord-notation-toggle" aria-label={`和弦标记：${settings.chordNotation === 'jazz' ? '爵士 C△' : '一般 Cmaj7'}`} aria-pressed={settings.chordNotation === 'jazz'} onClick={() => setSettings((current) => ({ ...current, chordNotation: current.chordNotation === 'jazz' ? 'standard' : 'jazz' }))}>和弦 {settings.chordNotation === 'jazz' ? <>C<span className="jazz-triangle" aria-hidden="true">△</span></> : 'Cmaj7'}</button>
          <button type="button" className="text-button" onClick={() => setView('wrongs')}>错题 {wrongItems.length}</button>
        </div>
      </header>

      <main>
        {view === 'home' && <HomeView stats={stats} installPrompt={installPrompt} onInstall={() => void triggerInstall()} onChoose={(next) => { setKind(next); setView(next === 'interval' ? 'setup-interval' : next === 'triad-fill' ? 'setup-chord' : 'key') }} />}

        {view === 'key' && <section className="panel navigation-panel">
          <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button>
          <div className="eyebrow">KEYS</div><h1>调模块</h1><p className="setup-copy">每轮只练一个大调；十题完整覆盖后再加密乱序。</p>
          <div className="choice-grid two">
            <button type="button" className="choice" onClick={() => { setKind('scale-degree'); setView('setup-key') }}><strong>音名与音级</strong><span>识别指定大调中的级数与正确拼写。</span></button>
            <button type="button" className="choice" onClick={() => { setKind('progression'); setView('setup-key') }}><strong>和弦进行与级数</strong><span>在一个调内互译四小节进行与罗马数字。</span></button>
          </div>
        </section>}

        {view === 'setup-interval' && <IntervalSetup settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView('home')} onStart={() => void beginSession('interval')} />}
        {view === 'setup-chord' && <ChordSetup kind={kind} settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView('home')} onKindChange={setKind} onStart={() => void beginSession(kind)} />}
        {view === 'setup-key' && <KeySetup kind={kind} settings={settings} setSettings={setSettings} starting={starting} notice={notice} onBack={() => setView('key')} onStart={() => void beginSession(kind)} />}

        {view === 'quiz' && question && <section className="quiz-view">
          <div className="quiz-header">
            <button type="button" className="back-button" onClick={exitSession}>× 结束</button>
            <div className="progress-wrap"><div className="progress-copy"><span>{KIND_NAMES[question.kind]}</span><strong>{questionIndex + 1} / {questions.length}</strong></div><div className="progress-track"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div></div>
            <div className="score-pill">答对 {correctCount}</div>
          </div>
          <article className={`question-card ${feedback ? feedback.correct ? 'feedback-correct' : 'feedback-wrong' : ''}`}>
            {question.kind === 'interval' && <IntervalExercise question={question} settings={settings} feedback={feedback} preview={intervalPreview} onAnswer={answerInterval} onExplore={(option) => void exploreInterval(option)} onPlay={() => void playQuestion()} onPlaybackChange={(playback) => setSettings((current) => ({ ...current, interval: { ...current.interval, playback } }))} />}
            {question.kind === 'triad-fill' && <TriadFillExercise question={question} notation={settings.chordNotation} feedback={feedback} noteValues={noteValues} activeSlot={activeSlot} onActiveSlotChange={setActiveSlot} onChange={setNoteValues} onPlay={() => void playQuestion()} onSubmit={submitNotes} onValuePlay={(value, index) => void playFilledNote(value, index)} />}
            {question.kind === 'chord-tone' && <ChordToneExercise question={question} notation={settings.chordNotation} feedback={feedback} noteValues={noteValues} onChange={setNoteValues} onPlay={() => void playQuestion()} onSubmit={submitNotes} />}
            {(question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') && <SeventhVoicingExercise question={question} notation={settings.chordNotation} playback={settings.seventh.playback} feedback={feedback} memberValues={memberValues} activeSlot={activeSlot} onActiveSlotChange={setActiveSlot} onChange={setMemberValues} onPlay={() => void playQuestion()} onPlaybackChange={(playback) => setSettings((current) => ({ ...current, seventh: { ...current.seventh, playback } }))} onSubmit={submitMembers} />}
            {question.kind === 'scale-degree' && <ScaleDegreeExercise question={question} feedback={feedback} noteValues={noteValues} degreeValues={degreeValues} onNoteChange={setNoteValues} onDegreeChange={setDegreeValues} onPlay={() => void playQuestion()} onSubmitNotes={submitNotes} onSubmitDegrees={submitDegrees} />}
            {question.kind === 'progression' && <ProgressionExercise question={question} notation={settings.chordNotation} feedback={feedback} noteValues={noteValues} degreeValues={degreeValues} qualities={progressionQualities} activeSlot={activeSlot} activeStep={progressionStep} onActiveSlotChange={setActiveSlot} onNoteChange={setNoteValues} onQualityChange={setProgressionQualities} onDegreeChange={setDegreeValues} onPlay={() => void playQuestion()} onSubmitNotes={submitNotes} onSubmitDegrees={submitDegrees} />}
            {feedback && <FeedbackPanel question={question} notation={settings.chordNotation} feedback={feedback} onReplay={() => void playQuestion()} onNext={nextQuestion} isLast={questionIndex + 1 === questions.length} />}
          </article>
        </section>}

        {view === 'summary' && <section className="summary-view panel">
          <div className="summary-ring" style={{ '--score': `${questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%` } as React.CSSProperties}><strong>{questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%</strong><span>正确率</span></div>
          <div className="eyebrow">SESSION COMPLETE</div><h1>这一轮完成了</h1><p>{correctCount} / {questions.length} 题正确 · 用时 {elapsedSeconds} 秒 · {sessionMistakes.length} 类错题</p>
          <div className="summary-actions"><button type="button" className="primary-button" onClick={() => void beginSession(kind)}>再来 10 题</button>{sessionMistakes.length > 0 && <button type="button" className="secondary-button" onClick={() => void beginSession(kind, sessionMistakes)}>只练本轮错题</button>}<button type="button" className="text-button" onClick={exitSession}>返回首页</button></div>
        </section>}

        {view === 'wrongs' && <section className="wrong-view panel">
          <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button><div className="eyebrow">REVIEW</div><h1>错题复习</h1>
          <div className="chip-row">{(['all', 'interval', 'triad-fill', 'chord-tone', 'drop2-voicing', 'shell-voicing', 'scale-degree', 'progression'] as const).map((filter) => <button type="button" key={filter} className={wrongFilter === filter ? 'chip selected' : 'chip'} onClick={() => setWrongFilter(filter)}>{filter === 'all' ? '全部' : KIND_NAMES[filter]}</button>)}</div>
          {filteredWrongItems.length ? <><div className="wrong-list">{filteredWrongItems.map((item) => <div className="wrong-row" key={item.key}><span className="wrong-kind">{KIND_NAMES[item.kind]}</span><strong>{questionSummary(item.question, settings.chordNotation)}</strong><small>累计答错 {item.wrongCount} 次</small></div>)}</div><button type="button" className="primary-button" disabled={starting} onClick={() => void beginSession(filteredWrongItems[0].kind, filteredWrongItems.slice(0, 10).map((item) => item.question))}>{starting ? '正在准备音源…' : `复习这 ${Math.min(10, filteredWrongItems.length)} 题`}</button></> : <div className="empty-state"><span>✓</span><h2>这里暂时没有错题</h2><p>答错的题会按练习类型保存在这里。</p></div>}
        </section>}
      </main>
      <footer>所有练习数据只保存在当前设备 · Salamander Grand Piano · CC BY 3.0</footer>
    </div>
  )
}

function HomeView({ stats, installPrompt, onInstall, onChoose }: { stats: LifetimeStats; installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void; onChoose: (kind: 'interval' | 'triad-fill' | 'scale-degree') => void }) {
  return <section className="home-view">
    <div className="hero-card"><div className="eyebrow">READ · HEAR · NAME</div><h1>看见音符，听见关系，<br />说出它的名字。</h1><p>每轮十题，把五线谱、音名拼写、和声与听觉连接起来。电脑与手机均可使用，安装后也能离线练习。</p><div className="lifetime-stats"><div><strong>{stats.sessions}</strong><span>完成轮次</span></div><div><strong>{stats.attempts}</strong><span>累计答题</span></div><div><strong>{stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0}%</strong><span>累计正确率</span></div></div></div>
    <div className="mode-grid three">
      <button type="button" className="mode-card interval-mode" onClick={() => onChoose('interval')}><span className="mode-number">01</span><span className="mode-icon">♬</span><h2>音程</h2><p>看两个音名与五线谱，判断完整音程，并用旋律或和声试听。</p><span className="mode-link">开始设置 →</span></button>
      <button type="button" className="mode-card triad-mode" onClick={() => onChoose('triad-fill')}><span className="mode-number">02</span><span className="mode-icon">△</span><h2>和弦</h2><p>练习三和弦、Drop 2 七和弦与 Shell Chord，并连接音名、排列和听觉。</p><span className="mode-link">进入和弦 →</span></button>
      <button type="button" className="mode-card key-mode" onClick={() => onChoose('scale-degree')}><span className="mode-number">03</span><span className="mode-icon">♮</span><h2>调</h2><p>在一个大调内练习音级、音名，以及和弦进行与级数互译。</p><span className="mode-link">进入调模块 →</span></button>
    </div>
    <div className="install-card"><div><strong>安装到手机或电脑</strong><p>安装后可像应用一样从桌面打开，并离线使用。</p></div>{installPrompt ? <button type="button" className="primary-button" onClick={onInstall}>安装应用</button> : <details><summary>查看安装方法</summary><p>Chrome / Edge：浏览器地址栏右侧选择“安装”。Android：Chrome 菜单选择“安装应用”。iPhone / iPad：Safari 的分享菜单选择“添加到主屏幕”。</p></details>}</div>
  </section>
}

function IntervalSetup({ settings, setSettings, starting, notice, onBack, onStart }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回首页</button><div className="eyebrow">INTERVALS</div><h1>设置音程练习</h1>
    <fieldset><legend>选择音程度数 <small>可多选</small></legend><div className="chip-row">{([2, 3, 4, 5, 6, 7] as IntervalDegree[]).map((degree) => <button type="button" key={degree} className={settings.interval.degrees.includes(degree) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, degrees: toggleValue(current.interval.degrees, degree) } }))}>{DEGREE_NAMES[degree]}</button>)}</div></fieldset>
    <fieldset><legend>音名难度</legend><div className="choice-grid two"><button type="button" className={settings.interval.difficulty === 'basic' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'basic' } }))}><strong>基础</strong><span>仅自然音</span></button><button type="button" className={settings.interval.difficulty === 'advanced' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'advanced' } }))}><strong>进阶</strong><span>加入单升、单降</span></button></div></fieldset>
    <fieldset><legend>默认播放</legend><div className="segmented"><button type="button" className={settings.interval.playback === 'melodic' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, playback: 'melodic' } }))}>旋律</button><button type="button" className={settings.interval.playback === 'harmonic' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, playback: 'harmonic' } }))}>和声</button></div></fieldset>
    <button type="button" className="primary-button" disabled={!settings.interval.degrees.length || starting} onClick={onStart}>{starting ? '正在准备钢琴音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}

function ChordSetup({ kind, settings, setSettings, starting, notice, onBack, onKindChange, onStart }: { kind: PracticeKind; settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onKindChange: (kind: PracticeKind) => void; onStart: () => void }) {
  const triadMode = kind === 'triad-fill' || kind === 'chord-tone'
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回首页</button><div className="eyebrow">CHORDS</div><h1>设置和弦练习</h1>
    <fieldset><legend>和弦模块</legend><div className="chord-module-grid">
      <button type="button" className={triadMode ? 'choice selected' : 'choice'} onClick={() => onKindChange('triad-fill')}><strong>三和弦</strong><span>转位填空与成员音问答</span></button>
      <button type="button" className={kind === 'drop2-voicing' ? 'choice selected' : 'choice'} onClick={() => onKindChange('drop2-voicing')}><strong>Drop 2 <small>七和弦</small></strong><span>听辨四种 Drop 2 排列</span></button>
      <button type="button" className={kind === 'shell-voicing' ? 'choice selected' : 'choice'} onClick={() => onKindChange('shell-voicing')}><strong>Shell Chord <small>七和弦</small></strong><span>听辨 R37 与 R73</span></button>
    </div></fieldset>
    {triadMode ? <>
      <fieldset><legend>练习方式</legend><div className="choice-grid two"><button type="button" className={kind === 'triad-fill' ? 'choice selected' : 'choice'} onClick={() => onKindChange('triad-fill')}><strong>转位音名填空</strong><span>听原位或转位，按实际低到高填写三个音。</span></button><button type="button" className={kind === 'chord-tone' ? 'choice selected' : 'choice'} onClick={() => onKindChange('chord-tone')}><strong>三音 / 五音</strong><span>听和弦后写出题目指定的成员音。</span></button></div></fieldset>
      <fieldset><legend>和弦性质 <small>可多选</small></legend><div className="chip-row">{(['major', 'minor', 'diminished'] as TriadQuality[]).map((quality) => <button type="button" key={quality} className={settings.triad.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, qualities: toggleValue(current.triad.qualities, quality) } }))}>{QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <fieldset><legend>和弦音名范围</legend><p className="setup-copy">此设置只控制可能出现的和弦拼写，不代表题目所属调。</p><div className="level-list">{([[1, '常用', '由 C、G、F 大调调内三和弦生成并去重'], [2, '扩展', '再加入 D、B♭、A、E♭ 大调来源'], [3, '全部', '十二个大调来源的三和弦去重']] as const).map(([level, title, description]) => <button type="button" key={level} className={settings.triad.spellingLevel === level ? 'level selected' : 'level'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, spellingLevel: level } }))}><span>{title}</span><small>{description}</small></button>)}</div></fieldset>
    </> : <>
      <fieldset><legend>七和弦性质 <small>可多选</small></legend><div className="chip-row">{(['major7', 'minor7', 'dominant7'] as const).map((quality) => <button type="button" key={quality} className={settings.seventh.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, seventh: { ...current.seventh, qualities: toggleValue(current.seventh.qualities, quality) } }))}>{SEVENTH_QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <fieldset><legend>默认播放</legend><div className="segmented"><button type="button" className={settings.seventh.playback === 'arpeggio' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, seventh: { ...current.seventh, playback: 'arpeggio' } }))}>琶音</button><button type="button" className={settings.seventh.playback === 'harmonic' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, seventh: { ...current.seventh, playback: 'harmonic' } }))}>和声</button></div></fieldset>
      <p className="setup-copy seventh-root-copy">固定使用 C、G、F、D、B♭、A、E♭、E、A♭、B、D♭、F♯ 十二个根音；每轮覆盖全部排列。</p>
    </>}
    <button type="button" className="primary-button" disabled={(triadMode ? !settings.triad.qualities.length : !settings.seventh.qualities.length) || starting} onClick={onStart}>{starting ? '正在准备钢琴音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}

function KeySetup({ kind, settings, setSettings, starting, notice, onBack, onStart }: { kind: PracticeKind; settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  const isScale = kind === 'scale-degree'
  const direction = isScale ? settings.keyPractice.scaleDirection : settings.keyPractice.progressionDirection
  const updateDirection = (value: KeyPracticeDirection) => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, [isScale ? 'scaleDirection' : 'progressionDirection']: value } }))
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回调模块</button><div className="eyebrow">KEY TRAINING</div><h1>{isScale ? '设置音名与音级' : '设置和弦进行与级数'}</h1>
    <fieldset><legend>本轮大调 <small>一次只练一个调</small></legend><div className="key-grid">{MAJOR_KEYS.map((key) => <button type="button" key={key.name} className={settings.keyPractice.keyName === key.name ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, keyName: key.name } }))}>{key.name} 大调</button>)}</div></fieldset>
    <fieldset><legend>题目方向</legend><div className="segmented"><button type="button" className={direction === 'forward' ? 'selected' : ''} onClick={() => updateDirection('forward')}>正向</button><button type="button" className={direction === 'reverse' ? 'selected' : ''} onClick={() => updateDirection('reverse')}>反向</button><button type="button" className={direction === 'mixed' ? 'selected' : ''} onClick={() => updateDirection('mixed')}>混合 5 / 5</button></div></fieldset>
    {isScale ? <p className="setup-copy">十题保证 1–7 级各出现一次，另外三题复习；顺序每轮不同。</p> : <><fieldset><legend>进行 Voicing</legend><div className="progression-voicing-grid">{([['three', '三声部', '三和弦'], ['four', '四声部', '三和弦'], ['shell', 'Shell', '七和弦'], ['drop2', 'Drop 2', '七和弦']] as const).map(([mode, title, family]) => <button type="button" key={mode} className={settings.keyPractice.voicingMode === mode ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, keyPractice: { ...current.keyPractice, voicingMode: mode } }))}><strong>{title}</strong><span>{family}</span></button>)}</div></fieldset><p className="setup-copy">十题覆盖九条常见进行模板；Shell 与 Drop 2 使用调内七和弦和自动平滑连接。</p></>}
    <button type="button" className="primary-button" disabled={starting} onClick={onStart}>{starting ? '正在准备钢琴音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}

function QuestionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle: ReactNode }) {
  return <div className="question-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>
}

function IntervalExercise({ question, settings, feedback, preview, onAnswer, onExplore, onPlay, onPlaybackChange }: { question: IntervalQuestion; settings: AppSettings; feedback: AnswerFeedback | null; preview: IntervalPreview | null; onAnswer: (answer: string) => void; onExplore: (option: IntervalIdentity) => void; onPlay: () => void; onPlaybackChange: (mode: 'melodic' | 'harmonic') => void }) {
  return <><QuestionHeading eyebrow="INTERVAL READING" title={`${visibleNoteName(question.lower, settings.showOctaves)} – ${visibleNoteName(question.upper, settings.showOctaves)}`} subtitle="观察音名和谱面，选择它们构成的完整音程。" /><Staff notes={[question.lower, question.upper]} label="音程五线谱" /><div className="play-controls"><button type="button" className="play-button" onClick={onPlay}>▶ 重新播放</button><div className="segmented compact"><button type="button" className={settings.interval.playback === 'melodic' ? 'selected' : ''} onClick={() => onPlaybackChange('melodic')}>旋律</button><button type="button" className={settings.interval.playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>和声</button></div></div><div className="answer-grid">{question.options.map((option) => { const state = !feedback ? '' : option.label === question.answer.label ? 'correct' : option.label === feedback.selected ? 'wrong' : 'muted'; return <button type="button" key={option.label} className={`answer-option ${state} ${preview?.option.label === option.label ? 'exploring' : ''}`} onClick={() => feedback ? onExplore(option) : onAnswer(option.label)}>{option.label}</button> })}</div>{feedback && <div className="interval-preview" aria-live="polite">{preview ? <><strong>{preview.option.label}</strong><span>{visibleNoteName(preview.notes[0], settings.showOctaves)} – {visibleNoteName(preview.notes[1], settings.showOctaves)}</span><small>固定本题低音，只改变高音试听。</small></> : <span>答题后可点击任一选项，试听固定低音下的该音程。</span>}</div>}</>
}

function TriadFillExercise({ question, notation, feedback, noteValues, activeSlot, onActiveSlotChange, onChange, onPlay, onSubmit, onValuePlay }: { question: Extract<PracticeQuestion, { kind: 'triad-fill' }>; notation: AppSettings['chordNotation']; feedback: AnswerFeedback | null; noteValues: string[]; activeSlot: number; onActiveSlotChange: (index: number) => void; onChange: (values: string[]) => void; onPlay: () => void; onSubmit: () => void; onValuePlay: (value: string, index: number) => void }) {
  return (
    <>
      <QuestionHeading eyebrow="INVERSION SPELLING" title={<>{question.triad.label}（<ChordSymbol chord={question.triad} notation={notation} />）</>} subtitle="听原位或转位，按实际低到高填写三个音名。" />
      <button type="button" className="play-button" onClick={onPlay}>▶ 从低到高重播</button>
      {feedback && <Staff notes={question.notes} label="三和弦谱面" />}
      <NoteKeyboard values={noteValues} correctValues={feedback ? question.answers : undefined} activeIndex={activeSlot} disabled={Boolean(feedback)} onActiveIndexChange={onActiveSlotChange} onChange={onChange} onValuePlay={feedback ? onValuePlay : undefined} />
      {feedback && <p className="note-play-hint">点击已填写的音名，可以试听自己的答案。</p>}
      {!feedback && <button type="button" className="submit-button" disabled={noteValues.some((value) => !value)} onClick={onSubmit}>提交三个音名</button>}
    </>
  )
}

function ChordToneExercise({ question, notation, feedback, noteValues, onChange, onPlay, onSubmit }: { question: Extract<PracticeQuestion, { kind: 'chord-tone' }>; notation: AppSettings['chordNotation']; feedback: AnswerFeedback | null; noteValues: string[]; onChange: (values: string[]) => void; onPlay: () => void; onSubmit: () => void }) {
  const target = question.target === 'third' ? '三音' : '五音'
  return (
    <>
      <QuestionHeading eyebrow="CHORD MEMBER" title={<>{question.triad.label}（<ChordSymbol chord={question.triad} notation={notation} />）</>} subtitle={<>{'这个和弦的 '}<strong className="question-target">{target}</strong>{' 是什么？'}</>} />
      <button type="button" className="play-button" onClick={onPlay}>▶ 同时和弦后播放目标音</button>
      {feedback && <Staff notes={question.notes} targetIndex={question.targetIndex} label="三和弦原位谱面，目标音已高亮" />}
      <NoteKeyboard values={noteValues} correctValues={feedback ? [question.answer] : undefined} activeIndex={0} disabled={Boolean(feedback)} onActiveIndexChange={() => undefined} onChange={onChange} />
      {!feedback && <button type="button" className="submit-button" disabled={!noteValues[0]} onClick={onSubmit}>提交音名</button>}
    </>
  )
}

function SeventhVoicingExercise({ question, notation, playback, feedback, memberValues, activeSlot, onActiveSlotChange, onChange, onPlay, onPlaybackChange, onSubmit }: {
  question: Extract<PracticeQuestion, { kind: 'drop2-voicing' | 'shell-voicing' }>
  notation: AppSettings['chordNotation']
  playback: AppSettings['seventh']['playback']
  feedback: AnswerFeedback | null
  memberValues: string[]
  activeSlot: number
  onActiveSlotChange: (index: number) => void
  onChange: (values: string[]) => void
  onPlay: () => void
  onPlaybackChange: (playback: AppSettings['seventh']['playback']) => void
  onSubmit: () => void
}) {
  const drop2 = question.kind === 'drop2-voicing'
  return <>
    <QuestionHeading eyebrow={drop2 ? 'DROP 2 VOICING' : 'SHELL CHORD'} title={<ChordSymbol chord={question.chord} notation={notation} />} subtitle={`听和弦后，按实际低到高填写${drop2 ? '四个' : '三个'}成员。`} />
    <div className="play-controls"><button type="button" className="play-button" onClick={onPlay}>▶ 重新播放</button><div className="segmented compact"><button type="button" className={playback === 'arpeggio' ? 'selected' : ''} onClick={() => onPlaybackChange('arpeggio')}>琶音</button><button type="button" className={playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>和声</button></div></div>
    {feedback && <><Staff notes={question.notes} label={`${drop2 ? 'Drop 2' : 'Shell'} 七和弦谱面`} /><p className="voicing-answer"><strong>{question.answer.join('–')}</strong><span>{question.notes.map(pitchName).join('–')}</span></p></>}
    <ChordMemberKeyboard values={memberValues} correctValues={feedback ? question.answer : undefined} activeIndex={activeSlot} allowedMembers={drop2 ? ['R', '3', '5', '7'] : ['R', '3', '7']} disabled={Boolean(feedback)} onActiveIndexChange={onActiveSlotChange} onChange={onChange} />
    {!feedback && <button type="button" className="submit-button" disabled={memberValues.some((value) => !value)} onClick={onSubmit}>提交成员排列</button>}
  </>
}

function ScaleDegreeExercise({ question, feedback, noteValues, degreeValues, onNoteChange, onDegreeChange, onPlay, onSubmitNotes, onSubmitDegrees }: { question: Extract<PracticeQuestion, { kind: 'scale-degree' }>; feedback: AnswerFeedback | null; noteValues: string[]; degreeValues: number[]; onNoteChange: (values: string[]) => void; onDegreeChange: (values: number[]) => void; onPlay: () => void; onSubmitNotes: () => void; onSubmitDegrees: () => void }) {
  const isForward = question.direction === 'forward'
  return (
    <>
      <QuestionHeading eyebrow="SCALE DEGREE" title={isForward ? `${question.key.name} 大调第 ${question.degree} 级是什么音？` : `${question.key.name} 大调中的 ${pitchName(question.note)} 是第几级？`} subtitle="先听 V–I 正格终止，再听目标单音。" />
      <button type="button" className="play-button" onClick={onPlay}>▶ 重播终止与目标音</button>
      {isForward ? <>
        <NoteKeyboard values={noteValues} correctValues={feedback ? [pitchName(question.note)] : undefined} activeIndex={0} disabled={Boolean(feedback)} onActiveIndexChange={() => undefined} onChange={onNoteChange} />
        {!feedback && <button type="button" className="submit-button" disabled={!noteValues[0]} onClick={onSubmitNotes}>提交音名</button>}
      </> : <>
        <DegreeChoices values={degreeValues} correct={feedback ? [question.degree] : undefined} disabled={Boolean(feedback)} onChange={onDegreeChange} />
        {!feedback && <button type="button" className="submit-button" disabled={!degreeValues[0]} onClick={onSubmitDegrees}>提交音级</button>}
      </>}
      {feedback && <Staff notes={[question.note]} label="目标音五线谱" />}
    </>
  )
}

function ProgressionExercise({ question, notation, feedback, noteValues, degreeValues, qualities, activeSlot, activeStep, onActiveSlotChange, onNoteChange, onQualityChange, onDegreeChange, onPlay, onSubmitNotes, onSubmitDegrees }: { question: ProgressionQuestion; notation: AppSettings['chordNotation']; feedback: AnswerFeedback | null; noteValues: string[]; degreeValues: number[]; qualities: ChordQuality[]; activeSlot: number; activeStep: number | null; onActiveSlotChange: (index: number) => void; onNoteChange: (values: string[]) => void; onQualityChange: (qualities: ChordQuality[]) => void; onDegreeChange: (values: number[]) => void; onPlay: () => void; onSubmitNotes: () => void; onSubmitDegrees: () => void }) {
  const forward = question.direction === 'forward'
  const seventhMode = question.voicingMode === 'shell' || question.voicingMode === 'drop2'
  const qualityChoices: ChordQuality[] = seventhMode ? ['major7', 'minor7', 'dominant7', 'half-diminished7'] : ['major', 'minor', 'diminished']
  const setQuality = (quality: ChordQuality) => {
    const next = [...qualities]
    next[activeSlot] = quality
    onQualityChange(next)
  }
  return (
    <>
      <QuestionHeading eyebrow="PROGRESSION" title={`${question.key.name} 大调 · 四小节进行`} subtitle={forward ? '根据级数写出每小节的完整和弦符号。' : '根据和弦符号逐格选择调内级数。'} />
      <button type="button" className="play-button" onClick={onPlay}>▶ 重播四小节进行（约 123 BPM）</button>
      <div className="progression-grid">
        {question.chords.map((chord, index) => <div key={index} className={`progression-cell ${activeStep === index ? 'playing' : ''} ${activeSlot === index && !feedback ? 'active' : ''}`} onClick={() => !feedback && onActiveSlotChange(index)}>
          {forward ? <><small>{chord.roman}</small><strong>{noteValues[index] ? <ChordSymbol chord={{ root: parsePitchName(noteValues[index]), quality: qualities[index] ?? (seventhMode ? 'major7' : 'major') }} notation={notation} /> : '—'}</strong></> : <><small>和弦 {index + 1}</small><strong><ChordSymbol chord={chord} notation={notation} /></strong></>}
          <span>{index + 1}</span>
        </div>)}
      </div>
      {forward ? <>
        <NoteKeyboard values={noteValues} activeIndex={activeSlot} disabled={Boolean(feedback)} showSlots={false} onActiveIndexChange={onActiveSlotChange} onChange={onNoteChange} />
        <div className="quality-row">{qualityChoices.map((quality) => <button type="button" key={quality} className={qualities[activeSlot] === quality ? 'selected' : ''} disabled={Boolean(feedback)} onClick={() => setQuality(quality)}>{PROGRESSION_QUALITY_NAMES[quality]}</button>)}</div>
        {!feedback && <button type="button" className="submit-button" disabled={noteValues.some((value) => !value)} onClick={onSubmitNotes}>提交和弦进行</button>}
      </> : <>
        <DegreeChoices values={degreeValues} correct={feedback ? question.degrees : undefined} disabled={Boolean(feedback)} onChange={onDegreeChange} />
        {!feedback && <button type="button" className="submit-button" disabled={degreeValues.some((value) => !value)} onClick={onSubmitDegrees}>提交级数进行</button>}
      </>}
      {feedback && <p className="progression-answer">正确答案：{forward ? question.chords.map((chord, index) => <span key={index}>{index > 0 && ' – '}<ChordSymbol chord={chord} notation={notation} /></span>) : question.chords.map((chord) => chord.roman).join(' – ')}</p>}
    </>
  )
}

function DegreeChoices({ values, correct, disabled, onChange }: { values: number[]; correct?: readonly number[]; disabled: boolean; onChange: (values: number[]) => void }) {
  const active = values.findIndex((value) => !value)
  return (
    <div className="degree-answer">
      <div className="degree-slots">{values.map((value, index) => <span key={index} className={correct ? value === correct[index] ? 'correct' : 'wrong' : ''}>{value ? `${value}级` : '—'}</span>)}</div>
      <div className="degree-grid">{SCALE_DEGREES.map((degree) => <button type="button" key={degree} disabled={disabled} onClick={() => { if (disabled) return; const next = [...values]; const index = active === -1 ? values.length - 1 : active; next[index] = degree; onChange(next) }}>{degree}</button>)}</div>
    </div>
  )
}

function FeedbackPanel({ question, notation, feedback, onReplay, onNext, isLast }: { question: PracticeQuestion; notation: AppSettings['chordNotation']; feedback: AnswerFeedback; onReplay: () => void; onNext: () => void; isLast: boolean }) {
  let explanation: ReactNode = ''
  if (question.kind === 'interval') explanation = `${question.lower.letter} 到 ${question.upper.letter} 数 ${question.answer.degree} 度；实际相差 ${question.answer.semitones} 个半音，所以是${question.answer.label}。`
  else if (question.kind === 'triad-fill') explanation = `根、三、五音是 ${question.triad.tones.map(pitchName).join('–')}（${triadSolfege(question.triad.quality)}）；本题为${INVERSION_TEXT[question.inversion]}，低到高是 ${question.answers.join('–')}（${triadSolfege(question.triad.quality, question.inversion)}）。`
  else if (question.kind === 'chord-tone') explanation = `${triadFormula(question.triad.quality)}；题目的${question.target === 'third' ? '三音' : '五音'}是 ${question.answer}。`
  else if (question.kind === 'drop2-voicing' || question.kind === 'shell-voicing') explanation = `${formatChordSymbol(question.chord, notation)} 本题低到高为 ${question.answer.join('–')}，实际音名是 ${question.notes.map(pitchName).join('–')}。`
  else if (question.kind === 'scale-degree') explanation = `${question.key.name} 大调第 ${question.degree} 级是 ${pitchName(question.note)}；调内音名必须依照该调的正确拼写。`
  else explanation = `${question.key.name} 大调中：${question.chords.map((chord) => `${chord.roman}=${formatChordSymbol(chord, notation)}`).join('，')}。`
  return <div className={`feedback-panel ${feedback.correct ? 'correct' : 'wrong'}`} role="status"><div className="feedback-title"><span>{feedback.correct ? '✓' : '!'}</span><strong>{feedback.correct ? '答对了' : '再看一步'}</strong></div>{feedback.enharmonic && <p className="enharmonic-note">音高相同，但理论拼写不正确。</p>}<p>{explanation}</p><div className="feedback-actions"><button type="button" className="secondary-button" onClick={onReplay}>▶ 再听一次</button><button type="button" className="primary-button" onClick={onNext}>{isLast ? '查看本轮结果' : '下一题 →'}</button></div></div>
}

export default App
