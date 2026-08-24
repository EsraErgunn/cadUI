import { describe, expect, it } from 'vitest'

import { fitTextToWidth } from '../pdf/coverPageCells'

const WIDE_PT = 500

describe('fitTextToWidth', () => {
  it('sığan metne dokunmaz', () => {
    expect(fitTextToWidth('Bursa', WIDE_PT, 11)).toEqual({ text: 'Bursa', sizePt: 11 })
  })

  it('taşan metni küçültür ama KIRPMAZ', () => {
    const fitted = fitTextToWidth('30 Ağustos / 2222222222', 125, 11)

    // Küçültme yetiyorsa metnin tamamı kalmalı: sığan bir değer "…" ile
    // kesilmemeli (iki adım birlikte uygulandığında tam sınırda oluyordu).
    expect(fitted.text).toBe('30 Ağustos / 2222222222')
    expect(fitted.sizePt).toBeLessThan(11)
  })

  it('küçültme yetmezse en küçük puntoda kırpar ve devamını "…" ile bildirir', () => {
    const fitted = fitTextToWidth('Altunizade Mahir İz Suat Sümer İş Merkezi', 60, 11)

    expect(fitted.text.endsWith('…')).toBe(true)
    expect(fitted.text.length).toBeLessThan('Altunizade Mahir İz Suat Sümer İş Merkezi'.length)
    expect(fitted.sizePt).toBe(7)
  })

  it('boş metinde punto değiştirmez', () => {
    expect(fitTextToWidth('', 1, 11)).toEqual({ text: '', sizePt: 11 })
  })
})
