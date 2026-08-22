import { describe, expect, it } from 'vitest'

import {
  buildProjectMetadataXml,
  decodeProjectPayload,
  encodeProjectPayload,
  extractProjectJson,
} from '../pdf/projectPayload'

/** Türkçe karakter ve XML'i bozacak işaretler bilerek içeride. */
const JSON_SAMPLE = '{"name":"Şişli & Kağıthane <proje>","walls":[{"id":1,"t":"20\\""}]}'

describe('projectPayload', () => {
  it('base64 gidiş-dönüşü metni bit bit korur', () => {
    expect(decodeProjectPayload(encodeProjectPayload(JSON_SAMPLE))).toBe(JSON_SAMPLE)
  })

  it('XML paketini bozacak karakterleri dışarı sızdırmaz', () => {
    const xml = buildProjectMetadataXml(JSON_SAMPLE)

    // Base64 alfabesi dışında hiçbir şey yok: `<`, `&`, tırnak paketi bozardı.
    const payload = /<starcad:projectData>(.*)<\/starcad:projectData>/.exec(xml)?.[1] ?? ''
    expect(payload).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  it('gömülü veriyi PDF metninden geri okur', () => {
    // PDF'in gerçek yapısını taklit etmeye gerek yok: arama düz metin üzerinde.
    const pdfText = `%PDF-1.3\n<x:xmpmeta>${buildProjectMetadataXml(JSON_SAMPLE)}</x:xmpmeta>\n%%EOF`

    expect(extractProjectJson(pdfText)).toBe(JSON_SAMPLE)
  })

  it('başka programın PDF"inde veri yoksa undefined döner', () => {
    // Sessizce boş proje yüklenmemeli; çağıran bunu hataya çeviriyor.
    expect(extractProjectJson('%PDF-1.7\nbaşka bir belge\n%%EOF')).toBeUndefined()
  })

  it('bozuk base64"te undefined döner, patlamaz', () => {
    const pdfText = '<starcad:projectData>!!! bu base64 değil !!!</starcad:projectData>'

    expect(extractProjectJson(pdfText)).toBeUndefined()
  })
})
