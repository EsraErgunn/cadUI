import { describe, expect, it } from 'vitest'

import { buildProjectFileName } from '../exportProject'

// Yerel saat: 3 Ağustos 2026, 09:05.
const at = new Date(2026, 7, 3, 9, 5)

describe('buildProjectFileName', () => {
  it('proje kimliği ve yerel zaman damgasıyla ad üretir', () => {
    expect(buildProjectFileName(12, at)).toBe('starcad-proje-12-20260803-0905.json')
  })

  it('ay, gün, saat ve dakikayı iki haneye tamamlar', () => {
    // Sıfır doldurma olmazsa adlar alfabetik sıralamada karışır (…-9-… > …-10-…).
    expect(buildProjectFileName(1, new Date(2026, 0, 9, 3, 4))).toBe(
      'starcad-proje-1-20260109-0304.json',
    )
  })

  it('proje kimliği yokken de dosya adı üretir', () => {
    // İndirme engellenmez: kullanıcının çizimi kaybolmasın.
    expect(buildProjectFileName(undefined, at)).toBe('starcad-proje-20260803-0905.json')
  })
})
