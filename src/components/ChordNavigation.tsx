import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { AppSettings, PracticeKind, SeventhChordQuality, TriadQuality } from '../domain/types'
import { Drop2Icon } from './ChordIcons'
import { PitchName } from './MusicText'

const TRIAD_QUALITY_NAMES: Record<TriadQuality, string> = {
  major: '大三和弦', minor: '小三和弦', diminished: '减三和弦',
}

const SEVENTH_QUALITY_NAMES: Record<Exclude<SeventhChordQuality, 'half-diminished7'>, string> = {
  major7: '大七和弦', minor7: '小七和弦', dominant7: '属七和弦',
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function PitchList({ values }: { values: string[] }) {
  return <>{values.map((value, index) => <span key={value}>{index > 0 && '、'}<PitchName value={value} /></span>)}</>
}

function NavigationShell({ eyebrow, title, backLabel, onBack, children }: { eyebrow: string; title: string; backLabel: string; onBack: () => void; children: ReactNode }) {
  return <section className="panel navigation-panel"><button type="button" className="back-button" onClick={onBack}>← {backLabel}</button><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><div className="submodule-grid">{children}</div></section>
}

export function ChordFamilyView({ onBack, onChoose }: { onBack: () => void; onChoose: (family: 'triad' | 'seventh') => void }) {
  return <NavigationShell eyebrow="CHORDS" title="选择和弦练习" backLabel="返回首页" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('triad')}><span>3</span><strong>三和弦</strong><small>练习音名、排列和指定成员音</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('seventh')}><span>7</span><strong>七和弦</strong><small>练习 Shell 和 Drop 2 排列</small></button>
  </NavigationShell>
}

export function TriadPracticeView({ onBack, onChoose }: { onBack: () => void; onChoose: (kind: 'triad-fill' | 'spread-triad-fill' | 'chord-tone') => void }) {
  return <NavigationShell eyebrow="TRIADS" title="选择三和弦练习" backLabel="返回和弦练习" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('triad-fill')}><span>●</span><strong>密集排列（Closed）</strong><small>听原位与转位，从低到高写出音名</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('spread-triad-fill')}><span>↕</span><strong>开放排列（Spread）</strong><small>听 R–5–3 等排列，从低到高写出音名</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('chord-tone')}><span>3·5</span><strong>三音和五音</strong><small>听原位密集排列，写出指定音</small></button>
  </NavigationShell>
}

export function SeventhPracticeView({ onBack, onChoose }: { onBack: () => void; onChoose: (kind: 'shell-voicing' | 'drop2-voicing') => void }) {
  return <NavigationShell eyebrow="SEVENTH CHORDS" title="选择七和弦排列练习" backLabel="返回和弦练习" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('shell-voicing')}><span>R7</span><strong>Shell（根、三、七）</strong><small>判断低到高是根–三–七还是根–七–三</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('drop2-voicing')}><Drop2Icon /><strong>Drop 2</strong><small>判断四种由低到高的成员顺序</small></button>
  </NavigationShell>
}

export function ChordSetup({ kind, settings, setSettings, starting, notice, onBack, onStart }: { kind: Extract<PracticeKind, 'triad-fill' | 'spread-triad-fill' | 'chord-tone' | 'drop2-voicing' | 'shell-voicing'>; settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  const triadMode = kind === 'triad-fill' || kind === 'spread-triad-fill' || kind === 'chord-tone'
  const titles: Record<typeof kind, string> = {
    'triad-fill': '设置密集排列（Closed）',
    'spread-triad-fill': '设置开放排列（Spread）',
    'chord-tone': '设置三音和五音',
    'drop2-voicing': '设置 Drop 2',
    'shell-voicing': '设置 Shell',
  }
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回{triadMode ? '三和弦练习' : '七和弦排列练习'}</button><div className="eyebrow">CHORDS</div><h1>{titles[kind]}</h1>
    {kind === 'triad-fill' && <p className="setup-copy">每题播放原位、第一转位或第二转位；从低到高写出三个音名。</p>}
    {kind === 'spread-triad-fill' && <p className="setup-copy">每题播放 R–5–3、3–R–5 或 5–3–R；从低到高写出三个音名。</p>}
    {kind === 'chord-tone' && <p className="setup-copy">听原位密集排列，写出指定的三音或五音。</p>}
    {triadMode ? <>
      <fieldset><legend>和弦类型 <small>可多选</small></legend><div className="chip-row">{(['major', 'minor', 'diminished'] as TriadQuality[]).map((quality) => <button type="button" key={quality} className={settings.triad.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, qualities: toggleValue(current.triad.qualities, quality) } }))}>{TRIAD_QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <fieldset><legend>题目音名范围</legend><p className="setup-copy">选择题目可能出现的和弦音名，不会限定调性。</p><div className="level-list">{([[1, '常用', <>来自 <PitchList values={['C', 'G', 'F']} /> 大调的三和弦</>], [2, '扩展', <>再加入 <PitchList values={['D', 'B♭', 'A', 'E♭']} /> 大调</>], [3, '全部', <>来自全部大调的三和弦</>]] as const).map(([level, title, description]) => <button type="button" key={level} className={settings.triad.spellingLevel === level ? 'level selected' : 'level'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, spellingLevel: level } }))}><span>{title}</span><small>{description}</small></button>)}</div></fieldset>
    </> : <>
      <fieldset><legend>七和弦类型 <small>可多选</small></legend><div className="chip-row">{(['major7', 'minor7', 'dominant7'] as const).map((quality) => <button type="button" key={quality} className={settings.seventh.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, seventh: { ...current.seventh, qualities: toggleValue(current.seventh.qualities, quality) } }))}>{SEVENTH_QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <p className="setup-copy seventh-root-copy">题目使用 12 个常见根音，并覆盖每种排列。</p>
    </>}
    <button type="button" className="primary-button" disabled={(triadMode ? !settings.triad.qualities.length : !settings.seventh.qualities.length) || starting} onClick={onStart}>{starting ? '正在准备音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}
