import { useEffect, useState } from 'react'

export default function ScrollEdges() {
  const [edges, setEdges] = useState({ visible: false, top: true, bottom: false })

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const next = { visible: limit > 24, top: window.scrollY <= 4, bottom: window.scrollY >= limit - 4 }
      setEdges(previous => previous.visible === next.visible && previous.top === next.top && previous.bottom === next.bottom ? previous : next)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.documentElement)
    observer.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  const move = (end: boolean) => window.scrollTo({
    top: end ? document.documentElement.scrollHeight : 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })

  if (!edges.visible) return null
  return <nav className="scroll-edges" aria-label="页面快速定位">
    <button type="button" disabled={edges.top} onClick={() => move(false)} aria-label="回到顶部" title="回到顶部">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 10l6-6 6 6M12 4v15" /></svg>
      <span>回顶</span>
    </button>
    <span className="scroll-edges-divider" aria-hidden="true" />
    <button type="button" disabled={edges.bottom} onClick={() => move(true)} aria-label="回到底部" title="回到底部">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 14l6 6 6-6M12 20V5" /></svg>
      <span>回底</span>
    </button>
  </nav>
}
