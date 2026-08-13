import { FileTypeBadge, OperationBadge } from './HistoryBadges'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectHistoryRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { MissingSourceNotice } from '../MissingSourceNotice'

const TABLE_CAPTION =
  'Proje işlem geçmişi. Kayıtlar en yeniden eskiye sıralıdır ve düzenlenemez.'

const EMPTY_MESSAGE = 'Projeye ait işlem kaydı bulunamadı.'

/**
 * Kayıtlar en yeniden eskiye (KK-8). Sıralama BURADA yapılıyor, veri katmanında
 * değil: uç açıldığında sunucunun sırasına güvenmek yerine ekranın kuralı
 * görünür kalsın — geçmişte sıra bozulursa tek bakılacak yer burası.
 */
function sortNewestFirst(rows: ProjectHistoryRow[]): ProjectHistoryRow[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const COLUMNS: DataTableColumn<ProjectHistoryRow>[] = [
  {
    key: 'fileType',
    label: 'Dosya',
    cell: (row) => (row.fileType === null ? <EmptyValue /> : <FileTypeBadge fileType={row.fileType} />),
  },
  { key: 'createdAt', label: 'Tarih', cell: (row) => <DateTimeCell value={row.createdAt} /> },
  { key: 'userName', label: 'İşlem Yapan', cell: (row) => row.userName },
  { key: 'roleSnapshot', label: 'Yetki', cell: (row) => row.roleSnapshot },
  {
    key: 'operation',
    label: 'İşlem',
    cell: (row) => <OperationBadge operation={row.operation} />,
  },
  {
    key: 'description',
    label: 'Açıklama',
    cell: (row) => (row.description === null ? <EmptyValue /> : row.description),
  },
]

/**
 * İşlem geçmişi. Düzenleme/silme aksiyonu BİLEREK yok: kayıtlar hiçbir kullanıcı
 * tarafından değiştirilemez (KK-8), bu yüzden satırlarda "Aksiyonlar" sütunu da
 * üretilmiyor.
 */
export function ProjectHistoryTab({ history }: { history: Sourced<ProjectHistoryRow[]> | undefined }) {
  if (history === undefined || history.source === 'unavailable') {
    return <MissingSourceNotice endpointHint="GET /api/projects/{id}/operation-history" />
  }

  return (
    <DataTable
      rows={sortNewestFirst(history.data)}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      caption={TABLE_CAPTION}
      emptyMessage={EMPTY_MESSAGE}
    />
  )
}
