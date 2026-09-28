import type { VolatilityData } from './dashboardData'

export default function VolatilityCell({ value }: { value?: VolatilityData | null }) {
  const label = value ? `${value.window_start}（不含）至 ${value.window_end} · ${value.sample_count} 个有效日线样本。日均真实波幅/前收盘价；含跳空，非涨跌预测。${value.status === 'insufficient' ? '未覆盖完整三个月或不足40个样本。' : value.status === 'invalid' ? '区间存在异常价格。' : ''}` : '该批次暂无波幅数据'
  return <span className="volatility-cell" tabIndex={0} title={label} aria-label={`近3月日均波幅：${value?.value == null ? '暂无' : value.value.toFixed(2) + '%'}。${label}`}>
    {value?.value == null ? '—' : `${value.value.toFixed(2)}%`}
  </span>
}
