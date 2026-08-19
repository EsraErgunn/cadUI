import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { getDocumentTypes } from '../api/documentTypes'
import { deleteDocument, listDocuments } from '../api/documents'
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
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { DocumentFilterBar } from '../ui/admin/documents/DocumentFilterBar'
import {
  DOCUMENT_TABLE_CAPTION,
  DOCUMENT_TABLE_MIN_WIDTH_CLASS,
  buildDocumentColumns,
} from '../ui/admin/documents/documentColumns'
import { buildDocumentFilterChips } from '../ui/admin/documents/documentFilterChips'
import { useDocumentListParams } from '../ui/admin/documents/useDocumentListParams'
import { useRowDelete } from '../ui/admin/useRowDelete'

const PAGE_TITLE = 'Evraklar'
const PAGE_DESCRIPTION = 'Tüm projelere ait yüklenmiş evraklar'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Evraklar' },
  { label: 'Proje Evrakları' },
]

/** Sekme çubuğu YOK: belgedeki iki sekmeden "Favoriler" kapsam dışı kaldı, tek
    sekmelik bir şerit kullanıcıya seçenek varmış izlenimi verirdi. */

const LOOKUP_STALE_MS = 5 * 60 * 1000

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
  const { query, applyFilters, toggleSort, setPage } = useDocumentListParams()
  const queryClient = useQueryClient()

  const { data: sourced, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['documents', query],
    queryFn: ({ signal }) => listDocuments(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  // Üretim derlemesinde sahte veri HİÇ üretilmiyor (K51): tablo yerine bölümün
  // sunucuya bağlı olmadığını söyleyen kutu çıkar.
  const data = sourced?.source === 'unavailable' ? undefined : sourced?.data
  const isSourceMissing = sourced?.source === 'unavailable'

  const { data: projectFirms } = useQuery({
    queryKey: ['projectFirms'],
    queryFn: ({ signal }) => getProjectFirms(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  // Evrak tipleri hem filtrenin hem Evrak Ekle dropdown'ının kaynağı; sabit
  // liste olduğu için istek yok, yalnız sıralama maliyeti var.
  const documentTypes = useMemo(() => getDocumentTypes(), [])

  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    // Proje detayındaki evrak sekmesi AYNI depodan besleniyor (gereksinim 12).
    void queryClient.invalidateQueries({ queryKey: ['projectDocuments'] })
  }, [queryClient])

  const deletion = useRowDelete({
    remove: async (documentId) => (await deleteDocument(documentId)).ok,
    messages: DELETE_MESSAGES,
    onDeleted: refreshList,
  })

  const columns = useMemo(
    () =>
      buildDocumentColumns({
        rowOffset: (query.page - 1) * query.pageSize,
        documentTypes,
        pendingDocumentId: deletion.pendingId,
        onDelete: deletion.request,
      }),
    [query.page, query.pageSize, documentTypes, deletion.pendingId, deletion.request],
  )

  const hasActiveFilters =
    query.search !== '' || query.docTypeCode !== null || query.projectFirmId !== null

  // Filtre çubuğu taslak durumunu kendi tutuyor; dışarıdan gelen değişim (geri
  // tuşu, etiket kaldırma) ancak bileşen yeni bir key ile kurulunca yansır.
  const appliedFilters = {
    dateFrom: query.dateFrom ?? '',
    dateTo: query.dateTo ?? '',
    docTypeCode: query.docTypeCode,
    projectFirmId: query.projectFirmId,
    search: query.search,
  }
  const filterKey = Object.values(appliedFilters).join('|')

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={BREADCRUMB}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(data?.totalCount)}
        description={PAGE_DESCRIPTION}
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
