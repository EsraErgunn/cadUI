import { useQuery } from '@tanstack/react-query'

import { getFirmGroups } from '../api/adminFirms'
import type { FirmGroup } from '../api/adminFirms'
import { DataTable, type DataTableColumn } from '../ui/admin/DataTable'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { useHomePath } from '../ui/admin/useHomePath'

const PAGE_TITLE = 'Grup Firmaları'
const TABLE_CAPTION = 'Gaz dağıtım grup firmaları listesi.'
const EMPTY_MESSAGE = 'Kayıtlı grup firması yok.'

/**
 * Grup firmaları — SALT OKUMA.
 *
 * Yazma uçları (`POST/PUT/DELETE /api/gasdistributiongroups`) yalnız Admin'e
 * açık ve o ekranlar için gereksinim yok; `GET` her role açık, listeyi üst
 * bardaki kapsam seçicisi de aynı anahtardan okuyor — ikinci bir indirme olmaz.
 *
 * Sütun yalnız "Grup Adı": uç `{ id, name }` döndürüyor, başka alan uydurulmadı.
 */
const COLUMNS: DataTableColumn<FirmGroup>[] = [
  { key: 'name', label: 'Grup Adı', cell: (group) => group.name },
]

export function GasDistributionGroupsPage() {
  const homePath = useHomePath()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: 'Anasayfa', to: homePath }, { label: PAGE_TITLE }]}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(data?.length)}
      />

      {isPending && <QueryLoading message="Grup firmaları yükleniyor…" />}

      {isError && (
        <QueryError message="Grup firmaları yüklenemedi." onRetry={() => void refetch()} />
      )}

      {data !== undefined && !isError && (
        <DataTable
          rows={data}
          columns={COLUMNS}
          rowKey={(group) => group.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}
    </div>
  )
}
