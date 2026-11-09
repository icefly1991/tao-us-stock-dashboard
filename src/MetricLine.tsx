import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

// Keep the complete value on one line, including its price, without clipping.
export default function MetricLine({ children, className = '' }: { children: ReactNode; className?: string }) {
  const container = useRef<HTMLSpanElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const outer = container.current, inner = content.current
    if (!outer || !inner) return
    const fit = () => {
      const available = outer.getBoundingClientRect().width
      if (!available) return
      const base = Number.parseFloat(getComputedStyle(outer).fontSize)
      inner.style.fontSize = `${base}px`
      const width = inner.getBoundingClientRect().width
      if (width > available) inner.style.fontSize = `${base * available / width * .99}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(outer)
    return () => observer.disconnect()
  }, [children])
  return <span ref={container} className={`metric-line ${className}`}><span ref={content} className="metric-line-content">{children}</span></span>
}
