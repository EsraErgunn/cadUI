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

/**
 * Sıra numarası ve eylem sütunu içeriği kadar dursun. `w-px`: tablo `w-full`
 * olduğu için tarayıcı 1 px'i "en dar hâl" diye okur ve artan genişliği METİN
 * sütunlarına dağıtır — 1920 px'te iki düğmelik sütun ekranın altıda birini
 * kaplıyordu.
 */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

/** "Firma İsmi"nin yeri: No, İşlemler, P_ID, Proje Adı'ndan hemen sonra. */
const FIRM_NAME_COLUMN_INDEX = 4

/** Sil/Gönder yalnız taslak projede anlamlı — sütun bu durumda hiç üretilmez. */
const ACTIONABLE_STATUS: ProjectStatus = 'taslak'

/**
 * Düğmeler satırın KENDİ durumuna bakar (liste ucu satır başına `status`
 * döndürüyor); sunucu durumu boş bırakırsa sekme yedeğe düşer — liste zaten
 * `Status` ile sunucuda süzülü. Böylece taslak olmayan bir kayıt taslak
 * sekmesine karışsa da ona "Onaya Gönder" teklif edilmez.
 */
function isActionableRow(project: ProjectListItem, tabStatus: ProjectStatus): boolean {
  return (project.status ?? tabStatus) === ACTIONABLE_STATUS
}

interface ProjectColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  status: ProjectStatus
  pendingProjectId: number | null
  /**
   * Yönetim görünümü mü (`useIsManagementUser`). Proje firması kullanıcısının
   * listesindeki her satır ZATEN kendi firmasına ait: "Firma İsmi" sütunu her
   * satırda aynı değeri tekrar eder, "G.D Firması" ise yönetici firma
   * düzenleme ekranına bağlantı veriyor — o rolün açamayacağı bir adres.
   *
   * Sunucudan gelen veri DEĞİŞMİYOR, yalnız sunum: DTO aynı, iki sütun
   * çizilmiyor.
   */
  isManagementView: boolean
  onDelete: (projectId: number) => void
  onSubmit: (projectId: number) => void
}

export function buildProjectColumns({
  rowOffset,
  status,
  pendingProjectId,
  isManagementView,
  onDelete,
  onSubmit,
}: ProjectColumnsOptions): DataTableColumn<ProjectListItem, ProjectSortKey>[] {
  const columns: DataTableColumn<ProjectListItem, ProjectSortKey>[] = [
    {
      key: 'no',
      label: 'No',
      cellClassName: `${NARROW_COLUMN_CLASS} tabular-nums text-ink-muted`,
      headerClassName: NARROW_COLUMN_CLASS,
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
  ]

  // Yönetim sütunları listenin ORTASINA giriyor: "Firma İsmi" proje adından
  // hemen sonra, "G.D Firması" en sonda. Sıra gereksinimde yazılı, bu yüzden
  // sona eklemek yerine kendi yerlerine yerleştiriliyor.
  if (isManagementView) {
    columns.splice(FIRM_NAME_COLUMN_INDEX, 0, {
      key: 'firmName',
      label: 'Firma İsmi',
      cell: (project) => (project.firmName === null ? <EmptyValue /> : project.firmName),
    })
    columns.push({
      key: 'gasFirm',
      label: 'G.D Firması',
      cell: (project) => {
        const gasFirm = project.gasFirm
        if (gasFirm === null) return <EmptyValue />
        // Liste ucu adı her zaman, kimliği her zaman döndürmüyor; kimliksiz
        // satırda ad bağlantısız çizilir — var olmayan bir adrese götürmez.
        if (gasFirm.id === null) return gasFirm.name
        return (
          <Link to={gasFirmUpdatePath(gasFirm.id)} className={ADMIN_CELL_LINK}>
            {gasFirm.name}
          </Link>
        )
      },
    })
  }

  if (status !== ACTIONABLE_STATUS) return columns

  return [
    ...columns,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (project) =>
        isActionableRow(project, status) ? (
          <ProjectRowActions
            projectId={project.id}
            isPending={pendingProjectId === project.id}
            onDelete={onDelete}
            onSubmit={onSubmit}
          />
        ) : null,
    },
  ]
}
