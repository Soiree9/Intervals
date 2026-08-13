import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion(): boolean {
  // jsdom（测试环境）没有 matchMedia：视为不需要动画，直接显示目标值
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/**
 * 挂载/目标变化时，把数字从 0（或上一值）平滑滚到 target。
 * 尊重 prefers-reduced-motion：直接显示最终值。
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      setValue(target)
      fromRef.current = target
      return
    }
    if (fromRef.current === 0 && target === 0) return
    const from = fromRef.current
    if (from === target) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1)
      setValue(Math.round(from + (target - from) * easeOutExpo(p)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
