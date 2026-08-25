export const ACCIDENTAL_GLYPHS: Record<string, string> = {
  '♭': '\uE260',
  b: '\uE260',
  '♮': '\uE261',
  '♯': '\uE262',
  '#': '\uE262',
  '♯♯': '\uE263',
  '##': '\uE263',
  '𝄪': '\uE263',
  '♭♭': '\uE264',
  bb: '\uE264',
  '𝄫': '\uE264',
  '♯♯♯': '\uE265',
  '###': '\uE265',
  '♭♭♭': '\uE266',
  bbb: '\uE266',
}

export const TEXT_ACCIDENTAL_GLYPHS: Record<string, string> = {
  '♭': '\uED60',
  b: '\uED60',
  '♮': '\uED61',
  '♯': '\uED62',
  '#': '\uED62',
  '♯♯': '\uED63',
  '##': '\uED63',
  '𝄪': '\uED63',
  '♭♭': '\uED64',
  bb: '\uED64',
  '𝄫': '\uED64',
  '♯♯♯': '\uED65',
  '###': '\uED65',
  '♭♭♭': '\uED66',
  bbb: '\uED66',
}

export const CHORD_ACCIDENTAL_GLYPHS = TEXT_ACCIDENTAL_GLYPHS

export const SMUFL_CHORD_GLYPHS = {
  diminished: '\uE870',
  halfDiminished: '\uE871',
  majorSeventh: '\uE873',
  minor: '\uE874',
} as const
