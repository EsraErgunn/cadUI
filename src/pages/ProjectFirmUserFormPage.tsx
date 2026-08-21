import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getProjectFirmUser } from '../api/projectFirmUsers'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH, PROJECT_FIRM_USERS_PATH } from '../ui/admin/adminNavItems'
import { ProjectFirmUserForm } from '../ui/admin/projectFirmUsers/ProjectFirmUserForm'

const CREATE_TITLE = 'Yeni Proje Firma Kullanıcısı Oluşturma'

/**
 * ASSUMPTION: Belge güncelleme ekranına ayrı bir başlık vermiyor, yalnız "aynı
 * ekran" diyor. Oluşturma başlığı güncellemede yanlış bilgi olurdu; başlık
 * onun kalıbıyla yazıldı.
 */
const UPDATE_TITLE = 'Proje Firma Kullanıcısı Güncelleme'

/** Belge madde 8 / KK-13, birebir. */

/**
 * Şeritte sayılan bölüm. Formu dolduran kişi UYDURMA; yalnız güncelleme
 * ekranında görünür, oluşturmada doldurulmuş bir alan zaten yok.
 */
const MOCK_SECTIONS = ['Kullanıcının bilgileri (ad, kullanıcı adı, e-posta, telefon)']

const MISSING_ENDPOINT_HINT = 'GET /api/projectfirmusers/{id}'

function buildBreadcrumb(title: string) {
  return [
    { label: 'Anasayfa', to: ADMIN_HOME_PATH },
    { label: 'Firmalar' },
    { label: 'Proje Firması Kullanıcıları', to: PROJECT_FIRM_USERS_PATH },
    { label: title },
  ]
}

/**
 * Oluşturma ve güncelleme AYNI ekran (KK-25). Kayıt, form kurulmadan ÖNCE
 * çekiliyor: form başlangıç değerlerini mount anında alsın, sonradan gelen
 * veriyi state'e taşıyan bir efekt yazmak gerekmesin (o efekt, kullanıcı
 * yazmaya başladıysa yazdığını silerdi).
 */
export function ProjectFirmUserFormPage() {
  const { userId: rawUserId } = useParams()
  const userId = rawUserId === undefined ? null : Number(rawUserId)

  const { data: sourced, isPending, isError, refetch } = useQuery({
    queryKey: ['projectFirmUser', userId],
    queryFn: ({ signal }) => getProjectFirmUser(userId ?? 0, signal),
    enabled: userId !== null,
  })

  // Üretim derlemesinde uydurma kayıt HİÇ kurulmuyor (K51): doldurulmuş bir
  // form, tablodaki sahte satırdan daha inandırıcı görünürdü.
  const user = sourced?.source === 'unavailable' ? undefined : sourced?.data
  const isSourceMissing = sourced?.source === 'unavailable'

  const title = userId === null ? CREATE_TITLE : UPDATE_TITLE

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader breadcrumb={buildBreadcrumb(title)} title={title} />

      <MockDataNotice sections={sourced?.source === 'mock' ? MOCK_SECTIONS : []} />

      {userId !== null && isPending && <QueryLoading message="Kullanıcı yükleniyor…" />}

      {userId !== null && isError && (
        <QueryError message="Kullanıcı bilgileri yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

      {userId === null && <ProjectFirmUserForm user={null} />}
      {userId !== null && user !== undefined && <ProjectFirmUserForm user={user} />}
    </div>
  )
}
