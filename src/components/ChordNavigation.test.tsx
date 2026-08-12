import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/storage'
import { TriadStackIcon } from './ChordIcons'
import { ChordFamilyView, ChordSetup, SeventhPracticeView, TriadPracticeView } from './ChordNavigation'

describe('chord navigation', () => {
  it('uses the requested family and triad hierarchy', () => {
    const chooseFamily = vi.fn()
    const { rerender } = render(<ChordFamilyView onBack={vi.fn()} onChoose={chooseFamily} />)
    fireEvent.click(screen.getByRole('button', { name: /三和弦/ }))
    expect(chooseFamily).toHaveBeenCalledWith('triad')

    const choosePractice = vi.fn()
    rerender(<TriadPracticeView onBack={vi.fn()} onChoose={choosePractice} />)
    expect(screen.getByRole('button', { name: /密集排列（Closed）/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开放排列/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /三音和五音/ })).toBeInTheDocument()
    expect(document.querySelectorAll('.submodule-card')[0]).toHaveTextContent('三音和五音')
    fireEvent.click(screen.getByRole('button', { name: /开放排列/ }))
    expect(choosePractice).toHaveBeenCalledWith('spread-triad-fill')
  })

  it('shows Shell and Drop 2 cards without a seventh-chord corner badge', () => {
    render(<SeventhPracticeView onBack={vi.fn()} onChoose={vi.fn()} />)
    const shell = screen.getByRole('button', { name: /Shell（根、三、七）/ })
    const drop2 = screen.getByRole('button', { name: /Drop 2判断/ })
    expect(within(shell).queryByText('七和弦')).not.toBeInTheDocument()
    expect(within(drop2).queryByText('七和弦')).not.toBeInTheDocument()
    expect(within(drop2).queryByText('D2')).not.toBeInTheDocument()
    const icon = within(drop2).getByRole('img', { name: 'Drop 2：将第二高音下移八度' })
    expect(icon).toBeInTheDocument()
    const sourceY = Number(icon.querySelector('.drop2-source')?.getAttribute('cy'))
    const targetY = Number(icon.querySelector('.drop2-target')?.getAttribute('cy'))
    expect(sourceY).toBe(16)
    expect(targetY).toBe(44)
    expect(targetY - sourceY).toBe(28)
  })

  it('uses an accessible micro-staff icon for the home chord card', () => {
    render(<TriadStackIcon />)
    const icon = screen.getByRole('img', { name: '三和弦叠置谱面' })
    expect(icon).toHaveAttribute('viewBox', '0 0 58 58')
    const pitches = ['.triad-root', '.triad-third', '.triad-fifth'].map((selector) => Number(icon.querySelector(selector)?.getAttribute('cy')))
    expect(pitches).toEqual([41, 33, 25])
  })

  it('keeps each triad setup independent while sharing quality and spelling controls', () => {
    const props = {
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn(),
      starting: false,
      notice: '',
      onBack: vi.fn(),
      onStart: vi.fn(),
    }
    const { rerender } = render(<ChordSetup {...props} kind="spread-triad-fill" />)
    expect(screen.getByText('设置开放排列（Spread）')).toBeInTheDocument()
    expect(screen.getByText('和弦类型')).toBeInTheDocument()
    expect(screen.getByText('题目音名范围')).toBeInTheDocument()
    expect(screen.queryByText('成员排列')).not.toBeInTheDocument()

    rerender(<ChordSetup {...props} kind="chord-tone" />)
    expect(screen.getByText(/听原位密集排列/)).toBeInTheDocument()
    expect(screen.queryByText('密集排列（Closed）', { selector: 'button' })).not.toBeInTheDocument()

    rerender(<ChordSetup {...props} kind="drop2-voicing" />)
    expect(screen.queryByText('默认播放')).not.toBeInTheDocument()
  })
})
