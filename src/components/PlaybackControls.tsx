import type { ReactNode } from 'react'
import type { InstrumentId } from '../domain/types'
import type { AudioSource } from '../services/audio'

export function PlayWithInstrument({ label, onPlay, children }: { label: string; onPlay: () => void; children?: ReactNode }) {
  return <div className="play-controls"><button type="button" className="play-button" onClick={onPlay}>{label}</button>{children}</div>
}

export function GlobalInstrumentSwitch({ instrument, source, onChange }: { instrument: InstrumentId; source: AudioSource | null; onChange: (instrument: InstrumentId) => void }) {
  const next: InstrumentId = instrument === 'piano' ? 'nylon-guitar' : 'piano'
  const currentName = instrument === 'piano' ? '钢琴' : '古典吉他'
  const nextName = next === 'piano' ? '钢琴' : '古典吉他'
  const fallback = source === 'synth'
  return <button
    type="button"
    className={`instrument-toggle${fallback ? ' fallback' : ''}`}
    aria-label={`当前音色：${currentName}；点击切换为${nextName}${fallback ? '；当前使用备用合成音' : ''}`}
    title={`点击切换为${nextName}`}
    onClick={() => onChange(next)}
  >
    <img className="instrument-glyph" src={instrument === 'piano' ? '/Intervals/images/ui-icons/piano.png' : '/Intervals/images/ui-icons/guitar.png'} alt="" />
    <span className="instrument-copy"><small>INSTRUMENT</small><strong>{currentName}</strong></span>
    {fallback && <small>备用</small>}
  </button>
}
