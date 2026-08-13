import { describe, expect, it } from 'vitest'

import { queryDocumentList } from '../documentListQuery'
import type { DocumentListQuery, DocumentRow } from '../documents'

function buildDocument(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: 1,
    fileName: 'ruhsat.pdf',
    docTypeCode: 'ruhsat',
    receivedAt: '2026-07-10T11:28:28.000Z',
    unitNames: ['D20'],
    projectId: 3,
    projectName: 'Test Projesi',
    projectPId: '200011555',
    projectFirmId: 11,
    installationNo: '3101752034',
    firmName: 'Anadolu Mühendislik Ltd. Şti.',
    gasFirmName: 'Başkent Doğalgaz Dağıtım A.Ş.',
    sizeBytes: 2048,
    uploadedByName: 'AHMET AKBAYIR',
    contentType: 'application/pdf',
    url: null,
    ...overrides,
  }
}

function buildQuery(overrides: Partial<DocumentListQuery> = {}): DocumentListQuery {
  return {
    dateFrom: null,
    dateTo: null,
    docTypeCode: null,
    projectFirmId: null,
    search: '',
    page: 1,
    pageSize: 30,
    sortBy: 'receivedAt',
    sortDir: 'desc',
    ...overrides,
  }
}

describe('queryDocumentList', () => {
  it('tarih aralığını GELİŞ tarihine göre, gün bazlı kapsayıcı uygular', () => {
    const documents = [
      buildDocument({ id: 1, receivedAt: '2026-07-09T23:59:00.000Z' }),
      buildDocument({ id: 2, receivedAt: '2026-07-10T00:01:00.000Z' }),
      buildDocument({ id: 3, receivedAt: '2026-07-11T12:00:00.000Z' }),
    ]

    const result = queryDocumentList(
      documents,
      buildQuery({ dateFrom: '2026-07-10', dateTo: '2026-07-11' }),
    )

    expect(result.items.map((document) => document.id)).toEqual([3, 2])
    expect(result.totalCount).toBe(2)
  })

  it('arama YALNIZ evrak adında ve Türkçe karakter duyarsız çalışır', () => {
    const documents = [
      buildDocument({ id: 1, fileName: 'İzin-Belgesi.pdf' }),
      // Proje adı eşleşse bile elenmeli: arama evrak adı üzerinde (gereksinim 3).
      buildDocument({ id: 2, fileName: 'ruhsat.pdf', projectName: 'İzinli Proje' }),
    ]

    const result = queryDocumentList(documents, buildQuery({ search: 'izin' }))

    expect(result.items.map((document) => document.id)).toEqual([1])
  })

  it('tip ve firma süzgeçleri birlikte daraltır', () => {
    const documents = [
      buildDocument({ id: 1, docTypeCode: 'ruhsat', projectFirmId: 11 }),
      buildDocument({ id: 2, docTypeCode: 'ruhsat', projectFirmId: 12 }),
      buildDocument({ id: 3, docTypeCode: 'police', projectFirmId: 11 }),
    ]

    const result = queryDocumentList(
      documents,
      buildQuery({ docTypeCode: 'ruhsat', projectFirmId: 11 }),
    )

    expect(result.items.map((document) => document.id)).toEqual([1])
  })

  it('evrak adına göre Türkçe sıralar', () => {
    const documents = [
      buildDocument({ id: 1, fileName: 'dosya.pdf' }),
      buildDocument({ id: 2, fileName: 'çizim.pdf' }),
    ]

    const result = queryDocumentList(
      documents,
      buildQuery({ sortBy: 'fileName', sortDir: 'asc' }),
    )

    // 'ç' Türkçe alfabede 'd'den önce; varsayılan karşılaştırma sonra koyardı.
    expect(result.items.map((document) => document.fileName)).toEqual(['çizim.pdf', 'dosya.pdf'])
  })

  it('aynı damgalı kayıtlar kimliğe göre ayrılır — satır iki sayfada birden çıkmaz', () => {
    const sameMoment = '2026-07-10T11:28:28.000Z'
    const documents = [
      buildDocument({ id: 1, receivedAt: sameMoment }),
      buildDocument({ id: 2, receivedAt: sameMoment }),
      buildDocument({ id: 3, receivedAt: sameMoment }),
    ]

    const firstPage = queryDocumentList(documents, buildQuery({ pageSize: 2 }))
    const secondPage = queryDocumentList(documents, buildQuery({ pageSize: 2, page: 2 }))

    expect(firstPage.items.map((document) => document.id)).toEqual([3, 2])
    expect(secondPage.items.map((document) => document.id)).toEqual([1])
  })

  it('yalnız istenen sayfayı döndürür, toplam filtrelenmiş adedi taşır', () => {
    const documents = Array.from({ length: 7 }, (_unused, index) =>
      buildDocument({ id: index + 1, receivedAt: `2026-07-0${index + 1}T10:00:00.000Z` }),
    )

    const result = queryDocumentList(documents, buildQuery({ page: 2, pageSize: 3 }))

    expect(result.items).toHaveLength(3)
    expect(result.totalCount).toBe(7)
    expect(result.page).toBe(2)
  })
})
