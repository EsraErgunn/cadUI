import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getProjectFirm, projectFirmQueryKey } from '../api/projectFirmForm'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH, PROJECT_FIRMS_PATH } from '../ui/admin/adminNavItems'
import { adminPageWidthVariants } from '../ui/admin/adminPageWidth'
import { ProjectFirmUpdateForm } from '../ui/admin/projectFirms/ProjectFirmUpdateForm'

const PAGE_TITLE = 'Proje Firması Güncelle'


const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: 'Proje Firmaları', to: PROJECT_FIRMS_PATH },
  { label: PAGE_TITLE },
]

/**
 * Güncelleme ekranı. Kayıt TEKİL uçtan (`GET /api/projectfirms/{id}`) çekiliyor
 * ve form ancak veri geldikten SONRA kuruluyor: başlangıç değerleri mount anında
 * verilsin, sonradan gelen veriyi state'e taşıyan bir efekt yazmak gerekmesin
 * (o efekt, kullanıcı yazmaya başladıysa yazdığını silerdi).
 *
 * Liste ucundan gelen satırla doldurmak MÜMKÜN DEĞİL: seri no, adres ve ikinci
 * telefon liste yanıtında yok (`projectFirmDto.ts`), eksik satırla kaydedilen
 * form sunucudaki dolu alanları silerdi.
 */
export function ProjectFirmUpdatePage() {
  const { firmId: rawFirmId } = useParams()
  const firmId = Number(rawFirmId)
  const isValidId = Number.isInteger(firmId) && firmId > 0

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: projectFirmQueryKey(firmId),
    queryFn: ({ signal }) => getProjectFirm(firmId, { signal }),
    enabled: isValidId,
  })

  return (
    <div className={adminPageWidthVariants({ content: 'formMedium', className: 'flex flex-col gap-5' })}>
      <PageHeader breadcrumb={BREADCRUMB} title={PAGE_TITLE} />

      {!isValidId && <QueryError message="Geçersiz firma adresi." />}

      {isValidId && isPending && <QueryLoading message="Firma yükleniyor…" />}

      {isValidId && isError && (
        <QueryError message="Firma bilgileri yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isValidId && data !== undefined && <ProjectFirmUpdateForm firm={data} />}
    </div>
  )
}
