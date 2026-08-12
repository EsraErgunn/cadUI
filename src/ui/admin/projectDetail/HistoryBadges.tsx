import { detailBadgeVariants } from './projectDetailVariants'
import {
  HISTORY_OPERATION_LABELS,
  type HistoryFileType,
  type HistoryOperation,
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
const OPERATION_TONES = {
  projeKayit: 'success',
  projeGuncelleme: 'warning',
  projeOnay: 'success',
  projeRet: 'danger',
  revizyonTalebi: 'warning',
} as const

export function OperationBadge({ operation }: { operation: HistoryOperation }) {
  return (
    <span className={detailBadgeVariants({ tone: OPERATION_TONES[operation] })}>
      {HISTORY_OPERATION_LABELS[operation]}
    </span>
  )
}
