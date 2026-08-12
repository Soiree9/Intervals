import { useEffect } from 'react'

function isExplicitNonAnswerControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const interactive = target.closest('button, a[href], input, select, textarea, [contenteditable="true"]')
  return Boolean(interactive && !interactive.closest('[data-quiz-answer-control="true"]'))
}

function isAnswerControl(element: Element | null): boolean {
  return Boolean(element?.closest('[data-quiz-answer-control="true"]'))
}

export function usePreserveAnswerFocus(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const handleMouseDown = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return
      const control = event.target.closest('button, a[href], input, select, textarea, summary, [role="button"]')
      if (control && !isAnswerControl(control)) event.preventDefault()
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [enabled])
}

export function useQuizShortcuts({
  enabled,
  feedbackVisible,
  onReplay,
  onNext,
}: {
  enabled: boolean
  feedbackVisible: boolean
  onReplay: () => void
  onNext: () => void
}) {
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isExplicitNonAnswerControl(event.target)) return
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        onReplay()
      } else if (event.key === 'Enter' && feedbackVisible) {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, feedbackVisible, onNext, onReplay])
}
