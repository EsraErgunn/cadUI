import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  saveProjectFirmAuthorizations,
  type ProjectFirmAuthorizationPayload,
} from '../projectFirmForm'

const FIRM_ID = 900

function buildPayload(
  gasDistributionFirmId: number,
  gasDistributionFirmName: string,
): ProjectFirmAuthorizationPayload {
  return {
    gasDistributionFirmId,
    gasDistributionFirmName,
    certificateNumber: `ST-${gasDistributionFirmId}`,
    validFrom: '2026-01-01',
    validTo: null,
  }
}

const ROWS = [
  buildPayload(10, 'AKSA-GEMLİK'),
  buildPayload(11, 'AKSA-ADANA'),
  buildPayload(12, 'ENERYA-KONYA'),
]

/** Gövdedeki `gasDistributionFirmId`ye göre yanıt üreten sahte fetch. */
function stubFetch(failingFirmIds: readonly number[]) {
  const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { gasDistributionFirmId: number }

    return Promise.resolve(
      failingFirmIds.includes(body.gasDistributionFirmId)
        ? new Response(JSON.stringify({ message: 'Yetki kaydı oluşturulamadı.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(null, { status: 204 }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Uç toplu gövde kabul etmiyor: satır başına bir `POST`. Firma kaydı bu
 * çağrıdan ÖNCE geçtiği ve geri ALINMADIĞI için kısmi başarı gerçek bir hâl —
 * kullanıcı hangi bağların kurulamadığını görmeli.
 */
describe('saveProjectFirmAuthorizations', () => {
  it('hepsi geçerse başarısız firma bırakmaz', async () => {
    const fetchMock = stubFetch([])

    const result = await saveProjectFirmAuthorizations(FIRM_ID, ROWS)

    expect(result).toEqual({ arePersisted: true, failedGasFirmNames: [] })
    expect(fetchMock).toHaveBeenCalledTimes(ROWS.length)
  })

  /**
   * İlk hatada çıkılsaydı sonraki firmalar HİÇ denenmez ve kullanıcı kaç bağın
   * kurulduğunu bilemezdi; döngü devam ediyor, hatalar toplanıyor.
   */
  it('bir satır düşse de kalanları dener ve düşenleri ADIYLA söyler', async () => {
    const fetchMock = stubFetch([11])

    const result = await saveProjectFirmAuthorizations(FIRM_ID, ROWS)

    expect(result).toEqual({ arePersisted: false, failedGasFirmNames: ['AKSA-ADANA'] })
    expect(fetchMock).toHaveBeenCalledTimes(ROWS.length)
  })

  it('hepsi düşerse üçünü de sayar', async () => {
    stubFetch([10, 11, 12])

    const result = await saveProjectFirmAuthorizations(FIRM_ID, ROWS)

    expect(result.arePersisted).toBe(false)
    expect(result.failedGasFirmNames).toEqual(['AKSA-GEMLİK', 'AKSA-ADANA', 'ENERYA-KONYA'])
  })

  /** Ad yalnız hata mesajı için taşınıyor; gövdeye GİRMİYOR. */
  it('firma adını istek gövdesine yazmaz', async () => {
    const fetchMock = stubFetch([])

    await saveProjectFirmAuthorizations(FIRM_ID, [ROWS[0]])

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('gasDistributionFirmName')
    expect(body).toMatchObject({ projectFirmId: FIRM_ID, gasDistributionFirmId: 10 })
  })
})
