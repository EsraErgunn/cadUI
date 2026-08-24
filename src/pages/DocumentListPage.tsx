import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import {
  getDocumentTypes,
  resolveDocumentTypeId,
  type DocumentType,
} from '../api/documentTypes'
import { deleteDocument, listDocuments, type DocumentListQuery } from '../api/documents'
import { getProjectFirms } from '../api/projects'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { DocumentFilterBar } from '../ui/admin/documents/DocumentFilterBar'
import {
  DOCUMENT_TABLE_CAPTION,
  DOCUMENT_TABLE_MIN_WIDTH_CLASS,
  buildDocumentColumns,
} from '../ui/admin/documents/documentColumns'
import { buildDocumentFilterChips } from '../ui/admin/documents/documentFilterChips'
import { useDocumentListParams } from '../ui/admin/documents/useDocumentListParams'
import { useHomePath } from '../ui/admin/useHomePath'
import { useCanWriteProjectContent, useIsManagementUser } from '../ui/admin/useRole'
import { useRowDelete } from '../ui/admin/useRowDelete'

const PAGE_TITLE = 'Evraklar'

/** İlk madde ROLE göre çözülüyor (`useHomePath`); ekran üç rolde de açık. */
const BREADCRUMB_TAIL = [{ label: 'Evraklar' }, { label: 'Proje Evrakları' }]

/** Sekme çubuğu YOK: belgedeki iki sekmeden "Favoriler" kapsam dışı kaldı, tek
    sekmelik bir şerit kullanıcıya seçenek varmış izlenimi verirdi. */

const LOOKUP_STALE_MS = 5 * 60 * 1000

/** Sabit boş dizi: her render'da yeni dizi üretmek alt bileşenleri boşuna
    yeniden çizerdi. */
const EMPTY_DOCUMENT_TYPES: DocumentType[] = []

const EMPTY_WITH_FILTERS =
  'Kriterlere uyan evrak bulunamadı. Tarih aralığını genişletin veya tip/firma seçimini kaldırın.'
const EMPTY_WITHOUT_FILTERS = 'Sisteme henüz evrak yüklenmemiş.'

/** Şeritte sayılan bölüm: bu ekranda uydurma olan HER ŞEY, satırların tamamı. */
const MOCK_SECTIONS = ['Evrak listesinin tamamı (satırlar, adet ve sayfalama)']

const MISSING_ENDPOINT_HINT = 'GET /api/docs'

const DELETE_DIALOG = {
  title: 'Evrak silinsin mi?',
  description:
    'Evrak listeden kaldırılacak. Depo bellekte olduğu için sayfa yenilenince örnek liste geri gelir.',
  confirmLabel: 'Sil',
}

const DELETE_MESSAGES = {
  success: 'Evrak silindi.',
  unavailable: 'Evrak silme ucu sunucuda henüz yok (DELETE /api/docs/{id}); kayıt düşmedi.',
  error: 'Evrak silinemedi. Bağlantınızı kontrol edip tekrar deneyin.',
}

export function DocumentListPage() {
  const homePath = useHomePath()
  // Yönetim ALANLARI (firma sütunları, firma süzgeci) buna bakıyor; verinin
  // kapsamı sunucunun işi.
  const isManagementView = useIsManagementUser()
  // Evrak silme sunucuda `Admin, ProjectFirmUser`'a açık; gaz dağıtım kullanıcısı
  // listeyi görür ama satır silemez.
  const canWriteContent = useCanWriteProjectContent()
  const { query, applyFilters, toggleSort, setPage } = useDocumentListParams()
  const queryClient = useQueryClient()

  // Evrak tipleri hem filtrenin hem Evrak Ekle dropdown'ının kaynağı. Kod
  // grubu ucundan geliyor ve nadiren değişiyor: uzun `staleTime` ile ekranlar
  // arası gezinmede yeniden istenmiyor.
  const { data: documentTypes = EMPTY_DOCUMENT_TYPES } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: ({ signal }) => getDocumentTypes(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  // URL evrak tipini KOD olarak taşıyor, uç KİMLİK istiyor: çeviri istek
  // sınırında ve tipler gelmeden istek atılmıyor — yoksa seçili süzgeç sessizce
  // yok sayılır ve kullanıcı filtrelenmemiş listeyi filtrelenmiş sanırdı.
  const listQuery = useMemo<DocumentListQuery>(
    () => ({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      docTypeCodeId: resolveDocumentTypeId(query.docTypeCode, documentTypes),
      projectFirmId: query.projectFirmId,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    }),
    [query, documentTypes],
  )

  const { data: sourced, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['documents', listQuery],
    queryFn: ({ signal }) => listDocuments(listQuery, signal),
    enabled: query.docTypeCode === null || documentTypes.length > 0,
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  // Üretim derlemesinde sahte veri HİÇ üretilmiyor (K51): tablo yerine bölümün
  // sunucuya bağlı olmadığını söyleyen kutu çıkar.
  const data = sourced?.source === 'unavailable' ? undefined : sourced?.data
  const isSourceMissing = sourced?.source === 'unavailable'

  // Süzgeç kutusu yalnız yönetim görünümünde var; listeyi de orada indiriyoruz.
  const { data: projectFirms } = useQuery({
    queryKey: ['projectFirms'],
    queryFn: ({ signal }) => getProjectFirms(signal),
    staleTime: LOOKUP_STALE_MS,
    enabled: isManagementView,
  })


  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    // Proje detayındaki evrak sekmesi AYNI depodan besleniyor (gereksinim 12).
    void queryClient.invalidateQueries({ queryKey: ['projectDocuments'] })
  }, [queryClient])

  const deletion = useRowDelete({
    remove: async (documentId) => {
      await deleteDocument(documentId)
      return true
    },
    messages: DELETE_MESSAGES,
    onDeleted: refreshList,
  })

  const columns = useMemo(
    () =>
      buildDocumentColumns({
        rowOffset: (query.page - 1) * query.pageSize,
        pendingDocumentId: deletion.pendingId,
        isManagementView,
        canDelete: canWriteContent,
        onDelete: deletion.request,
      }),
    [
      query.page,
      query.pageSize,
      deletion.pendingId,
      isManagementView,
      canWriteContent,
      deletion.request,
    ],
  )

  const hasActiveFilters = query.docTypeCode !== null || query.projectFirmId !== null

  // Filtre çubuğu taslak durumunu kendi tutuyor; dışarıdan gelen değişim (geri
  // tuşu, etiket kaldırma) ancak bileşen yeni bir key ile kurulunca yansır.
  const appliedFilters = {
    dateFrom: query.dateFrom ?? '',
    dateTo: query.dateTo ?? '',
    docTypeCode: query.docTypeCode,
    projectFirmId: query.projectFirmId,
  }
  const filterKey = Object.values(appliedFilters).join('|')

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: 'Anasayfa', to: homePath }, ...BREADCRUMB_TAIL]}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(data?.totalCount)}
      />

      <MockDataNotice sections={sourced?.source === 'mock' ? MOCK_SECTIONS : []} />

      {deletion.notice !== null && (
        <NoticeBar
          tone={deletion.notice.tone}
          message={deletion.notice.message}
          onDismiss={deletion.dismissNotice}
        />
      )}

      <DocumentFilterBar
        isManagementView={isManagementView}
        key={filterKey}
        filters={appliedFilters}
        documentTypes={documentTypes}
        projectFirms={projectFirms ?? []}
        onApply={applyFilters}
      />

      <FilterChips
        filters={buildDocumentFilterChips({
          filters: appliedFilters,
          documentTypes,
          projectFirms: projectFirms ?? [],
          onApply: applyFilters,
        })}
      />

      {isPending && <QueryLoading message="Evraklar yükleniyor…" />}

      {isError && (
        <QueryError message="Evrak listesi yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          <DataTable
            rows={data.items}
            columns={columns}
            rowKey={(document) => document.id}
            caption={DOCUMENT_TABLE_CAPTION}
            minWidthClassName={DOCUMENT_TABLE_MIN_WIDTH_CLASS}
            sortKey={query.sortBy}
            sortDir={query.sortDir}
            onToggleSort={toggleSort}
            emptyMessage={hasActiveFilters ? EMPTY_WITH_FILTERS : EMPTY_WITHOUT_FILTERS}
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

      {deletion.targetId !== null && (
        <ConfirmDialog
          title={DELETE_DIALOG.title}
          description={DELETE_DIALOG.description}
          confirmLabel={DELETE_DIALOG.confirmLabel}
          confirmTone="danger"
          isPending={deletion.pendingId !== null}
          onConfirm={() => void deletion.confirm()}
          onCancel={deletion.cancel}
        />
      )}
    </div>
  )
}
