import { PageHeader } from '../ui/admin/PageHeader'
import { ADMIN_HOME_PATH, GAS_DISTRIBUTION_USERS_PATH } from '../ui/admin/adminNavItems'
import { GasDistributionUserForm } from '../ui/admin/gasDistributionUsers/GasDistributionUserForm'

const LIST_TITLE = 'Gaz Dağıtım Kullanıcıları'
const PAGE_TITLE = 'Yeni Gaz Dağıtım Kullanıcısı'
const DESCRIPTION = 'Bir gaz dağıtım firmasına bağlı kullanıcı hesabı oluşturun'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Kullanıcılar' },
  { label: LIST_TITLE, to: GAS_DISTRIBUTION_USERS_PATH },
  { label: 'Kullanıcı Ekle' },
]

/**
 * Yalnız OLUŞTURMA ekranı. Güncelleme yok: `PUT /api/users/{id}` var ama
 * kullanıcıyı forma dolduracak liste satırı rol/firma bağını taşımıyor —
 * yarım bir güncelleme ekranı, kaydedildiğinde sunucudaki dolu alanları
 * silerdi.
 */
export function GasDistributionUserFormPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader breadcrumb={BREADCRUMB} title={PAGE_TITLE} description={DESCRIPTION} />

      <GasDistributionUserForm />
    </div>
  )
}
