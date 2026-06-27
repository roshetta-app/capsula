import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from './ui/OfflineBanner'
import NotificationsBanner from './ui/NotificationsBanner'
import { useVisualViewport } from '../hooks/useVisualViewport'

/**
 * Routes that render their own top section and suppress the shared header.
 */
const HEADER_SUPPRESSED_ROUTES = ['/', '/conditions']

/**
 * Capsula wordmark SVG — CA[pill-P]SULA
 * Rendered inline so it inherits no external file load latency
 * and can be tinted via CSS if needed in future.
 * Viewbox is the full 1791x276 wordmark; height is fixed to 22px in the header.
 */
function CapsulaWordmark({ height = 22 }) {
  return (
    <svg
      height={height}
      viewBox="0 0 1791 276"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Capsula"
      role="img"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* C */}
      <path d="M100.32 234.92C87.52 234.92 75.68 232.84 64.8 228.68C54.08 224.36 44.72 218.36 36.72 210.68C28.88 202.84 22.72 193.72 18.24 183.32C13.76 172.92 11.52 161.48 11.52 149C11.52 136.52 13.76 125.08 18.24 114.68C22.72 104.28 28.96 95.24 36.96 87.56C44.96 79.72 54.32 73.72 65.04 69.56C75.92 65.24 87.76 63.08 100.56 63.08C113.52 63.08 125.44 65.32 136.32 69.8C147.36 74.12 156.72 80.6 164.4 89.24L148.8 104.36C142.4 97.64 135.2 92.68 127.2 89.48C119.2 86.12 110.64 84.44 101.52 84.44C92.08 84.44 83.28 86.04 75.12 89.24C67.12 92.44 60.16 96.92 54.24 102.68C48.32 108.44 43.68 115.32 40.32 123.32C37.12 131.16 35.52 139.72 35.52 149C35.52 158.28 37.12 166.92 40.32 174.92C43.68 182.76 48.32 189.56 54.24 195.32C60.16 201.08 67.12 205.56 75.12 208.76C83.28 211.96 92.08 213.56 101.52 213.56C110.64 213.56 119.2 211.96 127.2 208.76C135.2 205.4 142.4 200.28 148.8 193.4L164.4 208.52C156.72 217.16 147.36 223.72 136.32 228.2C125.44 232.68 113.44 234.92 100.32 234.92Z" fill="currentColor"/>
      {/* A */}
      <path d="M254.854 233L330.934 65H354.694L431.014 233H405.814L337.894 78.44H347.494L279.574 233H254.854ZM287.254 191L293.734 171.8H388.294L395.254 191H287.254Z" fill="currentColor"/>
      {/* Pill-P blue fill cap */}
      <path d="M631 132L631 42L711 42C735.853 42 756 62.1472 756 87C756 111.853 735.853 132 711 132L631 132Z" fill="#2563EB"/>
      {/* Pill-P black outline + stem */}
      <path d="M763.27 76.8232C763.269 52.6204 743.649 33 719.446 33H638V120.646H719.446C743.649 120.646 763.269 101.026 763.27 76.8232ZM535 217.178C535 241.38 554.62 261.001 578.823 261.001C603.026 261.001 622.646 241.381 622.646 217.178V135.731H535V217.178ZM778.27 76.8232C778.269 109.31 751.933 135.646 719.446 135.646H637.646V217.178C637.646 249.665 611.31 276.001 578.823 276.001C546.336 276.001 520 249.665 520 217.178V120.731H623V18H719.446C751.933 18 778.269 44.3361 778.27 76.8232Z" fill="currentColor"/>
      {/* S */}
      <path d="M908.16 234.92C895.36 234.92 883.12 233 871.44 229.16C859.76 225.16 850.56 220.04 843.84 213.8L852.72 195.08C859.12 200.68 867.28 205.32 877.2 209C887.12 212.68 897.44 214.52 908.16 214.52C917.92 214.52 925.84 213.4 931.92 211.16C938 208.92 942.48 205.88 945.36 202.04C948.24 198.04 949.68 193.56 949.68 188.6C949.68 182.84 947.76 178.2 943.92 174.68C940.24 171.16 935.36 168.36 929.28 166.28C923.36 164.04 916.8 162.12 909.6 160.52C902.4 158.92 895.12 157.08 887.76 155C880.56 152.76 873.92 149.96 867.84 146.6C861.92 143.24 857.12 138.76 853.44 133.16C849.76 127.4 847.92 120.04 847.92 111.08C847.92 102.44 850.16 94.52 854.64 87.32C859.28 79.96 866.32 74.12 875.76 69.8C885.36 65.32 897.52 63.08 912.24 63.08C922 63.08 931.68 64.36 941.28 66.92C950.88 69.48 959.2 73.16 966.24 77.96L958.32 97.16C951.12 92.36 943.52 88.92 935.52 86.84C927.52 84.6 919.76 83.48 912.24 83.48C902.8 83.48 895.04 84.68 888.96 87.08C882.88 89.48 878.4 92.68 875.52 96.68C872.8 100.68 871.44 105.16 871.44 110.12C871.44 116.04 873.28 120.76 876.96 124.28C880.8 127.8 885.68 130.6 891.6 132.68C897.68 134.76 904.32 136.68 911.52 138.44C918.72 140.04 925.92 141.88 933.12 143.96C940.48 146.04 947.12 148.76 953.04 152.12C959.12 155.48 964 159.96 967.68 165.56C971.36 171.16 973.2 178.36 973.2 187.16C973.2 195.64 970.88 203.56 966.24 210.92C961.6 218.12 954.4 223.96 944.64 228.44C935.04 232.76 922.88 234.92 908.16 234.92Z" fill="currentColor"/>
      {/* U */}
      <path d="M1161.86 234.92C1139.78 234.92 1122.42 228.6 1109.78 215.96C1097.14 203.32 1090.82 184.84 1090.82 160.52V65H1114.82V159.56C1114.82 178.28 1118.9 191.96 1127.06 200.6C1135.38 209.24 1147.06 213.56 1162.1 213.56C1177.3 213.56 1188.98 209.24 1197.14 200.6C1205.46 191.96 1209.62 178.28 1209.62 159.56V65H1232.9V160.52C1232.9 184.84 1226.58 203.32 1213.94 215.96C1201.46 228.6 1184.1 234.92 1161.86 234.92Z" fill="currentColor"/>
      {/* L */}
      <path d="M1366.11 233V65H1390.11V212.12H1481.07V233H1366.11Z" fill="currentColor"/>
      {/* A */}
      <path d="M1567.17 233L1643.25 65H1667.01L1743.33 233H1718.13L1650.21 78.44H1659.81L1591.89 233H1567.17ZM1599.57 191L1606.05 171.8H1700.61L1707.57 191H1599.57Z" fill="currentColor"/>
    </svg>
  )
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const suppressHeader = HEADER_SUPPRESSED_ROUTES.includes(pathname)

  // Tracks visual viewport (shrinks when keyboard opens) and sets
  // --viewport-height on :root so the layout never scrolls behind the keyboard.
  useVisualViewport()

  return (
    <div style={{
      minHeight:       'var(--viewport-height, 100dvh)',
      backgroundColor: 'var(--color-bg)',
      fontFamily:      'var(--font-body)',
      color:           'var(--color-text-primary)',
    }}>
      <OfflineBanner />

      {!suppressHeader && (
        <header style={{
          position:        'sticky',
          top:             0,
          zIndex:          50,
          backgroundColor: 'var(--color-surface)',
          borderBottom:    '1px solid var(--color-border)',
          padding:         'var(--space-3) var(--space-6)',
          display:         'flex',
          alignItems:      'center',
        }}>
          <div style={{
            width:      '100%',
            maxWidth:   680,
            margin:     '0 auto',
            display:    'flex',
            alignItems: 'center',
          }}>
            <CapsulaWordmark height={22} />
          </div>
        </header>
      )}

      <NotificationsBanner />

      {/* --space-6 (24px) sides. Bottom pad accounts for BottomNav only —
          keyboard height is handled by --viewport-height on the outer div. */}
      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  '0 var(--space-6) calc(var(--space-12) + 60px)',
      }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
