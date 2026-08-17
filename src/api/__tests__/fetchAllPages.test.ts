import { describe, expect, it, vi } from 'vitest'

import { fetchAllPages, type PagedResult } from '../listQuery'

/** Sunucuyu taklit eder: `pageSize` istenen değil KIRPILMIŞ değerle döner. */
function fakeServer(totalCount: number, maxPageSize = 100) {
  const rows = Array.from({ length: totalCount }, (_, index) => index + 1)

  return vi.fn(({ page, pageSize }: { page: number; pageSize: number }) => {
    const effective = Math.min(pageSize, maxPageSize)
    const start = (page - 1) * effective

    return Promise.resolve<PagedResult<number>>({
      items: rows.slice(start, start + effective),
      totalCount,
      page,
      pageSize: effective,
    })
  })
}

describe('fetchAllPages', () => {
  it('tek sayfaya sığan listeyi tek istekle çeker', async () => {
    const fetchPage = fakeServer(4)

    expect(await fetchAllPages(fetchPage)).toHaveLength(4)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  /**
   * Asıl regresyon: uç parametresiz çağrıda 30 kayıt veriyor ve sunucu
   * `PageSize=1000` isteğini 100'e kırpıyor. Tek istekle yetinilseydi 101.
   * kayıttan sonrası sessizce kaybolurdu.
   */
  it('birden fazla sayfayı toplar ve hepsini döndürür', async () => {
    const fetchPage = fakeServer(250)

    const all = await fetchAllPages(fetchPage)

    expect(all).toHaveLength(250)
    expect(all[0]).toBe(1)
    expect(all[249]).toBe(250)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('sayfa sayısını İSTENEN değil DÖNEN pageSize üzerinden hesaplar', async () => {
    // Sunucu 25'e kırpıyor: 120 kayıt beş sayfa eder, dört değil.
    const fetchPage = fakeServer(120, 25)

    expect(await fetchAllPages(fetchPage)).toHaveLength(120)
    expect(fetchPage).toHaveBeenCalledTimes(5)
  })

  it('tam bölünen toplamda fazladan istek atmaz', async () => {
    const fetchPage = fakeServer(200)

    expect(await fetchAllPages(fetchPage)).toHaveLength(200)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('boş listede tek istek atar', async () => {
    const fetchPage = fakeServer(0)

    expect(await fetchAllPages(fetchPage)).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  /** `totalCount` şişik gelirse döngü boş sayfada durur, sonsuza gitmez. */
  it('beklenenden erken biten listede boş sayfada durur', async () => {
    const fetchPage = vi.fn(({ page, pageSize }: { page: number; pageSize: number }) =>
      Promise.resolve<PagedResult<number>>({
        items: page === 1 ? [1, 2, 3] : [],
        totalCount: 9999,
        page,
        pageSize,
      }),
    )

    expect(await fetchAllPages(fetchPage)).toEqual([1, 2, 3])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('pageSize sıfır gelirse sonsuz döngüye girmez', async () => {
    const fetchPage = vi.fn(({ page }: { page: number }) =>
      Promise.resolve<PagedResult<number>>({
        items: page === 1 ? [1] : [],
        totalCount: 5,
        page,
        pageSize: 0,
      }),
    )

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1])
  })
})
