const EMPTY_VALUE_SYMBOL = '—'
const EMPTY_VALUE_LABEL = 'Değer yok'

/** Değeri olmayan hücre. Tire yalnız görsel bir işaret olduğu için ekran
    okuyucuya `aria-hidden` ile gizlenip yerine okunabilir karşılığı verilir. */
export function EmptyValue() {
  return (
    <>
      <span aria-hidden className="text-ink-disabled">
        {EMPTY_VALUE_SYMBOL}
      </span>
      <span className="sr-only">{EMPTY_VALUE_LABEL}</span>
    </>
  )
}
