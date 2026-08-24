import {
  ISOMETRIC_FIELD_LABEL,
  ISOMETRIC_FIELD_VALUE,
  isometricSliderVariants,
} from './isometricVariants'

const DEGREE_FORMATTER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

type IsometricAngleSliderProps = {
  label: string
  /** Ekran okuyucu için tam ad: "α" tek başına "alfa" diye okunmuyor. */
  accessibleLabel: string
  valueDeg: number
  minDeg: number
  maxDeg: number
  unitLabel: string
  onChange: (value: number) => void
}

/**
 * HUD'daki tek bir kaydırıcı. Değer CANLI yazılır (sürüklerken sahne dönüyor) —
 * bırakılmayı beklemek "dinamik" hissi tamamen öldürürdü.
 *
 * `aria-valuetext` şart: yardımcı teknoloji ham sayıyı ("40") birimsiz okur,
 * kullanıcı neyin 40 olduğunu duymaz.
 */
export function IsometricAngleSlider({
  label,
  accessibleLabel,
  valueDeg,
  minDeg,
  maxDeg,
  unitLabel,
  onChange,
}: IsometricAngleSliderProps) {
  const formatted = `${DEGREE_FORMATTER.format(valueDeg)}${unitLabel}`

  return (
    <div className="flex flex-col gap-1">
      <span className={ISOMETRIC_FIELD_LABEL}>
        <span>{label}</span>
        <span className={ISOMETRIC_FIELD_VALUE}>{formatted}</span>
      </span>
      <input
        type="range"
        className={isometricSliderVariants()}
        min={minDeg}
        max={maxDeg}
        step={1}
        value={valueDeg}
        aria-label={accessibleLabel}
        aria-valuetext={formatted}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  )
}
