import { describe, expect, it } from 'vitest'

import { includesTr, normalizeTr } from '../turkishText'

describe('normalizeTr', () => {
  it('büyük İ ile küçük i aynı anahtara iner (birleşen nokta bırakmaz)', () => {
    expect(normalizeTr('İ')).toBe('i')
    expect(normalizeTr('İ')).toHaveLength(1)
    expect(normalizeTr('İZMİR')).toBe(normalizeTr('izmir'))
  })

  it('noktasız ı ile I aynı anahtara iner', () => {
    expect(normalizeTr('ı')).toBe('i')
    expect(normalizeTr('I')).toBe('i')
    expect(normalizeTr('IĞDIR')).toBe(normalizeTr('ığdır'))
  })

  it('ş/ğ/ü/ö/ç harflerini ASCII karşılığına indirger', () => {
    expect(normalizeTr('ŞĞÜÖÇ')).toBe('sguoc')
    expect(normalizeTr('şğüöç')).toBe('sguoc')
  })

  it('Türkçe olmayan karakterlere dokunmaz, sadece küçültür', () => {
    expect(normalizeTr('Gaz A.Ş. 12')).toBe('gaz a.s. 12')
  })
})

describe('includesTr', () => {
  it('kelime metnin ortasında geçse de bulur', () => {
    expect(includesTr('Başkent Doğalgaz Dağıtım A.Ş.', 'gaz')).toBe(true)
  })

  it('arama terimi farklı yazımla girilse de bulur', () => {
    expect(includesTr('İzmirgaz Dağıtım', 'izmirgaz')).toBe(true)
    expect(includesTr('Iğdır Doğalgaz', 'IĞDIR')).toBe(true)
    expect(includesTr('Çorum Gaz', 'corum')).toBe(true)
  })

  it('eşleşmeyen terim için false döner', () => {
    expect(includesTr('Başkent Doğalgaz', 'elektrik')).toBe(false)
  })

  it('boş arama terimi her kaydı eşler', () => {
    expect(includesTr('Başkent Doğalgaz', '')).toBe(true)
  })
})
