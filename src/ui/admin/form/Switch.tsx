import { switchKnobVariants, switchVariants } from './switchVariants'

interface SwitchProps {
  id?: string
  value: boolean
  /** Görünür etiketi olmayan kullanımlar (tablo satırı) için zorunlu ad. */
  ariaLabel?: string
  isDisabled?: boolean
  onChange: (value: boolean) => void
}

/**
 * Anahtar. `<input type="checkbox">` DEĞİL, `role="switch"` taşıyan bir düğme:
 * ekran okuyucu "işaretli/işaretsiz" yerine "açık/kapalı" der ve gereksinimdeki
 * anahtar davranışı budur. Etiketsiz kullanıldığı yerde (yetki satırı) ad
 * `ariaLabel` ile verilir.
 */
export function Switch({ id, value, ariaLabel, isDisabled = false, onChange }: SwitchProps) {
  const tone = value ? 'on' : 'off'

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={() => onChange(!value)}
      className={switchVariants({ tone })}
    >
      <span aria-hidden className={switchKnobVariants({ tone })} />
    </button>
  )
}
