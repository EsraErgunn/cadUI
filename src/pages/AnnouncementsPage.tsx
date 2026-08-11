import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getAnnouncements, type Announcement } from '../api/adminDashboard'
import { EmptyState } from '../ui/admin/EmptyState'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { AnnouncementCard } from '../ui/admin/announcements/AnnouncementCard'
import { AnnouncementDialog } from '../ui/admin/announcements/AnnouncementDialog'
import { AnnouncementsToolbar } from '../ui/admin/announcements/AnnouncementsToolbar'
import { useAnnouncementListParams } from '../ui/admin/announcements/useAnnouncementListParams'

const PAGE_TITLE = 'Duyurular'

const BREADCRUMB = [{ label: 'Anasayfa', to: ADMIN_HOME_PATH }, { label: PAGE_TITLE }]

const ANNOUNCEMENTS_QUERY_KEY = 'announcements'

const EMPTY_MESSAGE = 'Henüz yayınlanmış duyuru yok. "Duyuru Yayınla" ile ilkini oluşturun.'
const EMPTY_SEARCH_MESSAGE =
  'Aramaya uyan duyuru bulunamadı. Aramayı değiştirip tekrar deneyin.'

/** Kapsam sabit: üst bardaki bölge seçicisi kaldırıldı (docs/kararlar.md K31). */
const PAGE_DESCRIPTION = 'Kullanıcı ekranlarında tüm bölgelerde görünen duyurular'

/**
 * Duyuru listesi. Anasayfadaki kart en yeni iki duyuruyu gösteriyor, bu ekran
 * yayınlanmış duyuruların tamamını.
 *
 * Yayınlama formu anasayfayla AYNI bileşen (`AnnouncementDialog`): iki ayrı form
 * olsaydı doğrulama ve alanlar zamanla birbirinden ayrışırdı.
 */
export function AnnouncementsPage() {
  const { query, setTextQuery, setPage } = useAnnouncementListParams()
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null)

  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: [ANNOUNCEMENTS_QUERY_KEY, query],
    queryFn: ({ signal }) => getAnnouncements(query, signal),
    // Sayfa değişince liste boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  const handlePublished = (announcement: Announcement) => {
    setIsDialogOpen(false)
    setPublishedTitle(announcement.title)
    // Hem bu liste hem anasayfa kartı tazelenir: yeni duyuru iki yerde de görünsün.
    void queryClient.invalidateQueries({ queryKey: [ANNOUNCEMENTS_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {publishedTitle !== null && (
        <NoticeBar
          tone="success"
          message={`“${publishedTitle}” duyurusu yayınlandı.`}
          onDismiss={() => setPublishedTitle(null)}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={data === undefined ? '…' : String(data.totalCount)}
          description={PAGE_DESCRIPTION}
        />
        <AnnouncementsToolbar
          textQuery={query.textQuery}
          onApplyTextQuery={setTextQuery}
          onPublish={() => setIsDialogOpen(true)}
        />
      </div>

      <FilterChips
        filters={
          query.textQuery === ''
            ? []
            : [
                {
                  key: 'textQuery',
                  label: 'Arama',
                  value: query.textQuery,
                  onRemove: () => setTextQuery(''),
                },
              ]
        }
      />

      {isPending && <QueryLoading message="Duyurular yükleniyor…" />}

      {isError && <QueryError message="Duyurular yüklenemedi." onRetry={() => void refetch()} />}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          {data.items.length === 0 ? (
            <EmptyState message={query.textQuery === '' ? EMPTY_MESSAGE : EMPTY_SEARCH_MESSAGE} />
          ) : (
            // Adlandırılmış liste: ekran okuyucu kullanıcısı konum izindeki
            // listeyle duyuru listesini ayırt edebilsin.
            <ul aria-label="Yayınlanan duyurular" className="flex flex-col gap-4">
              {data.items.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </ul>
          )}

          {data.totalCount > 0 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              onPageChange={setPage}
              itemLabelAblative="duyurudan"
            />
          )}
        </StaleContent>
      )}

      {isDialogOpen && (
        <AnnouncementDialog
          onClose={() => setIsDialogOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  )
}
