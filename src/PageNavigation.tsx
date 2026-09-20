export default function PageNavigation({ page }: { page: 'watchlist' | 'research' | 'boxes' }) {
  return <nav aria-label="列表页面" className="page-navigation">
    {([['watchlist', '持仓股'], ['research', '活跃股观察列表'], ['boxes', '箱体观察']] as const).map(([id, label]) =>
      <a key={id} href={`#/${id}`} className={`page-link ${page === id ? 'selected' : ''}`} aria-current={page === id ? 'page' : undefined}>{label}</a>)}
  </nav>
}
