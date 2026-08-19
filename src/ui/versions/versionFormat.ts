import { parseServerTimestampMs } from '../../api/serverTimestamp'

/** "17 Ağu" — liste WebCAD'deki gibi kısa tarih + saat gösteriyor. */
const VERSION_DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})

const VERSION_TIME_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
})

/** Sunucudaki sınır (ProjectVersionManager); aynı sayı formda da uygulanıyor. */
export const VERSION_LABEL_MAX_LENGTH = 200

/**
 * "17 Ağu - 14:13". Saat şart: aynı gün birden çok kayıt alınıyor ve satırları
 * ayıran tek şey o.
 *
 * `new Date(...)` DEĞİL `parseServerTimestampMs`: uç `DateTime` döndürüyor ve
 * dilim eki YAZMIYOR ("2026-08-19T11:30:00"). Düz ayrıştırmada bu yerel saat
 * sayılır, oysa değer UTC — UTC+3'te her kayıt üç saat geride görünürdü.
 */
export function formatVersionTimestamp(isoDateTime: string): string {
  const timestampMs = parseServerTimestampMs(isoDateTime)
  // Okunamayan tarihte ham değer gösteriliyor: "Invalid Date" yazmak, kaydın
  // kendisi sağlamken satırı bozukmuş gibi gösterirdi.
  if (Number.isNaN(timestampMs)) return isoDateTime

  return `${VERSION_DATE_FORMATTER.format(timestampMs)} - ${VERSION_TIME_FORMATTER.format(timestampMs)}`
}

export function getVersionLabel(label: string | null): string | undefined {
  const trimmed = label?.trim()
  return trimmed === undefined || trimmed === '' ? undefined : trimmed
}

/** Satırın tek parça hâli — onay penceresi kaydı bu adla anıyor. */
export function formatVersionEntry(version: { label: string | null; createdAt: string }): string {
  const label = getVersionLabel(version.label)
  const timestamp = formatVersionTimestamp(version.createdAt)
  return label === undefined ? timestamp : `${timestamp} | ${label}`
}
