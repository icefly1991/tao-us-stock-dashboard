export default function DataFreshness({ updatedAt, dataDate }: { updatedAt: string; dataDate: string | null }) {
  const day = dataDate?.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') || '—'
  const timestamp = new Date(updatedAt)
  let generated = '—'
  if (!Number.isNaN(timestamp.getTime())) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(timestamp)
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
    generated = `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`
  }
  return <div className="data-freshness" aria-label="行情更新时间">
    <div className="data-freshness-label">更新时间（纽约时间）</div>
    <div className="data-freshness-generated">生成：{generated}</div>
    <div className="data-freshness-date">最新数据日：{day}</div>
  </div>
}
