import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }
const paths = {
  copy: 'M9 9h11v11H9z M5 15H3V3h12v2',
  check: 'm4 12 5 5L20 6',
  close: 'm6 6 12 12 M6 18 18 6',
  alert: 'M12 8v5 M12 16v.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  candle: 'M6 2v4 M6 16v6 M3 6h6v10H3z M18 2v8 M18 18v4 M15 10h6v8h-6z',
}
function Icon({ size = 18, path, ...props }: Props & { path: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={path} /></svg>
}
export const Copy = (props: Props) => <Icon {...props} path={paths.copy} />
export const Check = (props: Props) => <Icon {...props} path={paths.check} />
export const X = (props: Props) => <Icon {...props} path={paths.close} />
export const CircleAlert = (props: Props) => <Icon {...props} path={paths.alert} />
export const ChartCandlestick = (props: Props) => <Icon {...props} path={paths.candle} />
