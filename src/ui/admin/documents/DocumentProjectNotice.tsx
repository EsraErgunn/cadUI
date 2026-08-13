import { Link } from 'react-router-dom'

import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import { QueryError, QueryLoading } from '../QueryStates'
import { adminButtonVariants } from '../adminVariants'

const MESSAGES = {
  loading: 'Projenin bilgileri yükleniyor…',
  missing: 'Evrak Ekle ekranı bir projeye bağlı açılır; adreste geçerli bir proje yok.',
  failed: 'Projenin bilgileri okunamadı; evrak hangi projeye bağlanacağını bilmeden yüklenemez.',
} as const

export type DocumentProjectState = keyof typeof MESSAGES

interface DocumentProjectNoticeProps {
  state: DocumentProjectState
  /** `failed`'de yeniden dener, `missing`'de projelere döner; `loading` kullanmaz. */
  onRetry: () => void
}

/**
 * Evrak Ekle ekranı proje künyesi gelmeden çalışamaz (gereksinim 6). Künye artık
 * gerçek uçtan geldiği için bekleme ve hata hâlleri de var; üçü tek yerde
 * duruyor ki sayfa yalnız "hazır" durumu çizsin.
 */
export function DocumentProjectNotice({ state, onRetry }: DocumentProjectNoticeProps) {
  if (state === 'loading') {
    return (
      <div className="mx-auto flex max-w-320 flex-col gap-4">
        <QueryLoading message={MESSAGES.loading} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-4">
      <QueryError message={MESSAGES[state]} onRetry={onRetry} />
      <Link to={PROJECT_LIST_PATH} className={adminButtonVariants({ tone: 'secondary' })}>
        Projelere dön
      </Link>
    </div>
  )
}
