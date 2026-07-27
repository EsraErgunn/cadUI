const AXIS_X_COLOR = '#e5564a'
const AXIS_Y_COLOR = '#2bb673'

/**
 * Çizim alanının sol alt köşesindeki X/Y eksen göstergesi (issue 2.1, KK-2).
 * Plan düzlemi gösterildiği için eksenler X ve Y; three'nin Z'si burada görünmez.
 */
export function AxisIndicator() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      aria-label="Eksen göstergesi"
      role="img"
      className="pointer-events-none absolute bottom-3 left-3"
    >
      <path d="M10 42V16" stroke={AXIS_Y_COLOR} strokeWidth="2" />
      <path d="m10 10 3.6 6h-7.2z" fill={AXIS_Y_COLOR} />
      <text x="1" y="14" fill={AXIS_Y_COLOR} fontSize="10" fontWeight="700">
        Y
      </text>

      <path d="M10 42h26" stroke={AXIS_X_COLOR} strokeWidth="2" />
      <path d="m42 42-6 3.6v-7.2z" fill={AXIS_X_COLOR} />
      <text x="34" y="36" fill={AXIS_X_COLOR} fontSize="10" fontWeight="700">
        X
      </text>
    </svg>
  )
}
