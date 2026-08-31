import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTriadFillQuestion } from './domain/questions'
import App from './App'
import appStyles from './App.css?raw'
import { DEFAULT_SETTINGS } from './services/storage'

const audio = vi.hoisted(() => ({
  initializeAudio: vi.fn(async () => 'piano' as const),
  playCadenceThenTone: vi.fn(async () => 'piano' as const),
  playChordThenTone: vi.fn(async () => 'piano' as const),
  playImmediateNote: vi.fn(async () => 'piano' as const),
  playNotes: vi.fn(async () => 'piano' as const),
  playProgression: vi.fn(async () => 'piano' as const),
  stopAudio: vi.fn(),
}))

vi.mock('./services/audio', () => audio)
vi.mock('./components/Staff', () => ({
  MusicScore: ({ label, score, onNoteClick }: {
    label: string
    score: { measures: Array<{ events: Array<{ notes: Array<{ accidental: number; displayName: string; letter: string; midi: number; octave: number }> }> }> }
    onNoteClick?: (note: { accidental: number; displayName: string; letter: string; midi: number; octave: number }) => void
  }) => <>
    <div role="img" aria-label={label} />
    {onNoteClick && score.measures.flatMap((measure) => measure.events).flatMap((event) => event.notes).map((note, index) => (
      <button type="button" aria-label={`播放 ${note.displayName}`} key={`${note.displayName}-${index}`} onClick={() => onNoteClick(note)} />
    ))}
  </>,
}))

async function startClosedTriad() {
  fireEvent.click(screen.getByRole('button', { name: /^02.*和弦.*选择练习/ }))
  fireEvent.click(screen.getByRole('button', { name: /三和弦/ }))
  fireEvent.click(screen.getByRole('button', { name: /密集排列（Closed）/ }))
  fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
  await screen.findByRole('button', { name: '× 结束' })
  await waitFor(() => expect(screen.getByRole('button', { name: /第 1 个音/ })).toHaveFocus())
}

describe('App quiz navigation and triad playback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    vi.spyOn(window.history, 'go').mockImplementation(() => {})
    vi.spyOn(window.history, 'forward').mockImplementation(() => {})
    window.scrollTo = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  it('caps the desktop editorial scale without changing the mobile hero proportions', () => {
    expect(appStyles).toMatch(/\.editorial-home\s*{[^}]*max-width:\s*1520px/)
    expect(appStyles).toMatch(/\.home-masthead-wordmark\s*{[^}]*font-size:\s*clamp\(64px, 8\.8vw, 138px\)/)
    expect(appStyles).toMatch(/\.home-feature > picture > img\s*{[^}]*aspect-ratio:\s*16 \/ 9/)

    const mobileStyles = appStyles.slice(appStyles.indexOf('@media (max-width: 700px)'))
    expect(mobileStyles).toMatch(/\.home-masthead-wordmark\s*{[^}]*font-size:\s*var\(--masthead-fill-size, 13\.8vw\)/)
    expect(mobileStyles).toMatch(/\.home-feature > picture > img\s*{[^}]*aspect-ratio:\s*3 \/ 4/)
    expect(mobileStyles).toMatch(/\.home-feature-copy h1\s*{[^}]*font-size:\s*46px/)
  })

  it('keeps the selected left masthead and exposes the brand wordmark on nested views', async () => {
    localStorage.setItem('intervals.mobileMastheadWidthPreview', 'full')
    render(<App />)
    const masthead = document.querySelector('.home-masthead-panel')
    expect(masthead).toHaveAttribute('aria-hidden', 'false')
    expect(masthead?.querySelector('.home-masthead-wordmark:not(.home-masthead-wordmark-white)')).toHaveTextContent('INTERVALS')
    expect(masthead?.querySelector('.home-masthead-wordmark-white')).toHaveTextContent('INTERVALS')
    expect(screen.getByRole('button', { name: '收起首页字标' })).toBeInTheDocument()
    expect(document.querySelector('.masthead-width-picker')).not.toBeInTheDocument()
    expect(document.querySelector('.topbar')).toHaveClass('topbar-home')
    expect(document.querySelector('.brand-copy strong')).toHaveTextContent('INTERVALS')
    await waitFor(() => expect(localStorage.getItem('intervals.mobileMastheadWidthPreview')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /^01.*音程.*开始设置/ }))
    expect(document.querySelector('.topbar')).toHaveClass('topbar-inner')
    expect(document.querySelector('.brand-copy strong')).toHaveTextContent('INTERVALS')
    expect(document.querySelector('.brand-copy small')).toHaveTextContent('EAR TRAINING')
  })

  it('keeps the original immediate mobile masthead response', () => {
    const stubMatchMedia = (matches: boolean) => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({
          matches: query === '(max-width: 700px)' ? matches : false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: () => true,
        }),
      })
    }
    const setScrollY = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
    const panel = () => document.querySelector('.home-masthead-panel')

    const cleanupWindow = () => {
      delete (window as Partial<Window & { matchMedia?: Window['matchMedia'] }>).matchMedia
      delete (window as { scrollY?: number }).scrollY
    }
    stubMatchMedia(true)
    render(<App />)
    // jsdom 几何为 0，初次判定直接收起
    expect(panel()).toHaveClass('collapsed')

    // 保留原始手感：进入顶部阈值的同一个滚动事件立即展开
    setScrollY(30)
    window.dispatchEvent(new Event('scroll'))
    expect(panel()).not.toHaveClass('collapsed')

    // 离开顶部阈值后也立即收起
    setScrollY(600)
    window.dispatchEvent(new Event('scroll'))
    expect(panel()).toHaveClass('collapsed')

    // 快速上滑再回滑时，状态始终跟随最后一个滚动位置
    setScrollY(30)
    window.dispatchEvent(new Event('scroll'))
    expect(panel()).not.toHaveClass('collapsed')
    setScrollY(600)
    window.dispatchEvent(new Event('scroll'))
    expect(panel()).toHaveClass('collapsed')

    cleanupWindow()
  })

  it('uses mobile browser history to return through navigation screens', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^02.*和弦.*选择练习/ }))
    const chordFamilyState = window.history.state
    fireEvent.click(screen.getByRole('button', { name: /三和弦/ }))
    expect(screen.getByRole('heading', { name: '选择三和弦练习' })).toBeInTheDocument()

    fireEvent.popState(window, { state: chordFamilyState })

    expect(screen.getByRole('heading', { name: '选择和弦练习' })).toBeInTheDocument()
  })

  it('blocks the mobile browser back action during a quiz but keeps the manual exit available', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /开始设置/ }))
    const setupState = window.history.state
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    const quizState = window.history.state

    fireEvent.popState(window, { state: setupState })

    expect(window.history.forward).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '× 结束' })).toBeInTheDocument()
    fireEvent.popState(window, { state: quizState })
    fireEvent.click(screen.getByRole('button', { name: '× 结束' }))
    expect(screen.getByRole('heading', { name: '听见关系' })).toBeInTheDocument()
  })

  it('returns a triad quiz to triad choices and immediately replays an actual mode change', async () => {
    render(<App />)
    await startClosedTriad()
    const triadHeading = document.querySelector('.question-heading h1')
    expect(triadHeading?.querySelector('.chord-symbol')).not.toBeNull()
    expect(triadHeading).not.toHaveTextContent('三和弦')
    expect(triadHeading).not.toHaveTextContent('（')
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalled())
    audio.playNotes.mockClear()

    fireEvent.click(screen.getByRole('button', { name: '旋律' }))
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalledWith(expect.any(Array), 'melodic', 'piano'))
    audio.playNotes.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '旋律' }))
    expect(audio.playNotes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /重播当前排列/ }))
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalledWith(expect.any(Array), 'melodic', 'piano'))

    const stopCount = audio.stopAudio.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '× 结束' }))
    expect(await screen.findByRole('heading', { name: '选择三和弦练习' })).toBeInTheDocument()
    expect(audio.stopAudio).toHaveBeenCalledTimes(stopCount + 1)
  })

  it('switches the global topbar instrument and replays the current quiz with the new source', async () => {
    render(<App />)
    expect(screen.queryByRole('group', { name: '播放音色' })).not.toBeInTheDocument()
    await startClosedTriad()
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalled())
    audio.playNotes.mockClear()
    const switcher = screen.getByRole('button', { name: /当前音色：钢琴；点击切换为古典吉他/ })
    fireEvent.click(switcher)
    expect(screen.getByRole('button', { name: /当前音色：古典吉他；点击切换为钢琴/ })).toBeInTheDocument()
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalledWith(expect.any(Array), 'harmonic', 'nylon-guitar'))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('interval-trainer:settings:v4') ?? '{}').instrument).toBe('nylon-guitar'))
  })

  it('uses arrow keys and Enter to answer an interval while the option grid is focused', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /开始设置/ }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    const options = [...document.querySelectorAll<HTMLButtonElement>('.answer-option')]
    expect(options.length).toBeGreaterThan(1)
    expect(options[0]).toHaveFocus()
    fireEvent.keyDown(options[0], { key: 'ArrowRight' })
    expect(options[1]).toHaveFocus()
    fireEvent.keyDown(options[1], { key: 'Enter' })
    const feedback = await screen.findByRole('status')
    expect(feedback).toHaveFocus()
    expect(screen.getByRole('button', { name: /再听一次/ })).not.toHaveFocus()
    expect(screen.getByRole('button', { name: /下一题/ })).not.toHaveFocus()

    audio.playNotes.mockClear()
    fireEvent.keyDown(feedback, { key: ' ' })
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalled())
    fireEvent.keyDown(feedback, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('2 / 10')).toBeInTheDocument())
  })

  it('plays the clicked interval staff note immediately with the selected instrument', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /开始设置/ }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalled())
    const noteButton = (await screen.findAllByRole('button', { name: /^播放 [A-G]/ }))[0]
    const displayName = noteButton.getAttribute('aria-label')?.replace('播放 ', '')
    vi.clearAllMocks()

    fireEvent.click(noteButton)

    await waitFor(() => expect(audio.playImmediateNote).toHaveBeenCalledWith(
      expect.objectContaining({ displayName }),
      'piano',
    ))
    expect(audio.stopAudio).not.toHaveBeenCalled()
  })

  it('accepts number and Enter hotkeys for a reverse scale-degree answer', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^03.*调.*选择练习/ }))
    fireEvent.click(screen.getByRole('button', { name: /音名与音级/ }))
    fireEvent.click(screen.getByRole('button', { name: '音名 → 音级' }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    const slot = await waitFor(() => {
      const element = document.querySelector<HTMLButtonElement>('.degree-slots button')
      expect(element).not.toBeNull()
      return element!
    })
    expect(slot).toHaveFocus()
    fireEvent.keyDown(slot, { key: '4' })
    expect(slot).toHaveTextContent('4级')
    fireEvent.keyDown(slot, { key: 'Enter' })
    expect(await screen.findByRole('status')).toBeInTheDocument()

    const submitted = slot.textContent
    audio.playNotes.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '试听第 3 级' }))
    await waitFor(() => expect(audio.playNotes).toHaveBeenCalledWith([expect.objectContaining({ midi: expect.any(Number) })], 'harmonic', 'piano'))
    expect(screen.getByRole('button', { name: '试听第 3 级' })).toHaveClass('exploring')
    expect(slot).toHaveTextContent(submitted ?? '')
  })

  it('uses number hotkeys for progression quality and submits a complete four-cell answer with Enter', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^03.*调.*选择练习/ }))
    fireEvent.click(screen.getByRole('button', { name: /和弦进行与级数/ }))
    fireEvent.click(screen.getByRole('button', { name: '音级 → 音名' }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    const firstCell = await waitFor(() => {
      const element = document.querySelector<HTMLButtonElement>('.progression-cell')
      expect(element).not.toBeNull()
      return element!
    })
    expect(firstCell).toHaveFocus()
    fireEvent.keyDown(firstCell, { key: '2' })
    expect(screen.getByRole('button', { name: /小三和弦/ })).toHaveClass('selected')
    for (const [index, letter] of ['C', 'D', 'E', 'F'].entries()) {
      fireEvent.keyDown(window, { key: letter })
      if (index < 3) fireEvent.keyDown(window, { key: 'ArrowRight' })
    }
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('keeps playback controls on the quiz and removes the duplicate interval setup control', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /开始设置/ }))
    expect(screen.queryByText('默认播放')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    await screen.findByRole('button', { name: '× 结束' })
    expect(screen.getByRole('button', { name: '旋律' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '和声' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C4' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /音名 C4/ })).not.toBeInTheDocument()
  })

  it('returns an ended review quiz to the wrong-answer page', async () => {
    const question = createTriadFillQuestion(DEFAULT_SETTINGS.triad, () => 0.25)
    localStorage.setItem('interval-trainer:wrong:v3', JSON.stringify([{
      key: 'review-triad',
      kind: question.kind,
      question,
      wrongCount: 1,
      lastWrongAt: 1,
    }]))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /错题 1/ }))
    fireEvent.click(screen.getByRole('button', { name: '复习这 1 道题' }))
    await screen.findByRole('button', { name: '× 结束' })
    fireEvent.click(screen.getByRole('button', { name: '× 结束' }))
    expect(await screen.findByRole('heading', { name: '错题复习' })).toBeInTheDocument()
  })

  it('shows the V–I cadence and target note together on the scale-degree staff', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^03.*调.*选择练习/ }))
    fireEvent.click(screen.getByRole('button', { name: /音名与音级/ }))
    fireEvent.click(screen.getByRole('button', { name: '音级 → 音名' }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    expect(await screen.findByRole('img', { name: '五级、一级与目标单音五线谱' })).toBeInTheDocument()
    const noteButton = (await screen.findAllByRole('button', { name: /^播放 [A-G]/ }))[0]
    const displayName = noteButton.getAttribute('aria-label')?.replace('播放 ', '')
    vi.clearAllMocks()

    fireEvent.click(noteButton)

    await waitFor(() => expect(audio.playImmediateNote).toHaveBeenCalledWith(
      expect.objectContaining({ displayName }),
      'piano',
    ))
  })

  it('shows all four played voicings on the progression staff', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^03.*调.*选择练习/ }))
    fireEvent.click(screen.getByRole('button', { name: /和弦进行与级数/ }))
    fireEvent.click(screen.getByRole('button', { name: '音级 → 音名' }))
    fireEvent.click(screen.getByRole('button', { name: /开始 10 题练习/ }))
    expect(await screen.findByRole('img', { name: '四小节和弦进行五线谱' })).toBeInTheDocument()
    const noteButton = (await screen.findAllByRole('button', { name: /^播放 [A-G]/ }))[0]
    const displayName = noteButton.getAttribute('aria-label')?.replace('播放 ', '')
    vi.clearAllMocks()

    fireEvent.click(noteButton)

    await waitFor(() => expect(audio.playImmediateNote).toHaveBeenCalledWith(
      expect.objectContaining({ displayName }),
      'piano',
    ))
  })
})
