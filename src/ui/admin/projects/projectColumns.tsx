import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { ProjectListItem, ProjectSortKey, ProjectStatus } from '../../../api/projects'
import type { DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { gasFirmUpdatePath, projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'
import { DocumentIndicator } from './DocumentIndicator'
import { HeatingTypeBadge } from './HeatingTypeBadge'
import { ProjectDecisionActions } from './ProjectDecisionActions'
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

/** "Firma İsmi"nin yeri: No, İşlemler, Proje Adı'ndan hemen sonra. */
const FIRM_NAME_COLUMN_INDEX = 3

/** Sil/Gönder yalnız TASLAK projede anlamlı — sütun başka sekmede üretilmez. */
const DRAFT_ACTION_STATUS: ProjectStatus = 'taslak'

/**
 * Onayla/Reddet yalnız ONAY BEKLEYEN projede anlamlı. Sunucu da böyle diyor:
 * `POST /api/projects/{id}/approve|reject` başka durumda 409 döndürüyor, ve
 * proje detayı zaten taslakta bu düğmeleri pasifleştiriyor.
 */
const DECISION_ACTION_STATUS: ProjectStatus = 'onayBekleyen'

/**
 * Düğmeler satırın KENDİ durumuna bakar (liste ucu satır başına `status`
 * döndürüyor); sunucu durumu boş bırakırsa sekme yedeğe düşer — liste zaten
 * `Status` ile sunucuda süzülü. Böylece taslak olmayan bir kayıt taslak
 * sekmesine karışsa da ona "Onaya Gönder" teklif edilmez.
 */
function isRowInStatus(
  project: ProjectListItem,
  tabStatus: ProjectStatus,
  expected: ProjectStatus,
): boolean {
  return (project.status ?? tabStatus) === expected
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
  /**
   * Taslak eylemleri (Sil + Onaya Gönder) çizilsin mi. Gaz dağıtım kullanıcısı
   * için `false`: sunucu da o rolü `POST /api/projects` , `DELETE` ve
   * `.../submit` uçlarından dışlıyor (`Authorize(Roles = Admin,
   * ProjectFirmUser)`), yani burada gizlenen şey sunucuda da yasak.
   */
  canManageDrafts: boolean
  /**
   * Onay kuyruğu eylemleri (Onayla + Reddet) çizilsin mi.
   *
   * YÖNETİCİDE BİLEREK KAPALI: uç yöneticiye de açık ve proje DETAYINDA düğmeler
   * zaten var, ama listede hiç olmadılar — buraya eklemek mevcut yönetici
   * davranışını değiştirmek olurdu. Bu, gaz dağıtım kullanıcısının iş kuyruğu.
   */
  canDecidePending: boolean
  onDelete: (projectId: number) => void
  onSubmit: (projectId: number) => void
  onApprove: (projectId: number) => void
  onReject: (projectId: number) => void
}

export function buildProjectColumns({
  rowOffset,
  status,
  pendingProjectId,
  isManagementView,
  canManageDrafts,
  canDecidePending,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
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

  // Eylem sütunu SEKMEYE ve ROLE birlikte bağlı: taslak sekmesinde taslak
  // sahibinin eylemleri, onay bekleyen sekmesinde karar eylemleri. İkisi asla
  // aynı anda çizilmez — bir sekme tek bir duruma bakıyor.
  const actionCell = resolveActionCell({
    status,
    canManageDrafts,
    canDecidePending,
    pendingProjectId,
    onDelete,
    onSubmit,
    onApprove,
    onReject,
  })

  if (actionCell === null) return columns

  return [
    ...columns,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: actionCell,
    },
  ]
}

type ActionCell = (project: ProjectListItem) => ReactNode

/**
 * Sekmenin eylem hücresi; hiçbir eylem yoksa `null` döner ve sütun HİÇ
 * üretilmez (boş bir "Aksiyonlar" başlığı kullanıcıya eylem varmış gibi görünür).
 */
function resolveActionCell({
  status,
  canManageDrafts,
  canDecidePending,
  pendingProjectId,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
}: Pick<
  ProjectColumnsOptions,
  | 'status'
  | 'canManageDrafts'
  | 'canDecidePending'
  | 'pendingProjectId'
  | 'onDelete'
  | 'onSubmit'
  | 'onApprove'
  | 'onReject'
>): ActionCell | null {
  if (canManageDrafts && status === DRAFT_ACTION_STATUS) {
    return (project) =>
      isRowInStatus(project, status, DRAFT_ACTION_STATUS) ? (
        <ProjectRowActions
          projectId={project.id}
          isPending={pendingProjectId === project.id}
          onDelete={onDelete}
          onSubmit={onSubmit}
        />
      ) : null
  }

  if (canDecidePending && status === DECISION_ACTION_STATUS) {
    return (project) =>
      isRowInStatus(project, status, DECISION_ACTION_STATUS) ? (
        <ProjectDecisionActions
          projectId={project.id}
          isPending={pendingProjectId === project.id}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null
  }

  return null
}
