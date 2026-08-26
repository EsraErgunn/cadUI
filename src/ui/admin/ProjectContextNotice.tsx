import { Link } from 'react-router-dom'

import { QueryError, QueryLoading } from './QueryStates'
import { adminPageWidthVariants } from './adminPageWidth'
import { adminButtonVariants } from './adminVariants'
import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'

const LOADING_MESSAGE = 'Projenin bilgileri yükleniyor…'
const FAILED_MESSAGE =
  'Projenin bilgileri okunamadı; ekran hangi projeye bağlanacağını bilmeden çalışamaz.'

export type ProjectContextState = 'loading' | 'missing' | 'failed'

interface ProjectContextNoticeProps {
  state: ProjectContextState
  /** "Evrak Ekle", "Poliçe Oluşturma" — eksik proje mesajı ekranı adıyla anar. */
  screenName: string
  /** `failed`'de yeniden dener, `missing`'de projelere döner; `loading` kullanmaz. */
  onRetry: () => void
}

/**
 * Bir projeye bağlı açılan ekranların (`?project=<id>`) künye gelmeden
 * çizemeyeceği üç hâli: bekliyor, kimlik yok/geçersiz, okunamadı.
 *
 * Künye gerçek uçtan geldiği için "yok" ile "okunamadı" AYRI: ikisini tek
 * mesaja indirmek, sunucu çökmesini "böyle bir proje yok" diye gösterirdi.
 */
export function ProjectContextNotice({
  state,
  screenName,
  onRetry,
}: ProjectContextNoticeProps) {
  if (state === 'loading') {
    return (
      <div className={adminPageWidthVariants({ className: 'flex flex-col gap-4' })}>
        <QueryLoading message={LOADING_MESSAGE} />
      </div>
    )
  }

  const message =
    state === 'failed'
      ? FAILED_MESSAGE
      : `${screenName} ekranı bir projeye bağlı açılır; adreste geçerli bir proje yok.`

  return (
    <div className={adminPageWidthVariants({ className: 'flex flex-col gap-4' })}>
      <QueryError message={message} onRetry={onRetry} />
      <Link to={PROJECT_LIST_PATH} className={adminButtonVariants({ tone: 'secondary' })}>
        Projelere dön
      </Link>
    </div>
  )
}
