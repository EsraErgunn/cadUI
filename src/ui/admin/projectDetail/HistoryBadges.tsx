import { detailBadgeVariants } from './projectDetailVariants'
import {
  HISTORY_OPERATIONS,
  HISTORY_OPERATION_LABELS,
  type HistoryFileType,
  type HistoryOperation,
  type HistoryOperationCode,
} from '../../../api/projectDetail'

/** "PDF" kırmızı, "ZPD" mavi (belge + KK-8). */
const FILE_TYPE_TONES = {
  pdf: 'danger',
  zpd: 'info',
} as const

const FILE_TYPE_LABELS: Record<HistoryFileType, string> = {
  pdf: 'PDF',
  zpd: 'ZPD',
}

export function FileTypeBadge({ fileType }: { fileType: HistoryFileType }) {
  return (
    <span className={detailBadgeVariants({ tone: FILE_TYPE_TONES[fileType] })}>
      {FILE_TYPE_LABELS[fileType]}
    </span>
  )
}

/**
 * "Proje Kayıt" yeşil, "Proje Güncelleme" amber (belge + KK-8). Onay/ret/revizyon
 * etiketleri belgede yok ama işlem geçmişine bu kayıtlar da düşüyor (KK-11);
 * tonları anlamlarıyla eşleşiyor.
 */
const OPERATION_TONES: Record<HistoryOperation, 'success' | 'warning' | 'danger'> = {
  projeKayit: 'success',
  projeGuncelleme: 'warning',
  projeOnay: 'success',
  projeRet: 'danger',
  revizyonTalebi: 'warning',
}

/** Bilinmeyen kod: nötr ton + sunucunun kendi işlem adı (yoksa ham kod). */
const UNKNOWN_OPERATION_TONE = 'neutral'

interface OperationBadgeProps {
  operation: HistoryOperationCode
  operationName: string | null
}

export function OperationBadge({ operation, operationName }: OperationBadgeProps) {
  const known = HISTORY_OPERATIONS.find((candidate) => candidate === operation) ?? null

  return (
    <span
      className={detailBadgeVariants({
        tone: known === null ? UNKNOWN_OPERATION_TONE : OPERATION_TONES[known],
      })}
    >
      {known === null ? (operationName ?? operation) : HISTORY_OPERATION_LABELS[known]}
    </span>
  )
}
