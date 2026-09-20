export default function DataFreshness({ updatedAt, dataDate }: { updatedAt: string; dataDate: string | null }) {
  const day = dataDate?.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') || '—'
  return <div className="data-freshness" aria-label="行情更新时间">
    <div className="data-freshness-label">LAST REFRESH</div>
    <div className="data-freshness-generated">生成：{updatedAt.replace('T', ' ') || '—'}</div>
    <div className="data-freshness-date">最新数据日：{day}</div>
  </div>
}
