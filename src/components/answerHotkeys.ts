import { useEffect } from 'react'

export function wraps(index: number, offset: number, length: number): number {
  return (index + offset + length) % length
}

export function answerSlots(scopeId: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-answer-scope-id]')]
    .filter((element) => element.dataset.answerScopeId === scopeId)
    .sort((left, right) => Number(left.dataset.answerSlot) - Number(right.dataset.answerSlot))
}

export function focusAnswerSlot(scopeId: string, index: number): void {
  answerSlots(scopeId).find((element) => Number(element.dataset.answerSlot) === index)?.focus()
}

export function activeAnswerSlot(scopeId: string): HTMLElement | null {
  const active = document.activeElement
  return active instanceof HTMLElement && active.dataset.answerScopeId === scopeId ? active : null
}

export function isPlainHotkey(event: KeyboardEvent): boolean {
  return !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.altKey
}

export function useCompleteAnswerSubmit({
  scopeId,
  enabled,
  complete,
  onSubmit,
}: {
  scopeId: string
  enabled: boolean
  complete: boolean
  onSubmit?: () => void
}) {
  useEffect(() => {
    if (!enabled || !onSubmit) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlainHotkey(event) || event.key !== 'Enter' || !complete || !activeAnswerSlot(scopeId)) return
      event.preventDefault()
      onSubmit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [complete, enabled, onSubmit, scopeId])
}
