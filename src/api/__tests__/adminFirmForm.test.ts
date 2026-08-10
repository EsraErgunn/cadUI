import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DfirmNoTakenError,
  createGasDistributionFirm,
  getGasDistributionFirm,
  getNextDfirmNo,
  updateGasDistributionFirm,
  type GasDistributionFirmPayload,
} from '../adminFirmForm'
import { ApiError } from '../http'

const DETAIL_DTO = {
  id: 42,
  title: 'ADANA DOĞALGAZ',
  companyNumber: 1204,
  groupId: 1,
  groupName: 'AKSA',
  contactPerson: 'Ahmet Yılmaz',
  description: 'Akdeniz bölgesi.',
  phone: '05321000000',
  address: 'Adana OSB No: 1',
}

const PAYLOAD: GasDistributionFirmPayload = {
  dfirmNo: 115,
  name: 'YENİ FİRMA',
  groupId: 3,
  description: null,
  contactPerson: null,
  address: null,
  phone: '05551234567',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return { url: String(url), method: init.method as string, body: init.body as string | undefined }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getGasDistributionFirm', () => {
  it('tekil uca gider ve alan adlarını çevirir', async () => {
    const fetchMock = stubFetch(jsonResponse(DETAIL_DTO))

    const detail = await getGasDistributionFirm(42)

    expect(requestOf(fetchMock).url).toContain('/api/gasdistributionfirms/42')
    expect(requestOf(fetchMock).method).toBe('GET')
    expect(detail.dfirmNo).toBe(1204)
    expect(detail.name).toBe('ADANA DOĞALGAZ')
  })

  it('telefonun null gelmesi kaydı bozmaz', async () => {
    stubFetch(jsonResponse({ ...DETAIL_DTO, phone: null }))

    expect((await getGasDistributionFirm(42)).phone).toBeNull()
  })

  it('bulunamayan kayıtta ApiError yükseltir', async () => {
    stubFetch(jsonResponse({ message: 'Gaz dağıtım firması bulunamadı.' }, 404))

    await expect(getGasDistributionFirm(999)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createGasDistributionFirm', () => {
  it('sunucu alan adlarıyla POST gönderir', async () => {
    const fetchMock = stubFetch(jsonResponse({ ...DETAIL_DTO, id: 500 }))

    const id = await createGasDistributionFirm(PAYLOAD)

    const request = requestOf(fetchMock)
    expect(request.method).toBe('POST')
    expect(request.url).toContain('/api/gasdistributionfirms')
    expect(JSON.parse(request.body ?? '{}')).toEqual({
      title: 'YENİ FİRMA',
      companyNumber: 115,
      groupId: 3,
      description: null,
      contactPerson: null,
      phone: '05551234567',
      address: null,
    })
    // Ekleme 201 değil 200 + tam detay döndürüyor; çağıranın ihtiyacı kimlik.
    expect(id).toBe(500)
  })

  it('gövdeye bölge alanı KOYMAZ', async () => {
    const fetchMock = stubFetch(jsonResponse(DETAIL_DTO))

    await createGasDistributionFirm(PAYLOAD)

    expect(JSON.parse(requestOf(fetchMock).body ?? '{}')).not.toHaveProperty('region')
  })

  // KK-9: benzersizliğe sunucu karar verir; 409 DURUM KODUNDAN tanınır.
  it('409 yanıtını DfirmNoTakenError yapar', async () => {
    stubFetch(jsonResponse({ message: 'Bu firma numarası zaten kullanılıyor.' }, 409))

    await expect(createGasDistributionFirm(PAYLOAD)).rejects.toBeInstanceOf(DfirmNoTakenError)
  })

  it('diğer hataları olduğu gibi geçirir', async () => {
    stubFetch(jsonResponse({ message: 'Sunucu hatası' }, 500))

    await expect(createGasDistributionFirm(PAYLOAD)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('updateGasDistributionFirm', () => {
  it('PUT gönderir ve çağıranın kimliğini geri verir', async () => {
    // Sunucu yalnız `{ message }` döndürüyor, kimlik vermiyor.
    const fetchMock = stubFetch(jsonResponse({ message: 'Güncellendi.' }))

    const id = await updateGasDistributionFirm(42, PAYLOAD)

    expect(requestOf(fetchMock).method).toBe('PUT')
    expect(requestOf(fetchMock).url).toContain('/api/gasdistributionfirms/42')
    expect(id).toBe(42)
  })

  it('409 yanıtını DfirmNoTakenError yapar', async () => {
    stubFetch(jsonResponse({ message: 'Bu firma numarası zaten kullanılıyor.' }, 409))

    await expect(updateGasDistributionFirm(42, PAYLOAD)).rejects.toBeInstanceOf(DfirmNoTakenError)
  })
})

/**
 * Sunucuda karşılığı HENÜZ YOK: uç açılana kadar mock hesaplıyor, bu yüzden
 * ağa hiç çıkmıyor.
 */
describe('getNextDfirmNo', () => {
  it('ağa çıkmadan sıradaki numarayı verir', async () => {
    const fetchMock = stubFetch()

    expect(await getNextDfirmNo()).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
