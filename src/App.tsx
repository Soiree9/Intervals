import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { NoteKeyboard } from './components/NoteKeyboard'
import { Staff } from './components/Staff'
import { INVERSION_TEXT, makeNote, parsePitchName, pitchClassIsEnharmonic, pitchName, triadFormula, triadSolfege } from './domain/music'
import { createIntervalExample, createSession, intervalOptionsFor, questionStorageKey, questionSummary } from './domain/questions'
import type {
  AppSettings,
  IntervalDegree,
  IntervalIdentity,
  IntervalQuestion,
  LifetimeStats,
  NoteSpelling,
  PracticeKind,
  PracticeQuestion,
  TriadQuality,
  WrongItem,
} from './domain/types'
import { initializeAudio, playNotes, type AudioSource } from './services/audio'
import {
  loadSettings,
  loadStats,
  loadWrongItems,
  recordSession,
  removeWrongItem,
  saveSettings,
  upsertWrongItem,
} from './services/storage'

type View = 'home' | 'setup-interval' | 'setup-triad' | 'quiz' | 'summary' | 'wrongs'

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

const DEGREE_NAMES: Record<IntervalDegree, string> = {
  2: '二度', 3: '三度', 4: '四度', 5: '五度', 6: '六度', 7: '七度',
}

const KIND_NAMES: Record<PracticeKind, string> = {
  interval: '音程判断',
  'triad-fill': '转位音名填空',
  'chord-tone': '三音 / 五音',
}

const QUALITY_NAMES: Record<TriadQuality, string> = {
  major: '大三和弦', minor: '小三和弦', diminished: '减三和弦',
}

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
  const [activeSlot, setActiveSlot] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isReview, setIsReview] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const [wrongFilter, setWrongFilter] = useState<'all' | PracticeKind>('all')
  const [intervalPreview, setIntervalPreview] = useState<IntervalPreview | null>(null)
  const lastAutoplayId = useRef('')

  const question = questions[questionIndex]
  const correctCount = results.filter(Boolean).length
  const filteredWrongItems = useMemo(
    () => wrongItems.filter((item) => wrongFilter === 'all' || item.kind === wrongFilter),
    [wrongFilter, wrongItems],
  )

  useEffect(() => saveSettings(settings), [settings])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view, questionIndex])

  useEffect(() => {
    if (!question) return
    setFeedback(null)
    setActiveSlot(0)
    setIntervalPreview(null)
    setNoteValues(question.kind === 'triad-fill' ? ['', '', ''] : question.kind === 'chord-tone' ? [''] : [])
  }, [question])

  useEffect(() => {
    if (view !== 'quiz' || !question || lastAutoplayId.current === question.id) return
    lastAutoplayId.current = question.id
    const timer = window.setTimeout(() => {
      const mode = question.kind === 'interval' ? settings.interval.playback : 'arpeggio'
      const notes = question.kind === 'interval' ? [question.lower, question.upper] : question.notes
      void playNotes(notes, mode).then(setAudioSource)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [question, settings.interval.playback, view])

  const playQuestion = async (target: PracticeQuestion = question) => {
    if (!target) return
    const mode = target.kind === 'interval' ? settings.interval.playback : 'arpeggio'
    const notes = target.kind === 'interval' ? [target.lower, target.upper] : target.notes
    const source = await playNotes(notes, mode)
    setAudioSource(source)
  }

  const beginSession = async (nextKind: PracticeKind, suppliedQuestions?: PracticeQuestion[]) => {
    setStarting(true)
    setNotice('')
    try {
      const source = await initializeAudio()
      const sourceQuestions = suppliedQuestions ?? createSession(nextKind, settings.interval, settings.triad)
      const nextQuestions = sourceQuestions.map((item) => item.kind === 'interval'
        ? { ...item, options: intervalOptionsFor(Array.from(new Set([...settings.interval.degrees, item.answer.degree])).sort() as IntervalDegree[], settings.interval.difficulty) }
        : item)
      if (!nextQuestions.length) throw new Error('没有可复习的题目。')
      setAudioSource(source)
      setKind(nextKind)
      setQuestions(nextQuestions.slice(0, 10))
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
    setResults((current) => [...current, isCorrect])
    if (isCorrect && isReview) {
      setWrongItems((current) => removeWrongItem(current, question))
    } else if (!isCorrect) {
      setWrongItems((current) => upsertWrongItem(current, question))
      setSessionMistakes((current) => current.some((item) => questionStorageKey(item) === questionStorageKey(question)) ? current : [...current, question])
    }
  }

  const answerInterval = (selected: string) => {
    if (feedback || question.kind !== 'interval') return
    const isCorrect = selected === question.answer.label
    setFeedback({ correct: isCorrect, selected })
    recordAnswer(isCorrect)
    if (isCorrect) void playQuestion(question)
  }

  const submitNotes = () => {
    if (feedback || !question || question.kind === 'interval' || noteValues.some((value) => !value)) return
    const answers = question.kind === 'triad-fill' ? question.answers : [question.answer]
    const isCorrect = answers.every((answer, index) => noteValues[index] === answer)
    const enharmonic = !isCorrect && answers.some((answer, index) => noteValues[index] && noteValues[index] !== answer && pitchClassIsEnharmonic(noteValues[index], answer))
    setFeedback({ correct: isCorrect, values: [...noteValues], enharmonic })
    recordAnswer(isCorrect)
    if (isCorrect) void playQuestion(question)
  }

  const exploreInterval = async (option: IntervalIdentity) => {
    const notes = createIntervalExample(option)
    setIntervalPreview({ option, notes })
    setAudioSource(await playNotes(notes, settings.interval.playback))
  }

  const playFilledNote = async (value: string, index: number) => {
    if (question.kind !== 'triad-fill') return
    const pitch = parsePitchName(value)
    const reference = question.notes[index]
    const candidates = [reference.octave - 1, reference.octave, reference.octave + 1]
      .map((octave) => makeNote(pitch.letter, pitch.accidental, octave))
      .sort((left, right) => Math.abs(left.midi - reference.midi) - Math.abs(right.midi - reference.midi))
    setAudioSource(await playNotes([candidates[0]], 'harmonic'))
  }

  const nextQuestion = () => {
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
    setQuestions([])
    setView('home')
  }

  const setupTitle = kind === 'interval' ? '设置音程练习' : '设置三和弦练习'

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={exitSession} aria-label="返回首页">
          <span className="brand-mark">♬</span>
          <span>音程与三和弦训练</span>
        </button>
        <div className="topbar-meta">
          {audioSource && <span className="audio-badge">● {audioSource === 'piano' ? '钢琴音源' : '备用合成音'}</span>}
          <button
            type="button"
            className="text-button notation-toggle"
            aria-pressed={settings.showOctaves}
            title="切换科学音高标记"
            onClick={() => setSettings((current) => ({ ...current, showOctaves: !current.showOctaves }))}
          >音名 {settings.showOctaves ? 'C4' : 'C'}</button>
          <button type="button" className="text-button" onClick={() => setView('wrongs')}>错题 {wrongItems.length}</button>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <section className="home-view">
            <div className="hero-card">
              <div className="eyebrow">READ · HEAR · NAME</div>
              <h1>看见音符，听见关系，<br />说出它的名字。</h1>
              <p>每轮十题，把五线谱、音名拼写和钢琴听感连接起来。电脑与手机都可安装，离线也能练。</p>
              <div className="lifetime-stats">
                <div><strong>{stats.sessions}</strong><span>完成轮次</span></div>
                <div><strong>{stats.attempts}</strong><span>累计答题</span></div>
                <div><strong>{stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0}%</strong><span>累计正确率</span></div>
              </div>
            </div>

            <div className="mode-grid">
              <button type="button" className="mode-card interval-mode" onClick={() => { setKind('interval'); setView('setup-interval') }}>
                <span className="mode-number">01</span>
                <span className="mode-icon">𝄞</span>
                <h2>音程判断</h2>
                <p>看两个音名与五线谱，判断完整音程；切换旋律或和声试听。</p>
                <span className="mode-link">开始设置 →</span>
              </button>
              <button type="button" className="mode-card triad-mode" onClick={() => { setKind('triad-fill'); setView('setup-triad') }}>
                <span className="mode-number">02</span>
                <span className="mode-icon">♭</span>
                <h2>三和弦训练</h2>
                <p>沿五度圈练习调内三和弦、三个转位，以及三音与五音拼写。</p>
                <span className="mode-link">开始设置 →</span>
              </button>
            </div>
            <p className="install-note">提示：在浏览器菜单中选择“安装应用”或“添加到主屏幕”，即可像普通应用一样使用。</p>
          </section>
        )}

        {(view === 'setup-interval' || view === 'setup-triad') && (
          <section className="setup-view panel">
            <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button>
            <div className="eyebrow">PRACTICE SETUP</div>
            <h1>{setupTitle}</h1>

            {view === 'setup-interval' ? (
              <>
                <fieldset>
                  <legend>选择音程度数 <small>可多选</small></legend>
                  <div className="chip-row">
                    {([2, 3, 4, 5, 6, 7] as IntervalDegree[]).map((degree) => (
                      <button
                        type="button"
                        key={degree}
                        className={settings.interval.degrees.includes(degree) ? 'chip selected' : 'chip'}
                        onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, degrees: toggleValue(current.interval.degrees, degree) } }))}
                      >{DEGREE_NAMES[degree]}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>音名难度</legend>
                  <div className="choice-grid two">
                    <button type="button" className={settings.interval.difficulty === 'basic' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'basic' } }))}>
                      <strong>基础</strong><span>仅自然音</span>
                    </button>
                    <button type="button" className={settings.interval.difficulty === 'advanced' ? 'choice selected' : 'choice'} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, difficulty: 'advanced' } }))}>
                      <strong>进阶</strong><span>加入单升、单降</span>
                    </button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>默认播放</legend>
                  <div className="segmented">
                    <button type="button" className={settings.interval.playback === 'melodic' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, playback: 'melodic' } }))}>♪ 旋律</button>
                    <button type="button" className={settings.interval.playback === 'harmonic' ? 'selected' : ''} onClick={() => setSettings((current) => ({ ...current, interval: { ...current.interval, playback: 'harmonic' } }))}>♬ 和声</button>
                  </div>
                </fieldset>
                <button type="button" className="primary-button" disabled={!settings.interval.degrees.length || starting} onClick={() => void beginSession('interval')}>
                  {starting ? '正在准备钢琴音源…' : '开始 10 题练习'}
                </button>
              </>
            ) : (
              <>
                <fieldset>
                  <legend>练习方式</legend>
                  <div className="choice-grid two">
                    <button type="button" className={kind === 'triad-fill' ? 'choice selected' : 'choice'} onClick={() => setKind('triad-fill')}>
                      <strong>转位音名填空</strong><span>听原位或转位，写出三个音</span>
                    </button>
                    <button type="button" className={kind === 'chord-tone' ? 'choice selected' : 'choice'} onClick={() => setKind('chord-tone')}>
                      <strong>三音 / 五音</strong><span>根据和弦写出指定成员音</span>
                    </button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>和弦性质 <small>可多选</small></legend>
                  <div className="chip-row">
                    {(['major', 'minor', 'diminished'] as TriadQuality[]).map((quality) => (
                      <button type="button" key={quality} className={settings.triad.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, qualities: toggleValue(current.triad.qualities, quality) } }))}>
                        {QUALITY_NAMES[quality]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>五度圈范围</legend>
                  <div className="level-list">
                    {([
                      [1, '一级', 'C · G · F 大调'],
                      [2, '二级', '再加入 D · B♭ · A · E♭'],
                      [3, '三级', '完整十二个大调'],
                    ] as const).map(([level, title, description]) => (
                      <button type="button" key={level} className={settings.triad.circleLevel === level ? 'level selected' : 'level'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, circleLevel: level } }))}>
                        <span>{title}</span><small>{description}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button type="button" className="primary-button" disabled={!settings.triad.qualities.length || starting} onClick={() => void beginSession(kind)}>
                  {starting ? '正在准备钢琴音源…' : '开始 10 题练习'}
                </button>
              </>
            )}
            {notice && <p className="notice" role="alert">{notice}</p>}
          </section>
        )}

        {view === 'quiz' && question && (
          <section className="quiz-view">
            <div className="quiz-header">
              <button type="button" className="back-button" onClick={exitSession}>× 结束</button>
              <div className="progress-wrap">
              <div className="progress-copy"><span>{KIND_NAMES[question.kind]}</span><strong>{questionIndex + 1} / {questions.length}</strong></div>
                <div className="progress-track"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
              </div>
              <div className="score-pill">答对 {correctCount}</div>
            </div>

            <article className={`question-card ${feedback ? feedback.correct ? 'feedback-correct' : 'feedback-wrong' : ''}`}>
              {question.kind === 'interval' && <IntervalExercise question={question} settings={settings} feedback={feedback} preview={intervalPreview} onAnswer={answerInterval} onExplore={(option) => void exploreInterval(option)} onPlay={() => void playQuestion()} onPlaybackChange={(playback) => setSettings((current) => ({ ...current, interval: { ...current.interval, playback } }))} />}

              {question.kind === 'triad-fill' && (
                <>
                  <QuestionHeading eyebrow="INVERSION SPELLING" title={`${question.triad.label}（${question.triad.symbol}）`} subtitle="听一遍原位或转位，按实际低到高填写三个音名。" />
                  <button type="button" className="play-button" onClick={() => void playQuestion()}>▶ 从低到高重播</button>
                  {feedback && <Staff notes={question.notes} label={`${question.triad.label}${INVERSION_TEXT[question.inversion]}谱面`} />}
                  <NoteKeyboard values={noteValues} correctValues={feedback ? question.answers : undefined} activeIndex={activeSlot} disabled={Boolean(feedback)} onActiveIndexChange={setActiveSlot} onChange={setNoteValues} onValuePlay={feedback ? (value, index) => void playFilledNote(value, index) : undefined} />
                  {feedback && <p className="note-play-hint">点击上方已填写的音名，可逐个试听。</p>}
                  {!feedback && <button type="button" className="submit-button" disabled={noteValues.some((value) => !value)} onClick={submitNotes}>提交三个音名</button>}
                </>
              )}

              {question.kind === 'chord-tone' && (
                <>
                  <QuestionHeading eyebrow="CHORD MEMBER" title={`${question.triad.label}（${question.triad.symbol}）`} subtitle={`这个和弦的${question.target === 'third' ? '三音' : '五音'}是什么？`} />
                  <button type="button" className="play-button" onClick={() => void playQuestion()}>▶ 重播原位和弦</button>
                  {feedback && <Staff notes={question.notes} targetIndex={question.targetIndex} label={`${question.triad.label}原位谱面，目标音已高亮`} />}
                  <NoteKeyboard values={noteValues} correctValues={feedback ? [question.answer] : undefined} activeIndex={0} disabled={Boolean(feedback)} onActiveIndexChange={setActiveSlot} onChange={setNoteValues} />
                  {!feedback && <button type="button" className="submit-button" disabled={!noteValues[0]} onClick={submitNotes}>提交音名</button>}
                </>
              )}

              {feedback && <FeedbackPanel question={question} feedback={feedback} onReplay={() => void playQuestion()} onNext={nextQuestion} isLast={questionIndex + 1 === questions.length} />}
            </article>
          </section>
        )}

        {view === 'summary' && (
          <section className="summary-view panel">
            <div className="summary-ring" style={{ '--score': `${questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%` } as React.CSSProperties}>
              <strong>{questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%</strong>
              <span>正确率</span>
            </div>
            <div className="eyebrow">SESSION COMPLETE</div>
            <h1>这一轮完成了</h1>
            <p>{correctCount} / {questions.length} 题正确 · 用时 {elapsedSeconds} 秒 · {sessionMistakes.length} 类错题</p>
            <div className="summary-actions">
              <button type="button" className="primary-button" onClick={() => void beginSession(kind)}>再来 10 题</button>
              {sessionMistakes.length > 0 && <button type="button" className="secondary-button" onClick={() => void beginSession(kind, sessionMistakes)}>只练本轮错题</button>}
              <button type="button" className="text-button" onClick={exitSession}>返回首页</button>
            </div>
          </section>
        )}

        {view === 'wrongs' && (
          <section className="wrong-view panel">
            <button type="button" className="back-button" onClick={() => setView('home')}>← 返回首页</button>
            <div className="eyebrow">REVIEW</div>
            <h1>错题复习</h1>
            <div className="chip-row">
              {(['all', 'interval', 'triad-fill', 'chord-tone'] as const).map((filter) => (
                <button type="button" key={filter} className={wrongFilter === filter ? 'chip selected' : 'chip'} onClick={() => setWrongFilter(filter)}>
                  {filter === 'all' ? '全部' : KIND_NAMES[filter]}
                </button>
              ))}
            </div>
            {filteredWrongItems.length ? (
              <>
                <div className="wrong-list">
                  {filteredWrongItems.map((item) => (
                    <div className="wrong-row" key={item.key}>
                      <span className="wrong-kind">{KIND_NAMES[item.kind]}</span>
                      <strong>{questionSummary(item.question)}</strong>
                      <small>累计答错 {item.wrongCount} 次</small>
                    </div>
                  ))}
                </div>
                <button type="button" className="primary-button" disabled={starting} onClick={() => void beginSession(filteredWrongItems[0].kind, filteredWrongItems.slice(0, 10).map((item) => item.question))}>
                  {starting ? '正在准备音源…' : `复习这 ${Math.min(10, filteredWrongItems.length)} 题`}
                </button>
              </>
            ) : <div className="empty-state"><span>✓</span><h2>这里暂时没有错题</h2><p>答错的题目会自动按练习类型收集在这里。</p></div>}
          </section>
        )}
      </main>

      <footer>所有练习数据仅保存在当前设备 · Salamander Grand Piano · CC BY 3.0</footer>
    </div>
  )
}

function QuestionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="question-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>
}

function IntervalExercise({
  question,
  settings,
  feedback,
  preview,
  onAnswer,
  onExplore,
  onPlay,
  onPlaybackChange,
}: {
  question: IntervalQuestion
  settings: AppSettings
  feedback: AnswerFeedback | null
  preview: IntervalPreview | null
  onAnswer: (answer: string) => void
  onExplore: (option: IntervalIdentity) => void
  onPlay: () => void
  onPlaybackChange: (mode: 'melodic' | 'harmonic') => void
}) {
  return (
    <>
      <QuestionHeading eyebrow="INTERVAL READING" title={`${visibleNoteName(question.lower, settings.showOctaves)} — ${visibleNoteName(question.upper, settings.showOctaves)}`} subtitle="观察音名和谱面，选择它们构成的完整音程。" />
      <Staff notes={[question.lower, question.upper]} label={`${visibleNoteName(question.lower, settings.showOctaves)} 与 ${visibleNoteName(question.upper, settings.showOctaves)} 的高音谱表`} />
      <div className="play-controls">
        <button type="button" className="play-button" onClick={onPlay}>▶ 重新播放</button>
        <div className="segmented compact">
          <button type="button" className={settings.interval.playback === 'melodic' ? 'selected' : ''} onClick={() => onPlaybackChange('melodic')}>♪ 旋律</button>
          <button type="button" className={settings.interval.playback === 'harmonic' ? 'selected' : ''} onClick={() => onPlaybackChange('harmonic')}>♬ 和声</button>
        </div>
      </div>
      <div className="answer-grid">
        {question.options.map((option) => {
          const state = !feedback ? '' : option.label === question.answer.label ? 'correct' : option.label === feedback.selected ? 'wrong' : 'muted'
          return <button type="button" key={option.label} className={`answer-option ${state} ${preview?.option.label === option.label ? 'exploring' : ''}`} onClick={() => feedback ? onExplore(option) : onAnswer(option.label)}>{option.label}</button>
        })}
      </div>
      {feedback && (
        <div className="interval-preview" aria-live="polite">
          {preview
            ? <><strong>{preview.option.label}</strong><span>{visibleNoteName(preview.notes[0], settings.showOctaves)}–{visibleNoteName(preview.notes[1], settings.showOctaves)}</span><small>正在按当前播放模式试听</small></>
            : <span>点击任一音程选项，可查看一组音名并试听。</span>}
        </div>
      )}
    </>
  )
}

function FeedbackPanel({ question, feedback, onReplay, onNext, isLast }: { question: PracticeQuestion; feedback: AnswerFeedback; onReplay: () => void; onNext: () => void; isLast: boolean }) {
  let explanation = ''
  if (question.kind === 'interval') {
    explanation = `${question.lower.letter} 到 ${question.upper.letter} 数 ${question.answer.degree} 度；两个音实际相隔 ${question.answer.semitones} 个半音，所以是${question.answer.label}。`
  } else if (question.kind === 'triad-fill') {
    explanation = `根音、三音、五音是 ${question.triad.tones.map(pitchName).join('–')}（以根音为 Do：${triadSolfege(question.triad.quality)}）；本题为${INVERSION_TEXT[question.inversion]}，低到高是 ${question.answers.join('–')}（${triadSolfege(question.triad.quality, question.inversion)}）。`
  } else {
    const solfege = triadSolfege(question.triad.quality).split('–')
    explanation = `${triadFormula(question.triad.quality)}；以根音为 Do：${solfege.join('–')}；${question.target === 'third' ? '三音' : '五音'}是 ${question.answer}（${solfege[question.targetIndex]}）。`
  }
  return (
    <div className={`feedback-panel ${feedback.correct ? 'correct' : 'wrong'}`} role="status">
      <div className="feedback-title"><span>{feedback.correct ? '✓' : '!'}</span><strong>{feedback.correct ? '答对了' : '再看一步'}</strong></div>
      {feedback.enharmonic && <p className="enharmonic-note">音高相同，但和弦内的音名拼写不正确。</p>}
      <p>{explanation}</p>
      <div className="feedback-actions">
        <button type="button" className="secondary-button" onClick={onReplay}>▶ 再听一次</button>
        <button type="button" className="primary-button" onClick={onNext}>{isLast ? '查看本轮结果' : '下一题 →'}</button>
      </div>
    </div>
  )
}

export default App
