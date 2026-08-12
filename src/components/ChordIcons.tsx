export function TriadStackIcon() {
  return <svg className="chord-stack-icon" viewBox="0 0 58 58" role="img" aria-label="三和弦叠置谱面">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35">
      {[9, 17, 25, 33, 41].map((y) => <line key={y} x1="11" y1={y} x2="45" y2={y} />)}
      <line x1="35" y1="12" x2="35" y2="42" strokeWidth="1.7" />
    </g>
    <g fill="currentColor">
      <ellipse className="triad-root" cx="27" cy="41" rx="6.8" ry="3.8" transform="rotate(-12 27 41)" />
      <ellipse className="triad-third" cx="27" cy="33" rx="6.8" ry="3.8" transform="rotate(-12 27 33)" />
      <ellipse className="triad-fifth" cx="27" cy="25" rx="6.8" ry="3.8" transform="rotate(-12 27 25)" />
    </g>
  </svg>
}

export function Drop2Icon() {
  return <svg className="submodule-icon drop2-icon" viewBox="0 0 56 56" role="img" aria-label="Drop 2：将第二高音下移八度">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      {[8, 16, 24, 32, 40].map((y) => <line key={y} x1="3" y1={y} x2="53" y2={y} opacity=".42" />)}
    </g>
    <g fill="currentColor">
      <ellipse cx="14" cy="32" rx="4.8" ry="3" transform="rotate(-12 14 32)" />
      <ellipse cx="14" cy="24" rx="4.8" ry="3" transform="rotate(-12 14 24)" />
      <ellipse cx="14" cy="8" rx="4.8" ry="3" transform="rotate(-12 14 8)" />
      <ellipse className="drop2-target" cx="39" cy="44" rx="4.8" ry="3" transform="rotate(-12 39 44)" />
    </g>
    <ellipse className="drop2-source" cx="14" cy="16" rx="4.8" ry="3" transform="rotate(-12 14 16)" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".7" />
    <path d="M27 14v25m0 0-4-5m4 5 4-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
}
