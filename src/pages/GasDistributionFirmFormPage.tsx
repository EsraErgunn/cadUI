import { Navigate, useParams } from 'react-router-dom'

import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH, GAS_DISTRIBUTION_FIRMS_PATH } from '../ui/admin/adminNavItems'
import { GasFirmFormCard } from '../ui/admin/firms/GasFirmFormCard'
import { useGasFirmInitialValues } from '../ui/admin/firms/useGasFirmInitialValues'

const LIST_TITLE = 'Gaz Dağıtım Firmaları'
const CREATE_TITLE = 'Gaz Dağıtım Firma Ekle'
const UPDATE_TITLE = 'Gaz Dağıtım Firma Güncelle'

const FIRM_ID_PATTERN = /^\d+$/

/**
 * Ekleme ve güncelleme AYNI ekran (belge: "güncelleme ekranı bu ekranla aynı
 * alanları kullanacak"). Ayrımı yalnız rotadaki `firmId` yapar.
 *
 * Doğrulama BURADA, veri çeken bileşenin dışında: hook'lar erken return'den
 * önce çalışmak zorunda olduğu için aynı bileşende kalsaydı bozuk bir kimlikle
 * (ör. /gas-distribution-firms/abc) sunucuya `NaN` isteği gidip sonra
 * yönlendirme yapılırdı.
 */
export function GasDistributionFirmFormPage() {
  const { firmId } = useParams()

  if (firmId !== undefined && !FIRM_ID_PATTERN.test(firmId)) {
    return <Navigate to={GAS_DISTRIBUTION_FIRMS_PATH} replace />
  }

  return <GasFirmFormScreen firmId={firmId === undefined ? null : Number(firmId)} />
}

/**
 * Form, açılış değerleri hazır olmadan MOUNT EDİLMEZ: değerler `useState`
 * başlatıcısıyla bir kez alınıyor, geç gelen yanıtın kullanıcının yazdığının
 * üstüne binmesi böyle yapısal olarak engelleniyor.
 */
function GasFirmFormScreen({ firmId }: { firmId: number | null }) {
  const initial = useGasFirmInitialValues(firmId)
  const title = firmId === null ? CREATE_TITLE : UPDATE_TITLE

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: 'Anasayfa', to: ADMIN_HOME_PATH },
          { label: 'Firmalar' },
          { label: LIST_TITLE, to: GAS_DISTRIBUTION_FIRMS_PATH },
          { label: firmId === null ? 'Firma Ekle' : 'Firma Güncelle' },
        ]}
        title={title}
      />

      {initial.isPending && <QueryLoading message="Form hazırlanıyor…" />}

      {initial.isError && (
        <QueryError message="Firma bilgileri yüklenemedi." onRetry={initial.refetch} />
      )}

      {initial.values !== null && (
        <GasFirmFormCard firmId={firmId} initialValues={initial.values} formLabel={title} />
      )}
    </div>
  )
}
