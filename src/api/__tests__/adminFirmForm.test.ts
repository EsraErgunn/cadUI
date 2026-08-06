import { describe, expect, it } from 'vitest'

import {
  DfirmNoTakenError,
  createGasDistributionFirm,
  getGasDistributionFirm,
  getNextDfirmNo,
  updateGasDistributionFirm,
  type GasDistributionFirmPayload,
} from '../adminFirmForm'
import { GAS_FIRM_PAGE_SIZE, getGasDistributionFirms } from '../adminFirms'
import { ApiError } from '../http'

const FIRST_PAGE_QUERY = {
  nameQuery: '',
  groupName: null,
  region: null,
  sortKey: 'dfirmNo',
  sortDir: 'asc',
  page: 1,
  pageSize: GAS_FIRM_PAGE_SIZE,
} as const

function buildPayload(overrides: Partial<GasDistributionFirmPayload> = {}) {
  return {
    dfirmNo: 1,
    name: 'TEST FİRMASI',
    groupName: null,
    description: null,
    contactPerson: null,
    address: null,
    phone: '05551234567',
    ...overrides,
  }
}

/**
 * Mock dizisi modül düzeyinde ve ekleme/güncelleme onu DEĞİŞTİRİYOR. Testler bu
 * yüzden mutlak numaraya değil, o an okunan değere göre kurulu — sıraları
 * değişse de geçerli kalırlar.
 */
describe('getNextDfirmNo', () => {
  it('kullanılmayan bir numara verir', async () => {
    const next = await getNextDfirmNo()
    const created = await createGasDistributionFirm(buildPayload({ dfirmNo: next }))

    expect(created).toBeGreaterThan(0)
  })

  it('kayıt eklendikten sonra ilerler', async () => {
    const before = await getNextDfirmNo()
    await createGasDistributionFirm(buildPayload({ dfirmNo: before }))
    const after = await getNextDfirmNo()

    expect(after).toBeGreaterThan(before)
  })
})

describe('createGasDistributionFirm', () => {
  // KK-9: benzersizliğe sunucu karar verir, istemci ön kontrolü yok.
  it('kullanılmış numarada DfirmNoTakenError yükseltir', async () => {
    const page = await getGasDistributionFirms(FIRST_PAGE_QUERY)
    const takenNo = page.items[0].dfirmNo

    await expect(createGasDistributionFirm(buildPayload({ dfirmNo: takenNo }))).rejects.toBeInstanceOf(
      DfirmNoTakenError,
    )
  })

  // KK-10: yeni kayıt listede ve toplam kayıt adedinde yer alır.
  it('kaydedilen firma listeye ve toplam adede yansır', async () => {
    const uniqueName = `LİSTE TESTİ ${Date.now()}`
    const before = await getGasDistributionFirms(FIRST_PAGE_QUERY)

    await createGasDistributionFirm(
      buildPayload({ dfirmNo: await getNextDfirmNo(), name: uniqueName }),
    )

    const after = await getGasDistributionFirms(FIRST_PAGE_QUERY)
    const found = await getGasDistributionFirms({ ...FIRST_PAGE_QUERY, nameQuery: uniqueName })

    expect(after.totalCount).toBe(before.totalCount + 1)
    expect(found.items.map((firm) => firm.name)).toContain(uniqueName)
  })
})

describe('getGasDistributionFirm', () => {
  it('liste satırının taşımadığı alanları da verir', async () => {
    const page = await getGasDistributionFirms(FIRST_PAGE_QUERY)
    const detail = await getGasDistributionFirm(page.items[0].id)

    expect(detail.id).toBe(page.items[0].id)
    expect(detail).toHaveProperty('description')
    expect(detail).toHaveProperty('contactPerson')
    expect(detail).toHaveProperty('address')
  })

  // Maske yalnız görüntüde; sözleşme ham rakam taşır (core/phone.ts).
  it('telefonu ham rakam olarak verir', async () => {
    const page = await getGasDistributionFirms(FIRST_PAGE_QUERY)
    const detail = await getGasDistributionFirm(page.items[0].id)

    expect(detail.phone).toMatch(/^\d+$/)
  })

  it('olmayan kayıtta ApiError yükseltir', async () => {
    await expect(getGasDistributionFirm(Number.MAX_SAFE_INTEGER)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('updateGasDistributionFirm', () => {
  it('alanları günceller', async () => {
    const id = await createGasDistributionFirm(
      buildPayload({ dfirmNo: await getNextDfirmNo(), name: 'ESKİ AD' }),
    )
    const existing = await getGasDistributionFirm(id)

    await updateGasDistributionFirm(id, {
      ...buildPayload({ dfirmNo: existing.dfirmNo }),
      name: 'YENİ AD',
      contactPerson: 'Ahmet Yılmaz',
    })

    expect((await getGasDistributionFirm(id)).name).toBe('YENİ AD')
  })

  // Kaydın kendisi dışlanmasaydı her güncelleme kendi numarasına takılırdı.
  it('kaydın kendi numarası çakışma sayılmaz', async () => {
    const id = await createGasDistributionFirm(
      buildPayload({ dfirmNo: await getNextDfirmNo() }),
    )
    const existing = await getGasDistributionFirm(id)

    await expect(
      updateGasDistributionFirm(id, buildPayload({ dfirmNo: existing.dfirmNo })),
    ).resolves.toBe(id)
  })

  it('başka kaydın numarasına DfirmNoTakenError yükseltir', async () => {
    const page = await getGasDistributionFirms(FIRST_PAGE_QUERY)
    const [first, second] = page.items

    await expect(
      updateGasDistributionFirm(second.id, buildPayload({ dfirmNo: first.dfirmNo })),
    ).rejects.toBeInstanceOf(DfirmNoTakenError)
  })
})
