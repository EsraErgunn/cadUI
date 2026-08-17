import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCurrentUser } from '../api/auth'
import { getProjectFirm } from '../api/projectFirmForm'
import { getUser } from '../api/users'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { ProfileFormCard, ProfileFormSkeleton } from '../ui/admin/profile/ProfileFormCard'
import { toProfileValues, useProfileForm } from '../ui/admin/profile/useProfileForm'

const PAGE_TITLE = 'Kişi Bilgileri'

const BREADCRUMB = [{ label: 'Anasayfa', to: ADMIN_HOME_PATH }, { label: PAGE_TITLE }]

const SAVED_MESSAGE = 'Kişi bilgileriniz güncellendi.'

const NO_FIRM_MESSAGE =
  'Hesabınız bir proje firmasına bağlı değil; firma bilgileri bu yüzden boş görünüyor.'

/**
 * Kişi Bilgileri ekranı.
 *
 * Veri İKİ uçtan birleşiyor ve bu sunucunun veri modelinden geliyor: kullanıcı
 * adı ile Telefon 1 `Users` kaydında, firma alanları `ProjectFirm` kaydında.
 * Kimlik zinciri: `GET /api/auth/me` (oturumdaki kullanıcının kimliği) →
 * `GET /api/users/{id}` (telefon burada, /me'de yok) → `projectFirmId` varsa
 * `GET /api/projectfirms/{id}`.
 *
 * Kimlik HİÇBİR yerde sabit değil; `projectFirmId` null ise firma isteği hiç
 * atılmıyor ve alanlar sahte veriyle DOLDURULMUYOR — boş ve kilitli kalıyorlar.
 */
export function ProfilePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  // Oturumdaki kullanıcının kimliği yalnız burada: `AuthSession` id taşımıyor.
  const meQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => getCurrentUser({ signal }),
  })

  const userId = meQuery.data?.id

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: ({ signal }) => getUser(userId ?? 0, { signal }),
    enabled: userId !== undefined,
  })

  const projectFirmId = userQuery.data?.projectFirmId ?? null

  const firmQuery = useQuery({
    queryKey: ['projectFirmDetail', projectFirmId],
    queryFn: ({ signal }) => getProjectFirm(projectFirmId ?? 0, { signal }),
    enabled: projectFirmId !== null,
  })

  const refreshProfile = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['user'] })
    void queryClient.invalidateQueries({ queryKey: ['projectFirmDetail'] })
    // Firma listesi de aynı kayıttan besleniyor; ünvan değişince tazelensin.
    void queryClient.invalidateQueries({ queryKey: ['projectFirmList'] })
  }, [queryClient])

  const isPending =
    meQuery.isPending ||
    userQuery.isPending ||
    (projectFirmId !== null && firmQuery.isPending)

  // Kullanıcı okunamazsa ekranın anlamı kalmıyor; firma hatası ise TÜM ekranı
  // düşürmüyor, yalnız kendi şeridini gösteriyor (aşağıda).
  const loadError = meQuery.isError || userQuery.isError

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        breadcrumb={BREADCRUMB}
        title={PAGE_TITLE}
        description="Kullanıcının kimlik ve iletişim bilgileri"
      />

      {savedNotice !== null && (
        <NoticeBar
          tone="success"
          message={savedNotice}
          onDismiss={() => setSavedNotice(null)}
        />
      )}

      {loadError && (
        <QueryError
          message="Kişi bilgileri yüklenemedi."
          onRetry={() => {
            void meQuery.refetch()
            void userQuery.refetch()
          }}
        />
      )}

      {!loadError && isPending && (
        <>
          <p role="status" className="text-sm text-ink-muted">
            Kişi bilgileri yükleniyor…
          </p>
          <ProfileFormSkeleton />
        </>
      )}

      {!loadError && !isPending && userQuery.data !== undefined && (
        <>
          {projectFirmId === null && (
            <NoticeBar tone="warning" message={NO_FIRM_MESSAGE} onDismiss={() => {}} />
          )}

          {firmQuery.isError && (
            <QueryError
              message="Firma bilgileri yüklenemedi; yalnız kullanıcı bilgileri gösteriliyor."
              onRetry={() => void firmQuery.refetch()}
            />
          )}

          <ProfileFormBody
            user={userQuery.data}
            firm={firmQuery.data}
            onRefresh={refreshProfile}
            onSuccess={() => setSavedNotice(SAVED_MESSAGE)}
            onCancel={() => void navigate(-1)}
          />
        </>
      )}
    </div>
  )
}

interface ProfileFormBodyProps {
  user: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof getUser>>>>['data']>
  firm: Awaited<ReturnType<typeof getProjectFirm>> | undefined
  /** Önbellek tazeleme; kısmi başarıda da çağrılır. */
  onRefresh: () => void
  /** Yalnız iki uç da başarılıyken. */
  onSuccess: () => void
  onCancel: () => void
}

/**
 * Form, veri HAZIR olunca mount ediliyor: açılış değerleri prop olarak bir kez
 * okunuyor, sonradan efektle içeri yazılsaydı geç gelen yanıt kullanıcının o
 * sırada yazdığının üstüne binerdi (`useGasFirmInitialValues` ile aynı gerekçe).
 */
function ProfileFormBody({
  user,
  firm,
  onRefresh,
  onSuccess,
  onCancel,
}: ProfileFormBodyProps) {
  const initialValues = useMemo(() => toProfileValues(user, firm), [user, firm])
  const form = useProfileForm({ user, firm, initialValues, onRefresh })

  return (
    <ProfileFormCard
      form={form}
      username={user.username}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}
