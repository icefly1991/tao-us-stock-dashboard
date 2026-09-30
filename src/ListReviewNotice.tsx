import { useEffect, useState } from 'react'

export default function ListReviewNotice() {
  const [date, setDate] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/list-review.json`, { signal: controller.signal, cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('missing')
        return response.json() as Promise<{ last_updated?: string }>
      }).then(data => setDate(data.last_updated ?? ''))
      .catch(error => { if (error.name !== 'AbortError') setDate('') })
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [])
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)?.value
  const today = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)
  const stamp = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN
  const valid = Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date && stamp <= today
  const days = valid ? Math.floor((today - stamp) / 86_400_000) : null
  const overdue = days !== null && days > 30
  return <div className={`list-review-notice ${overdue ? 'overdue' : ''}`} data-testid="list-review-notice" data-overdue={overdue}>
    <strong>{date === null ? '正在读取列表更新日期…' : days === null ? '名单日期暂不可用，请核实。' : `名单更新 ${date} · ${days} 天前`}</strong>
    {overdue && <span>超过30天，请一起手动更新名单和基本面研究。</span>}
  </div>
}
