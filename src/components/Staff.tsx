import { useEffect, useRef, useState } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import type { NoteSpelling } from '../domain/types'
import { accidentalText } from '../domain/music'

interface StaffProps {
  notes: NoteSpelling[]
  targetIndex?: number
  label: string
}

export function Staff({ notes, targetIndex, label }: StaffProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))))
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.replaceChildren()
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(width, 176)
    const context = renderer.getContext()
    const stave = new Stave(12, 36, width - 24)
    stave.addClef('treble').setContext(context).draw()

    const staveNote = new StaveNote({
      clef: 'treble',
      keys: notes.map((note) => `${note.letter.toLowerCase()}/${note.octave}`),
      duration: 'w',
    })
    notes.forEach((note, index) => {
      if (note.accidental !== 0) staveNote.addModifier(new Accidental(accidentalText(note.accidental).replaceAll('♯', '#').replaceAll('♭', 'b')), index)
    })
    if (targetIndex !== undefined) {
      staveNote.setKeyStyle(targetIndex, { fillStyle: '#db5b3f', strokeStyle: '#db5b3f' })
    }
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickable(staveNote)
    new Formatter().joinVoices([voice]).format([voice], Math.min(220, width - 128))
    voice.draw(context, stave)
  }, [notes, targetIndex, width])

  return <div className="staff" ref={containerRef} role="img" aria-label={label} />
}
