import { Link } from 'react-router-dom'

import type { ProjectListItem, ProjectSortKey, ProjectStatus } from '../../../api/projects'
import type { DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { gasFirmUpdatePath, projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'
import { DocumentIndicator } from './DocumentIndicator'
import { HeatingTypeBadge } from './HeatingTypeBadge'
import { ProjectRowActions } from './ProjectRowActions'
import { ProjectTypeBadge } from './ProjectTypeBadge'

export const PROJECT_TABLE_CAPTION =
  'Proje listesi. Proje adı, güncelleme ve kayıt tarihi başlıkları sıralamayı değiştirir.'

/** On iki sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır. */
export const PROJECT_TABLE_MIN_WIDTH_CLASS = 'min-w-320'

/** Sil/Gönder yalnız taslak projede anlamlı — sütun bu durumda hiç üretilmez. */
const ACTIONABLE_STATUS: ProjectStatus = 'taslak'

interface ProjectColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  status: ProjectStatus
  pendingProjectId: number | null
  onDelete: (projectId: number) => void
  onSubmit: (projectId: number) => void
}

export function buildProjectColumns({
  rowOffset,
  status,
  pendingProjectId,
  onDelete,
  onSubmit,
}: ProjectColumnsOptions): DataTableColumn<ProjectListItem, ProjectSortKey>[] {
  const columns: DataTableColumn<ProjectListItem, ProjectSortKey>[] = [
    {
      key: 'no',
      label: 'No',
      cellClassName: 'tabular-nums text-ink-muted',
      cell: (_project, index) => rowOffset + index + 1,
    },
    {
      key: 'documents',
      label: 'İşlemler',
      cell: (project) => <DocumentIndicator hasDocuments={project.hasDocuments} />,
    },
    {
      key: 'pId',
      label: 'P_ID',
      cellClassName: 'font-mono tabular-nums text-ink',
      cell: (project) => project.pId,
    },
    {
      key: 'name',
      label: 'Proje Adı',
      sortKey: 'name',
      cell: (project) => (
        <Link to={projectDetailPath(project.id)} className={ADMIN_CELL_LINK}>
          {project.name}
        </Link>
      ),
    },
    {
      key: 'firmName',
      label: 'Firma İsmi',
      cell: (project) => (project.firmName === null ? <EmptyValue /> : project.firmName),
    },
    {
      key: 'buildingCode',
      label: 'Bina Kodu',
      cellClassName: 'font-mono tabular-nums',
      cell: (project) =>
        project.buildingCode === null ? <EmptyValue /> : project.buildingCode,
    },
    // Rozet YALNIZ değer varken çizilir: içi tire dolu boş bir rozet, aynı
    // tablodaki diğer boş hücrelerden (Bina Kodu, G.D Firması) farklı görünüyordu.
    {
      key: 'projectType',
      label: 'Proje Tipi',
      cell: (project) =>
        project.projectType === null ? <EmptyValue /> : <ProjectTypeBadge code={project.projectType} />,
    },
    {
      key: 'heatingType',
      label: 'Isınma Tipi',
      cell: (project) =>
        project.heatingType === null ? <EmptyValue /> : <HeatingTypeBadge value={project.heatingType} />,
    },
    {
      key: 'updatedAt',
      label: 'Güncelleme Tarihi',
      sortKey: 'updatedAt',
      cell: (project) => <DateTimeCell value={project.updatedAt} />,
    },
    {
      key: 'createdAt',
      label: 'Kayıt Tarihi',
      sortKey: 'createdAt',
      cell: (project) => <DateTimeCell value={project.createdAt} />,
    },
    {
      key: 'gasFirm',
      label: 'G.D Firması',
      cell: (project) => {
        const gasFirm = project.gasFirm
        if (gasFirm === null) return <EmptyValue />
        return (
          <Link to={gasFirmUpdatePath(gasFirm.id)} className={ADMIN_CELL_LINK}>
            {gasFirm.name}
          </Link>
        )
      },
    },
  ]

  if (status !== ACTIONABLE_STATUS) return columns

  return [
    ...columns,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: 'text-right',
      cell: (project) => (
        <ProjectRowActions
          projectId={project.id}
          isPending={pendingProjectId === project.id}
          onDelete={onDelete}
          onSubmit={onSubmit}
        />
      ),
    },
  ]
}
