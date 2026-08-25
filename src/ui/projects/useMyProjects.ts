import { useEffect, useState } from 'react'

// Yalnız TİP: değer olarak alınsaydı `adminDashboard.ts`nin mock modül
// grafiği (adminDashboardMock, adminFirms) editör paketine de girerdi — aynı
// gerekçeyle `api/projects.ts` de bu dosyadan yalnız TİP alıyor.
import type { AdminScope } from '../../api/adminDashboard'
import { listProjects, PROJECT_STATUSES, type ProjectListItem } from '../../api/projects'

/** Kapsam seçilmemiş hâl; sunucu erişimi zaten role göre daraltıyor. */
const GLOBAL_SCOPE: AdminScope = { type: 'global' }

/**
 * Durum başına istenen sayfa büyüklüğü. `listProjects` TEK durumu sorguluyor
 * (sözleşmede `Status` zorunlu) — "projelerim" hepsini birden göstermek
 * istediği için dört durum PARALEL çekilip birleştiriliyor.
 */
const PAGE_SIZE_PER_STATUS = 10
/** Birleşik listenin görünen üst sınırı: hızlı seçici, tam liste ekranı değil. */
const SWITCHER_LIMIT = 20

export type MyProjectsState = {
  projects: ProjectListItem[]
  isLoading: boolean
  error: string | undefined
}

/** Hangi isteğin sonucu elde tutuluyor. */
type ProjectsResult = {
  projects: ProjectListItem[]
  error: string | undefined
}

/**
 * Üst bardaki "Aç" düğmesinin listesi: kullanıcının erişebildiği projeler,
 * son güncellenen üstte. Kapsam BİLEREK genel (`GLOBAL_SCOPE`): burası bir
 * yönetici filtre ekranı değil, "benim projelerim" — sunucu zaten erişimi
 * role göre daraltıyor (bkz. knowledge/access-control.md).
 *
 * `useProjectVersions` ile aynı desen: yalnız panel AÇIKKEN çekiliyor ve her
 * açılışta tazeleniyor (`isEnabled` bağımlılığı effect'i yeniden koşturuyor).
 */
export function useMyProjects(isEnabled: boolean): MyProjectsState {
  const [result, setResult] = useState<ProjectsResult | undefined>(undefined)

  useEffect(() => {
    if (!isEnabled) return undefined

    const controller = new AbortController()

    Promise.all(
      PROJECT_STATUSES.map((status) =>
        listProjects(
          {
            status,
            dateFrom: null,
            dateTo: null,
            cityId: null,
            districtId: null,
            projectFirmId: null,
            scope: GLOBAL_SCOPE,
            search: '',
            page: 1,
            pageSize: PAGE_SIZE_PER_STATUS,
            sortBy: 'updatedAt',
            sortDir: 'desc',
          },
          controller.signal,
        ),
      ),
    )
      .then((pages) => {
        if (controller.signal.aborted) return
        const merged = pages
          .flatMap((page) => page.items)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, SWITCHER_LIMIT)
        setResult({ projects: merged, error: undefined })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          projects: [],
          error: cause instanceof Error ? cause.message : 'Projeler alınamadı.',
        })
      })

    return () => controller.abort()
    // Her açılışta TAZE liste: kapalıyken istek yapılmıyor (yalnız `isEnabled`
    // bağımlılığı effect'i tetikliyor, `result` bilerek dışarıda).
  }, [isEnabled])

  return {
    projects: result?.projects ?? [],
    isLoading: isEnabled && result === undefined,
    error: result?.error,
  }
}
