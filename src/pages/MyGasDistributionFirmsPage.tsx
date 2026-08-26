import { DataTable } from '../ui/admin/DataTable'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { adminPageWidthVariants } from '../ui/admin/adminPageWidth'
import {
  OWN_GAS_FIRM_COLUMNS,
  OWN_GAS_FIRM_TABLE_CAPTION,
} from '../ui/admin/ownGasFirms/ownGasFirmColumns'
import { useOwnGasFirms } from '../ui/admin/ownGasFirms/useOwnGasFirms'
import { useHomePath } from '../ui/admin/useHomePath'

const PAGE_TITLE = 'Ait Olduğu Gaz Dağıtım Firmaları'

/**
 * Bağ olmadığında sebebi yazılır; boş tablo "firma silinmiş" gibi okunurdu.
 * Çözüm kullanıcıda değil yöneticide olduğu için mesaj oraya yönlendiriyor.
 */
const NO_FIRM_LINK_MESSAGE =
  'Kullanıcınız bir gaz dağıtım firmasıyla ilişkilendirilmemiş. Yöneticinizle görüşün.'

/**
 * Kullanıcının bağlı olduğu gaz dağıtım firmaları — yönetimdeki "Gaz Dağıtım
 * Firmaları" ekranının kapsamı DARALTILMIŞ hâli değil, AYRI bir ekran: o liste
 * ucu (`GET /api/gasdistributionfirms`) sunucuda yalnız yönetime açık.
 * Hangi uçtan okunduğu `useOwnGasFirms`'te.
 */
export function MyGasDistributionFirmsPage() {
  const homePath = useHomePath()
  const { rows, isPending, isError, hasNoFirmLink, refetch } = useOwnGasFirms()

  return (
    <div className={adminPageWidthVariants({ content: 'list', className: 'flex flex-col gap-5' })}>
      <PageHeader
        breadcrumb={[{ label: 'Anasayfa', to: homePath }, { label: PAGE_TITLE }]}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(rows?.length)}
      />

      {isPending && <QueryLoading message="Firma bilgileri yükleniyor…" />}

      {isError && (
        <QueryError message="Firma bilgileri yüklenemedi." onRetry={refetch} />
      )}

      {rows !== undefined && !isError && (
        <DataTable
          rows={rows}
          columns={OWN_GAS_FIRM_COLUMNS}
          rowKey={(firm) => firm.id}
          caption={OWN_GAS_FIRM_TABLE_CAPTION}
          emptyMessage={
            hasNoFirmLink
              ? NO_FIRM_LINK_MESSAGE
              : 'Bugün yürürlükte olan bir gaz dağıtım firması yetkiniz yok.'
          }
        />
      )}
    </div>
  )
}
