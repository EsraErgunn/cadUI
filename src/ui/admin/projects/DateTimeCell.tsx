import { EmptyValue } from './EmptyValue'

interface DateTimeCellProps {
  /** ISO tarih-saat; okunamayan değer boş hücre sayılır. */
  value: string | null
}

/** Tarih üstte, saat altta. Tek satırda birleşince sütun çok genişliyor; tablo
    zaten yatay kaydırılacak kadar dolu (bkz. projectColumns). */
export function DateTimeCell({ value }: DateTimeCellProps) {
  if (value === null) return <EmptyValue />

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return <EmptyValue />

  return (
    <time dateTime={value} className="flex flex-col leading-tight">
      <span className="tabular-nums text-ink">{parsed.toLocaleDateString('tr-TR')}</span>
      <span className="text-xs tabular-nums text-ink-muted">
        {parsed.toLocaleTimeString('tr-TR')}
      </span>
    </time>
  )
}
