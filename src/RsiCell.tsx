import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import RsiTrend, { type RsiStock } from './RsiTrend'

export type RsiData = {
  period: number
  value: number | null
  percentile_ytd: number | null
  state: 'oversold' | 'neutral' | 'overbought' | 'unavailable'
  percentile_state: 'low' | 'high' | 'normal' | 'insufficient' | 'unavailable'
  sample_count: number
  sample_start: string | null
  sample_end: string | null
  as_of: string | null
}

const labels = { oversold: '超卖', neutral: '中性', overbought: '超买', unavailable: '暂无数据' }

export default function RsiCell({ rsi, stock }: { rsi?: RsiData | null; stock?: RsiStock }) {
  const [preview, setPreview] = useState<{ left: number; top: number; pinned: boolean } | null>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = () => { if (timer.current) clearTimeout(timer.current) }
  const open = (pinned: boolean) => {
    cancel()
    if (!stock || !trigger.current) return
    const rect = trigger.current.getBoundingClientRect()
    const width = Math.min(600, window.innerWidth - 24)
    const height = Math.min(390, window.innerHeight - 24)
    window.dispatchEvent(new Event('rsi-preview-open'))
    setPreview({ pinned, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12)) })
  }
  const leave = () => { cancel(); if (!preview?.pinned) timer.current = setTimeout(() => setPreview(null), 220) }
  useEffect(() => {
    const close = () => setPreview(null)
    window.addEventListener('rsi-preview-open', close)
    return () => { window.removeEventListener('rsi-preview-open', close); if (timer.current) clearTimeout(timer.current) }
  }, [])
  useEffect(() => {
    if (!preview) return
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPreview(null); trigger.current?.focus() } }
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPreview(null) }
    const scroll = (event: Event) => { if ((event.type === 'resize' || !preview.pinned) && !panel.current?.contains(event.target as Node)) setPreview(null) }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', outside)
    window.addEventListener('resize', scroll)
    window.addEventListener('scroll', scroll, true)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', outside); window.removeEventListener('resize', scroll); window.removeEventListener('scroll', scroll, true) }
  }, [preview])
  const state = rsi?.state ?? 'unavailable'
  const available = rsi?.value != null
  const detail = !rsi ? '本批暂无RSI数据' : `日线RSI(14)，Wilder平滑；行情日 ${rsi.as_of ?? '—'}。年内有效RSI样本 ${rsi.sample_count} 个，${rsi.sample_start ?? '—'} 至 ${rsi.sample_end ?? '—'}。百分位比较该股票自身年内历史，含当日、重复值取中位秩；至少20个样本才显示。`
  return <div ref={trigger} role={stock ? 'button' : undefined} aria-haspopup={stock ? 'dialog' : undefined} aria-expanded={stock ? !!preview : undefined}
    onPointerEnter={event => { if (event.pointerType === 'mouse' && !preview) { cancel(); timer.current = setTimeout(() => open(false), 300) } }}
    onPointerLeave={leave} onClick={() => { if (!preview?.pinned) open(true) }} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(true) } }}
    className={`rsi-cell rsi-${state}`} data-rsi-state={state} data-rsi-description={detail} tabIndex={0} aria-label={`${available ? `RSI ${rsi.value!.toFixed(1)}，${labels[state]}。` : 'RSI暂无数据。'}${detail}`}>
    <div><strong>{available ? rsi.value!.toFixed(1) : '—'}</strong>{available && <span className="rsi-state-label">{labels[state]}</span>}</div>
    <small>{!available ? 'RSI历史不足或缺失' : rsi.percentile_ytd == null ? '年内样本不足' : `年内 P${rsi.percentile_ytd.toFixed(1)}`}</small>
    {available && (rsi.percentile_state === 'low' || rsi.percentile_state === 'high') && <small className="rsi-relative">{rsi.percentile_state === 'low' ? '年内偏低' : '年内偏高'}</small>}
    {preview && stock && createPortal(<div ref={panel} className="rsi-preview" role="dialog" aria-label={`${stock.name} RSI历史`} style={{ left: preview.left, top: preview.top }}
      onClick={event => event.stopPropagation()} onPointerEnter={cancel} onPointerLeave={leave}>
      <header><div><b>{stock.code} · RSI走势</b><small>{stock.name}</small></div><button aria-label="关闭RSI预览" onClick={() => { setPreview(null); trigger.current?.focus() }}>×</button></header>
      <RsiTrend key={`${stock.code}/${stock.adjustment}/${stock.updatedAt}`} stock={stock} latest={rsi?.value ?? null} />
      <details><summary>年内百分位口径</summary><p>{detail}</p></details>
    </div>, document.body)}
  </div>
}
