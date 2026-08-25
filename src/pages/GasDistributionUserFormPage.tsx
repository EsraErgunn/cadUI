import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getUser } from '../api/users'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH, GAS_DISTRIBUTION_USERS_PATH } from '../ui/admin/adminNavItems'
import { GasDistributionUserForm } from '../ui/admin/gasDistributionUsers/GasDistributionUserForm'

const LIST_TITLE = 'Gaz Dağıtım Kullanıcıları'
const CREATE_TITLE = 'Yeni Gaz Dağıtım Kullanıcısı'

/**
 * ASSUMPTION: belge güncelleme ekranına ayrı bir başlık vermiyor, yalnız "aynı
 * ekran" diyor — proje firması kullanıcısı ekranındaki kalıp izlendi.
 */
const UPDATE_TITLE = 'Gaz Dağıtım Kullanıcısı Güncelleme'

function buildBreadcrumb(title: string) {
  return [
    { label: 'Anasayfa', to: ADMIN_HOME_PATH },
    { label: 'Kullanıcılar' },
    { label: LIST_TITLE, to: GAS_DISTRIBUTION_USERS_PATH },
    { label: title },
  ]
}

/**
 * Oluşturma ve güncelleme AYNI ekran — proje firması kullanıcılarındaki desen
 * (KK-25). Kayıt, form kurulmadan ÖNCE çekiliyor: form başlangıç değerlerini
 * mount anında alsın, sonradan gelen veriyi state'e taşıyan bir efekt yazmak
 * gerekmesin (o efekt, kullanıcı yazmaya başladıysa yazdığını silerdi).
 *
 * Kayıt `GET /api/users/{id}` ile TAM okunuyor. Ekran bir süre yalnız oluşturma
 * yapıyordu; gerekçe "liste satırı rol/firma bağını taşımıyor, yarım bir form
 * sunucudaki dolu alanları silerdi" idi. Tekil uç o bağları döndürüyor ve gövde
 * `toUserPayload` ile okunan kayıttan türetiliyor, yani engel kalktı.
 */
export function GasDistributionUserFormPage() {
  const { userId: rawUserId } = useParams()
  const userId = rawUserId === undefined ? null : Number(rawUserId)
  const isValidId = userId !== null && Number.isInteger(userId) && userId > 0

  const { data: user, isPending, isError, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: ({ signal }) => getUser(userId ?? 0, { signal }),
    enabled: isValidId,
  })

  const title = userId === null ? CREATE_TITLE : UPDATE_TITLE

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader breadcrumb={buildBreadcrumb(title)} title={title} />

      {userId !== null && !isValidId && <QueryError message="Geçersiz kullanıcı adresi." />}

      {isValidId && isPending && <QueryLoading message="Kullanıcı yükleniyor…" />}

      {isValidId && isError && (
        <QueryError message="Kullanıcı yüklenemedi." onRetry={() => void refetch()} />
      )}

      {/* Form kaydı ALDIKTAN sonra kuruluyor: `user` prop'u başlangıç
          değerlerini besliyor ve sonradan değişmiyor. */}
      {(userId === null || (isValidId && user !== undefined)) && (
        <GasDistributionUserForm user={user ?? null} />
      )}
    </div>
  )
}
