import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { getProjectFirmList } from '../api/projectFirms'
import {
  getCities,
  getCityDistricts,
  getProjectStatusCounts,
  listProjects,
  PROJECT_STATUS_LABELS,
  type Lookup,
  type ProjectStatusCountsQuery,
} from '../api/projects'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { PROJECT_CREATE_PATH } from '../ui/admin/adminNavItems'
import { adminPageWidthVariants } from '../ui/admin/adminPageWidth'
import { ADMIN_ROW_HIGHLIGHT, adminButtonVariants } from '../ui/admin/adminVariants'
import { ReasonDialog } from '../ui/admin/projectDetail/ReasonDialog'
import { CreatedProjectNotice } from '../ui/admin/projects/CreatedProjectNotice'
import { LOCATION_STALE_MS, ProjectFilterBar } from '../ui/admin/projects/ProjectFilterBar'
import { StatusTabs } from '../ui/admin/projects/StatusTabs'
import {
  buildProjectColumns,
  PROJECT_TABLE_CAPTION,
  PROJECT_TABLE_MIN_WIDTH_CLASS,
} from '../ui/admin/projects/projectColumns'
import { buildProjectFilterChips } from '../ui/admin/projects/projectFilterChips'
import { useCreatedProjectNotice } from '../ui/admin/projects/useCreatedProjectNotice'
import { useProjectActions } from '../ui/admin/projects/useProjectActions'
import { useProjectListParams } from '../ui/admin/projects/useProjectListParams'
import { useCanApproveProject } from '../ui/admin/useCanApproveProject'
import { useHomePath } from '../ui/admin/useHomePath'
import { useIsGasDistributionUser, useIsManagementUser } from '../ui/admin/useRole'

const PANEL_ID = 'project-list-panel'
const LOOKUP_STALE_MS = 5 * 60 * 1000

const EMPTY_WITH_FILTERS =
  'Kriterlere uyan proje bulunamadı. Tarih aralığını genişletin veya ilçe/firma seçimini kaldırın.'
const EMPTY_WITHOUT_FILTERS = 'Bu durumda kayıtlı proje yok.'

const REJECT_DIALOG_COPY = {
  title: 'Proje reddedilsin mi?',
  description: 'Gerekçe işlem geçmişine kaydedilir ve firma kullanıcısına iletilir.',
  confirmLabel: 'Reddet',
}

export function ProjectListPage() {
  const { query, setStatus, applyFilters, toggleSort, setPage } = useProjectListParams()
  const queryClient = useQueryClient()
  // Yönetim ALANLARI (firma sütunları, firma süzgeci) bu bayrağa bakıyor.
  // Verinin KAPSAMI buna bakmıyor: onu sunucu token'daki firmaya göre veriyor,
  // istemci ayrıca `ProjectFirmId` göndermiyor.
  const isManagementView = useIsManagementUser()
  const homePath = useHomePath()
  // Gaz dağıtım kullanıcısı proje YAZMAZ, KARAR VERİR: sunucu da onu
  // `POST /api/projects`, `DELETE /api/projects/{id}` ve `.../submit`
  // uçlarından dışlıyor (`Authorize(Roles = Admin, ProjectFirmUser)`).
  const isGasDistributionUser = useIsGasDistributionUser()
  const canApproveProject = useCanApproveProject()
  const canManageDrafts = !isGasDistributionUser
  // Karar YETKİSİ mevcut kapıdan (`useCanApproveProject`); listede GÖSTERME
  // kararı ise role özel — yöneticinin listesi bilerek değişmedi, onun onay/ret
  // düğmeleri proje detayında kalıyor.
  const canDecidePending = isGasDistributionUser && canApproveProject

  // Rozetler sekmeden ve sayfalamadan bağımsız, yalnız filtre kriterlerine bakar.
  const countsQuery = useMemo<ProjectStatusCountsQuery>(
    () => ({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      cityId: query.cityId,
      districtId: query.districtId,
      projectFirmId: query.projectFirmId,
      // Üst bardaki kapsam rozetlere de gider: sekme sayıları listeyle AYNI
      // kapsamı saymalı, yoksa "Taslak (12)" derken tabloda 3 satır görünürdü.
      scope: query.scope,
      search: query.search,
    }),
    [
      query.dateFrom,
      query.dateTo,
      query.cityId,
      query.districtId,
      query.projectFirmId,
      query.scope,
      query.search,
    ],
  )

  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['projects', query],
    queryFn: ({ signal }) => listProjects(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  const { data: statusCounts } = useQuery({
    queryKey: ['projectStatusCounts', countsQuery],
    queryFn: ({ signal }) => getProjectStatusCounts(countsQuery, signal),
    placeholderData: keepPreviousData,
  })

  // İl/ilçe listeleri filtre etiketlerinin ADINI çözmek için: kutuların kendi
  // sorgusu çubuğun İÇİNDE (taslak seçime bağlı), buradakiler UYGULANMIŞ
  // değerlere bakıyor. Anahtarlar aynı olduğu için önbellek paylaşılıyor.
  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: LOCATION_STALE_MS,
  })

  const { data: districts } = useQuery({
    queryKey: ['districts', query.cityId],
    queryFn: ({ signal }) => getCityDistricts(query.cityId ?? 0, signal),
    enabled: query.cityId !== null,
    staleTime: LOCATION_STALE_MS,
  })

  // Firma listesi GERÇEK uçtan (`GET /api/projectfirms`). Anahtar proje
  // firmaları ekranıyla ORTAK: aynı listeyi iki kez indirmenin anlamı yok.
  // Süzgeç kutusu yalnız yönetim görünümünde var; istek de orada atılıyor.
  // `enabled` olmadan proje firması kullanıcısı hiç kullanmayacağı bir firma
  // listesini her açılışta indirirdi.
  const { data: projectFirms, isError: haveProjectFirmsFailed } = useQuery({
    queryKey: ['projectFirmList'],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    staleTime: LOOKUP_STALE_MS,
    enabled: isManagementView,
  })

  // Süzgeç kutusu kimlik + ad istiyor; satırın geri kalanı (vergi no, telefon…)
  // burada işe yaramıyor. `name` uçtaki `title`'ın karşılığı (projectFirmDto).
  const projectFirmOptions = useMemo<Lookup[]>(
    () => (projectFirms ?? []).map((firm) => ({ id: firm.id, name: firm.name })),
    [projectFirms],
  )

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['projectStatusCounts'] })
  }, [queryClient])

  const actions = useProjectActions({ onChanged: refreshLists })
  const { pendingProjectId, requestDelete, submit, decide } = actions

  // Yeni proje ekranından dönüşteki bildirim; şeridi ve yeni satırın vurgusunu
  // aynı kaynak besliyor.
  const createdNotice = useCreatedProjectNotice()

  const columns = useMemo(
    () =>
      buildProjectColumns({
        rowOffset: (query.page - 1) * query.pageSize,
        status: query.status,
        pendingProjectId,
        isManagementView,
        canManageDrafts,
        canDecidePending,
        onDelete: requestDelete,
        onSubmit: (projectId) => void submit(projectId),
        onApprove: (projectId) => decide('approve', projectId),
        onReject: (projectId) => decide('reject', projectId),
      }),
    [
      query.page,
      query.pageSize,
      query.status,
      pendingProjectId,
      isManagementView,
      canManageDrafts,
      canDecidePending,
      requestDelete,
      submit,
      decide,
    ],
  )

  const statusTitle = `${PROJECT_STATUS_LABELS[query.status]} Projeler`
  const hasActiveFilters =
    query.search !== '' ||
    query.cityId !== null ||
    query.districtId !== null ||
    query.projectFirmId !== null
  // Filtre çubuğu taslak durumunu kendi tutuyor; dışarıdan gelen değişim (geri
  // tuşu, sekme değişimi) ancak bileşen yeni bir key ile kurulunca yansır.
  const appliedFilters = {
    dateFrom: query.dateFrom ?? '',
    dateTo: query.dateTo ?? '',
    cityId: query.cityId,
    districtId: query.districtId,
    projectFirmId: query.projectFirmId,
    search: query.search,
  }
  const filterKey = Object.values(appliedFilters).join('|')

  return (
    <div className={adminPageWidthVariants({ content: 'list', className: 'flex flex-col gap-5' })}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={[
            // Kırılımın ilk maddesi ROLÜN anasayfası: `/admin` proje firması
            // kullanıcısına kapalı, sabit bırakılsaydı kırılım onu yetkisiz
            // ekranına götüren bir bağlantı olurdu.
            { label: 'Anasayfa', to: homePath },
            { label: 'Projeler' },
            { label: statusTitle },
          ]}
          title={statusTitle}
          countLabel={data === undefined ? '…' : String(data.totalCount)}
        />

        {/* Proje AÇMA yetkisi olmayan rolde düğme hiç çizilmez; pasif düğme
            kullanıcıya neden yapamadığını söylemez. Sunucu da aynı: `POST
            /api/projects` yalnız Admin ve ProjectFirmUser'a açık. */}
        {canManageDrafts && (
          <Link to={PROJECT_CREATE_PATH} className={adminButtonVariants({ tone: 'primary' })}>
            <Plus aria-hidden className="size-4" />
            Yeni Proje
          </Link>
        )}
      </div>

      <CreatedProjectNotice notice={createdNotice} />

      {actions.notice !== null && (
        <NoticeBar
          tone={actions.notice.tone}
          message={actions.notice.message}
          details={actions.notice.details}
          onDismiss={actions.dismissNotice}
        />
      )}

      <StatusTabs
        value={query.status}
        counts={statusCounts}
        onChange={setStatus}
        panelId={PANEL_ID}
      />

      <ProjectFilterBar
        key={filterKey}
        filters={appliedFilters}
        projectFirms={projectFirmOptions}
        haveProjectFirmsFailed={haveProjectFirmsFailed}
        isManagementView={isManagementView}
        onApply={applyFilters}
      />

      <FilterChips
        filters={buildProjectFilterChips({
          filters: appliedFilters,
          cities: cities ?? [],
          districts: districts ?? [],
          projectFirms: projectFirmOptions,
          onApply: applyFilters,
        })}
      />

      <div id={PANEL_ID} role="tabpanel" aria-label="Proje listesi">
        {isPending && <QueryLoading message="Projeler yükleniyor…" />}

        {isError && (
          <QueryError message="Proje listesi yüklenemedi." onRetry={() => void refetch()} />
        )}

        {data !== undefined && !isError && (
          <StaleContent isStale={isPlaceholderData}>
            <DataTable
              rows={data.items}
              columns={columns}
              rowKey={(project) => project.id}
              caption={PROJECT_TABLE_CAPTION}
              minWidthClassName={PROJECT_TABLE_MIN_WIDTH_CLASS}
              sortKey={query.sortBy}
              sortDir={query.sortDir}
              onToggleSort={toggleSort}
              emptyMessage={hasActiveFilters ? EMPTY_WITH_FILTERS : EMPTY_WITHOUT_FILTERS}
              // Yeni kayıt varsayılan sıralamada (updatedAt/desc) zaten 1. satır;
              // vurgu onu bulmak için değil, şeritteki numarayla eşleştirmek için.
              rowClassName={(project) =>
                project.pId === createdNotice?.highlightedPId ? ADMIN_ROW_HIGHLIGHT : undefined
              }
            />
            {data.totalCount > 0 && (
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                totalCount={data.totalCount}
                onPageChange={setPage}
              />
            )}
          </StaleContent>
        )}
      </div>

      {actions.rejectTargetId !== null && (
        <ReasonDialog
          title={REJECT_DIALOG_COPY.title}
          description={REJECT_DIALOG_COPY.description}
          confirmLabel={REJECT_DIALOG_COPY.confirmLabel}
          isPending={actions.pendingProjectId !== null}
          onConfirm={(reason) => void actions.confirmReject(reason)}
          onCancel={actions.cancelReject}
        />
      )}

      {actions.deleteTargetId !== null && (
        <ConfirmDialog
          title="Proje silinsin mi?"
          description="Proje ve çizimi kalıcı olarak silinir; bu işlem geri alınamaz."
          confirmLabel="Sil"
          confirmTone="danger"
          isPending={actions.pendingProjectId !== null}
          onConfirm={() => void actions.confirmDelete()}
          onCancel={actions.cancelDelete}
        />
      )}
    </div>
  )
}
