import { describe, expect, it, vi } from 'vitest'

import { extractProjectJson } from '../../../core/pdf/projectPayload'
import { serializeProjectDataForBackend } from '../../../core/projectExportFormat'
import { parseProjectJson } from '../../../core/serialize'
import { selectProjectData, useCadStore } from '../../../store/cadStore'
import { renderPlanPdf } from '../renderPlanPdf'

/**
 * Font ve logo kısa devre: bu test BELGEYE GÖMÜLEN veriyi sınıyor, sayfaların
 * görünümünü değil. Sayfa da basılmıyor (`pages: []`), dolayısıyla yazı tipine
 * hiç ihtiyaç yok — gerçek TTF'i okumak testi `node:fs`e bağlardı ve tsconfig
 * node tiplerini taşımıyor (bkz. core/__tests__/roundtrip.test.ts).
 */
vi.mock('../planPdfFont', () => ({
  PDF_FONT_FAMILY: 'Roboto',
  embedPdfFont: () => Promise.resolve(),
}))
vi.mock('../planPdfLogo', () => ({ loadPdfLogo: () => Promise.reject(new Error('test')) }))

/**
 * Veri ELLE kurulmuyor: "Proje Dosyasını İndir"in gerçekte gömdüğü şeyin aynısı
 * üretiliyor. Elle yazılmış bir örnek, biçim değişince testi sessizce
 * gerçeklikten koparırdı.
 */
const PROJECT_JSON = serializeProjectDataForBackend(selectProjectData(useCadStore.getState()))

async function renderPdfText(projectJson: string): Promise<string> {
  const blob = await renderPlanPdf({
    pages: [],
    paper: 'A4',
    orientation: 'portrait',
    scale: '1:50',
    cover: undefined,
    sitePlan: undefined,
    isometric: undefined,
    projectJson,
  })

  // "Proje Dosyasını Aç"ın yaptığının aynısı: baytları latin1 ile oku.
  return new TextDecoder('latin1').decode(await blob.arrayBuffer())
}

describe('proje dosyası gidiş-dönüşü', () => {
  it('indirilen PDF çizimi kayıpsız geri veriyor', async () => {
    const recovered = extractProjectJson(await renderPdfText(PROJECT_JSON))

    // Kâğıttaki vektörler değil, GÖMÜLÜ veri okunuyor: bit bit aynı olmalı.
    expect(recovered).toBe(PROJECT_JSON)
    // Ve store'a girmeden önceki şemadan geçiyor (bozuk dosya reddedilir).
    expect(() => parseProjectJson(recovered!)).not.toThrow()
  })

  it('Türkçe karakterli metin bozulmadan dönüyor', async () => {
    // Kodlama tuzağı: base64 olmasaydı "Ğ Ş İ" burada bozulurdu.
    const json = JSON.stringify({ ...JSON.parse(PROJECT_JSON), label: 'Şişli Ğ Çıkış İ' })

    expect(extractProjectJson(await renderPdfText(json))).toBe(json)
  })

  it('gömülü verisi olmayan bir PDF için undefined döner', async () => {
    // Başka programın PDF'i: sessizce boş proje yüklenmemeli.
    const pdfText = await renderPdfText(PROJECT_JSON)

    expect(extractProjectJson(pdfText.replaceAll('starcad:projectData', 'other:data'))).toBeUndefined()
  })
})
