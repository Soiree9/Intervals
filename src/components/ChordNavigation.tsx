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
  return <NavigationShell eyebrow="CHORDS" title="选择和弦家族" backLabel="返回首页" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('triad')}><span>3</span><strong>三和弦</strong><small>Closed、Spread 与三音·五音</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('seventh')}><span>7</span><strong>七和弦</strong><small>Shell Voicing 与 Drop 2 Voicing</small></button>
  </NavigationShell>
}

export function TriadPracticeView({ onBack, onChoose }: { onBack: () => void; onChoose: (kind: 'triad-fill' | 'spread-triad-fill' | 'chord-tone') => void }) {
  return <NavigationShell eyebrow="TRIADS" title="选择三和弦测验" backLabel="返回和弦家族" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('triad-fill')}><span>●</span><strong>Closed Triad</strong><small>随机播放原位与两个转位，填写实际音名</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('spread-triad-fill')}><span>↕</span><strong>Spread Triad</strong><small>随机播放 R–5–3、3–R–5、5–3–R，填写实际音名</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('chord-tone')}><span>3·5</span><strong>三音·五音</strong><small>听 Closed 原位和弦，写出指定的成员音</small></button>
  </NavigationShell>
}

export function SeventhPracticeView({ onBack, onChoose }: { onBack: () => void; onChoose: (kind: 'shell-voicing' | 'drop2-voicing') => void }) {
  return <NavigationShell eyebrow="SEVENTH CHORDS" title="选择七和弦 Voicing" backLabel="返回和弦家族" onBack={onBack}>
    <button type="button" className="submodule-card" onClick={() => onChoose('shell-voicing')}><span>R7</span><strong>Shell Voicing</strong><small>听辨 R37 与 R73</small></button>
    <button type="button" className="submodule-card" onClick={() => onChoose('drop2-voicing')}><Drop2Icon /><strong>Drop 2 Voicing</strong><small>听辨四种 Drop 2 排列</small></button>
  </NavigationShell>
}

export function ChordSetup({ kind, settings, setSettings, starting, notice, onBack, onStart }: { kind: Extract<PracticeKind, 'triad-fill' | 'spread-triad-fill' | 'chord-tone' | 'drop2-voicing' | 'shell-voicing'>; settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>; starting: boolean; notice: string; onBack: () => void; onStart: () => void }) {
  const triadMode = kind === 'triad-fill' || kind === 'spread-triad-fill' || kind === 'chord-tone'
  const titles: Record<typeof kind, string> = {
    'triad-fill': '设置 Closed Triad',
    'spread-triad-fill': '设置 Spread Triad',
    'chord-tone': '设置三音·五音',
    'drop2-voicing': '设置 Drop 2 Voicing',
    'shell-voicing': '设置 Shell Voicing',
  }
  return <section className="setup-view panel"><button type="button" className="back-button" onClick={onBack}>← 返回{triadMode ? '三和弦测验' : '七和弦 Voicing'}</button><div className="eyebrow">CHORDS</div><h1>{titles[kind]}</h1>
    {kind === 'triad-fill' && <p className="setup-copy">每题随机播放原位、第一转位或第二转位，按实际低到高填写三个音名。</p>}
    {kind === 'spread-triad-fill' && <p className="setup-copy">每题随机播放 R–5–3、3–R–5 或 5–3–R，按实际低到高填写三个音名。</p>}
    {kind === 'chord-tone' && <p className="setup-copy">固定播放 Closed 原位，每题随机考这个和弦的三音或五音。</p>}
    {triadMode ? <>
      <fieldset><legend>和弦性质 <small>可多选</small></legend><div className="chip-row">{(['major', 'minor', 'diminished'] as TriadQuality[]).map((quality) => <button type="button" key={quality} className={settings.triad.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, qualities: toggleValue(current.triad.qualities, quality) } }))}>{TRIAD_QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <fieldset><legend>和弦音名范围</legend><p className="setup-copy">此设置只控制可能出现的和弦拼写，不代表题目所属调。</p><div className="level-list">{([[1, '常用', <>由 <PitchList values={['C', 'G', 'F']} /> 大调调内三和弦生成并去重</>], [2, '扩展', <>再加入 <PitchList values={['D', 'B♭', 'A', 'E♭']} /> 大调来源</>], [3, '全部', <>十二个大调来源的三和弦去重</>]] as const).map(([level, title, description]) => <button type="button" key={level} className={settings.triad.spellingLevel === level ? 'level selected' : 'level'} onClick={() => setSettings((current) => ({ ...current, triad: { ...current.triad, spellingLevel: level } }))}><span>{title}</span><small>{description}</small></button>)}</div></fieldset>
    </> : <>
      <fieldset><legend>七和弦性质 <small>可多选</small></legend><div className="chip-row">{(['major7', 'minor7', 'dominant7'] as const).map((quality) => <button type="button" key={quality} className={settings.seventh.qualities.includes(quality) ? 'chip selected' : 'chip'} onClick={() => setSettings((current) => ({ ...current, seventh: { ...current.seventh, qualities: toggleValue(current.seventh.qualities, quality) } }))}>{SEVENTH_QUALITY_NAMES[quality]}</button>)}</div></fieldset>
      <p className="setup-copy seventh-root-copy">固定使用 <PitchList values={['C', 'G', 'F', 'D', 'B♭', 'A', 'E♭', 'E', 'A♭', 'B', 'D♭', 'F♯']} /> 十二个根音；每轮覆盖全部排列。</p>
    </>}
    <button type="button" className="primary-button" disabled={(triadMode ? !settings.triad.qualities.length : !settings.seventh.qualities.length) || starting} onClick={onStart}>{starting ? '正在准备音源…' : '开始 10 题练习'}</button>{notice && <p className="notice" role="alert">{notice}</p>}
  </section>
}
