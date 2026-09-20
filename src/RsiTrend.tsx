import { useEffect, useState } from 'react'

type Point = { time: string; value: number }
type History = { period: number; complete: boolean; requested_start: string; points: Point[] }
export type RsiStock = { code: string; name: string; adjustment: 'adjusted' | 'raw'; updatedAt: string }
const cache = new Map<string, History>()

export default function RsiTrend({ stock, latest }: { stock: RsiStock; latest: number | null }) {
  const [history, setHistory] = useState<History | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const { code, adjustment, updatedAt } = stock
  useEffect(() => {
    const controller = new AbortController()
    const key = `${code}/${adjustment}/${updatedAt}/${latest}`
    async function read() {
      try {
        let result = cache.get(key)
        if (!result) {
          const response = await fetch(`${import.meta.env.BASE_URL}data/history/${adjustment}/${encodeURIComponent(code)}.json?v=${encodeURIComponent(updatedAt)}`, { signal: controller.signal })
          if (!response.ok) throw new Error('RSI历史暂不可用')
          const data = await response.json()
          result = data.rsi_history as History | undefined
          if (data.code !== code || data.adjustment !== adjustment || data.updated_at !== updatedAt) throw new Error('历史与当前行情版本不一致，请刷新页面')
          if (!result || result.period !== 14 || !Array.isArray(result.points) || !result.points.length) throw new Error('暂无有效RSI历史')
          if (result.points.some((p, i, points) => !/^\d{4}-\d{2}-\d{2}$/.test(p.time) || !Number.isFinite(p.value) || p.value < 0 || p.value > 100 || (i > 0 && p.time <= points[i - 1].time)) || result.points.at(-1)?.value !== latest) throw new Error('RSI历史校验未通过，请刷新重试')
          cache.set(key, result)
        }
        if (!controller.signal.aborted) setHistory(result)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '加载失败')
      }
    }
    void read()
    return () => controller.abort()
  }, [code, adjustment, updatedAt, latest, attempt])
  if (error) return <p role="status">{error} <button onClick={() => { setError(''); setAttempt(attempt + 1) }}>重试</button></p>
  if (!history) return <p role="status">正在加载RSI历史…</p>
  const points = history.points
  const first = Date.parse(points[0].time), last = Date.parse(points[points.length - 1].time)
  const x = (p: Point) => 38 + (Date.parse(p.time) - first) / Math.max(1, last - first) * 510
  const y = (value: number) => 20 + (100 - value) * 1.8
  const selected = points[hovered ?? points.length - 1]
  return <>
    <p className="rsi-chart-note">{adjustment === 'adjusted' ? '复权价' : '未复权价'} · Wilder RSI(14) · {history.complete ? '近两年' : '不足两年 · 可用历史'}</p>
    <div className="rsi-chart-value">{selected.time} · RSI <b>{selected.value.toFixed(1)}</b></div>
    <svg viewBox="0 0 570 230" role="img" aria-label={`${stock.name}近两年RSI走势，30及以下超卖，70及以上超买`} onPointerMove={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const target = first + (((event.clientX - bounds.left) / bounds.width * 570 - 38) / 510) * (last - first)
      let best = 0
      points.forEach((p, i) => { if (Math.abs(Date.parse(p.time) - target) < Math.abs(Date.parse(points[best].time) - target)) best = i })
      setHovered(best)
    }} onPointerLeave={() => setHovered(null)}>
      <rect x="38" y="20" width="510" height="54" fill="#fff1f2" />
      <rect x="38" y="146" width="510" height="54" fill="#ecfdf5" />
      {[0, 30, 50, 70, 100].map(value => <g key={value}><line x1="38" x2="548" y1={y(value)} y2={y(value)} stroke="#cbd5e1" strokeDasharray="4 4" /><text x="30" y={y(value) + 4} textAnchor="end" fill="#64748b" fontSize="11">{value}</text></g>)}
      <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ')} fill="none" stroke="#0284c7" strokeWidth="1.6" />
      <line x1={x(selected)} x2={x(selected)} y1="20" y2="200" stroke="#94a3b8" strokeDasharray="3 3" />
      <circle cx={x(selected)} cy={y(selected.value)} r="3" fill="#0369a1" />
      <text x="38" y="220" fill="#64748b" fontSize="11">{points[0].time}</text><text x="548" y="220" textAnchor="end" fill="#64748b" fontSize="11">{points[points.length - 1].time}</text>
    </svg>
    <p className="rsi-chart-note">绿色 ≤30 超卖 · 红色 ≥70 超买 · 移动到曲线上查看日期与数值</p>
  </>
}
