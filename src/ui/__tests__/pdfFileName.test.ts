import { describe, expect, it } from 'vitest'

import { toProjectFileName } from '../pdf/useExportPdf'

describe('toProjectFileName', () => {
  it('<proje numarası>.starcad.pdf', () => {
    expect(toProjectFileName('PRJ-2026-0431')).toBe('PRJ-2026-0431.starcad.pdf')
  })

  it('UZANTI .pdf kalır: dosya gerçekten PDF, işletim sistemi de öyle görmeli', () => {
    // `.starcad` uzantı olsaydı çift tıklayınca görüntüleyici açılmaz, basmak
    // için elle yeniden adlandırmak gerekirdi.
    expect(toProjectFileName('1').endsWith('.pdf')).toBe(true)
  })

  it('kat adı gibi bir EK almaz: dosya projenin tamamını taşıyor', () => {
    // Seçilen sayfa/kat kapsamı çıktının GÖRÜNEN kısmını belirliyor; gömülü
    // veri her zaman projenin tamamı, ad da projeyi adlandırıyor.
    expect(toProjectFileName('2005951489')).toBe('2005951489.starcad.pdf')
  })

  it('dosya adında YASAK karakterler temizlenir', () => {
    // Proje numarası serbest metin: kullanıcı eğik çizgi yazabiliyor ve
    // tarayıcı böyle bir adı ya reddeder ya da yolu böler.
    expect(toProjectFileName('2026/07:*?"<>|')).toBe('2026-07-------.starcad.pdf')
  })

  it('Türkçe karakterler KORUNUR: dosya adı okunur kalmalı', () => {
    expect(toProjectFileName('PRJ-Çatı')).toBe('PRJ-Çatı.starcad.pdf')
  })

  it('baştaki ve sondaki boşluklar atılır', () => {
    expect(toProjectFileName('  PRJ-1  ')).toBe('PRJ-1.starcad.pdf')
  })
})
