import type { CreatedProjectNotice as Notice } from './useCreatedProjectNotice'
import { NoticeBar } from '../NoticeBar'

interface CreatedProjectNoticeProps {
  notice: Notice | null
}

/**
 * Yeni proje ekranından dönüldüğünde görünen tek seferlik başarı şeridi.
 * Durumu artık liste sayfası tutuyor: aynı bildirim hem şeridi hem yeni satırın
 * vurgusunu besliyor, iki ayrı kaynak olsaydı biri sönerken diğeri kalırdı.
 */
export function CreatedProjectNotice({ notice }: CreatedProjectNoticeProps) {
  if (notice === null) return null

  return <NoticeBar tone="success" message={notice.message} onDismiss={notice.dismiss} />
}
