import { describe, expect, it } from 'vitest'

import {
  MAX_DOCUMENT_SIZE_BYTES,
  OVERSIZE_FILE_MESSAGE,
  UNSUPPORTED_FORMAT_MESSAGE,
  partitionDocumentFiles,
  validateDocumentFile,
} from '../documentFiles'

function buildFile(name: string, sizeBytes = 1024): File {
  const file = new File(['x'], name)
  // jsdom `File.size` içeriğe bağlı ve salt okunur; boyut sınırını sınamak için
  // tanımı üzerine yazılıyor.
  Object.defineProperty(file, 'size', { value: sizeBytes })
  return file
}

describe('validateDocumentFile', () => {
  it('desteklenen biçimleri kabul eder', () => {
    expect(validateDocumentFile(buildFile('ruhsat.pdf'))).toBeNull()
    // Uzantı büyük harfle de kabul edilir.
    expect(validateDocumentFile(buildFile('RUHSAT.PDF'))).toBeNull()
  })

  it('desteklenmeyen biçimi reddeder', () => {
    // .dwg listede görünebiliyor ama YÜKLENEMİYOR (karar 2).
    expect(validateDocumentFile(buildFile('kolon.dwg'))).toBe(UNSUPPORTED_FORMAT_MESSAGE)
    expect(validateDocumentFile(buildFile('uzantisiz'))).toBe(UNSUPPORTED_FORMAT_MESSAGE)
    // Sunucu YALNIZ PDF alıyor; gereksinim 8'deki diğer altı biçim de reddedilir.
    expect(validateDocumentFile(buildFile('foto.jpeg'))).toBe(UNSUPPORTED_FORMAT_MESSAGE)
    expect(validateDocumentFile(buildFile('plan.alp'))).toBe(UNSUPPORTED_FORMAT_MESSAGE)
  })

  it('10 MB sınırını aşan dosyayı reddeder, sınırdakini kabul eder', () => {
    expect(validateDocumentFile(buildFile('buyuk.pdf', MAX_DOCUMENT_SIZE_BYTES + 1))).toBe(
      OVERSIZE_FILE_MESSAGE,
    )
    expect(validateDocumentFile(buildFile('tam.pdf', MAX_DOCUMENT_SIZE_BYTES))).toBeNull()
  })
})

describe('partitionDocumentFiles', () => {
  it('geçersiz dosya listeye girmez, geçerliler kalır', () => {
    const files = [
      buildFile('ruhsat.pdf'),
      buildFile('kolon.dwg'),
      buildFile('buyuk.pdf', MAX_DOCUMENT_SIZE_BYTES + 1),
      buildFile('plan.pdf'),
    ]

    const { accepted, rejected } = partitionDocumentFiles(files)

    expect(accepted.map((file) => file.name)).toEqual(['ruhsat.pdf', 'plan.pdf'])
    expect(rejected).toEqual([
      { fileName: 'kolon.dwg', message: UNSUPPORTED_FORMAT_MESSAGE },
      { fileName: 'buyuk.pdf', message: OVERSIZE_FILE_MESSAGE },
    ])
  })
})
