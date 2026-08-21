import { PageHeader } from '../ui/admin/PageHeader'
import { ADMIN_HOME_PATH, PROJECT_FIRMS_PATH } from '../ui/admin/adminNavItems'
import { NewProjectFirmForm } from '../ui/admin/projectFirms/NewProjectFirmForm'

const PAGE_TITLE = 'Yeni Proje Firması Ekle'

/** Belge madde 15, birebir. */

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: 'Proje Firmaları', to: PROJECT_FIRMS_PATH },
  { label: PAGE_TITLE },
]

/**
 * Yalnız ekleme ekranı. Güncelleme aynı formu kullanacak olsa da rota bugün
 * bağlanmadı: `PUT /api/projectfirms/{id}` yetkilendirme kayıtlarını taşımıyor,
 * yani güncelleme ekranı yarım bir davranışla açılırdı.
 */
export function NewProjectFirmPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader breadcrumb={BREADCRUMB} title={PAGE_TITLE} />

      <NewProjectFirmForm />
    </div>
  )
}
