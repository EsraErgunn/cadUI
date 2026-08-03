import { describe, expect, it } from 'vitest'

// `?raw` ile HAM metin: node:fs kullanılmıyor çünkü tsconfig.app'te node tipleri
// yok, jsdom altında import.meta.url da http:// şemasıyla gelip readFileSync'e
// verilemiyor. Ham metin zaten testin konusu — parse edilmiş hali değil.
import sampleJson from '../../../docs/sample-project.json?raw'
import { parseProjectJson, serializeProjectData } from '../serialize'

// Kabul testi (CLAUDE.md "Çalışma şekli"): docs/sample-project.json yükle →
// serileştir → bit bit aynı. Bu test kırmızıyken özellik eklenmez.
describe('roundtrip', () => {
  it('sample-project.json yükle → serileştir → bit bit aynı (float yuvarlanmaz)', () => {
    expect(serializeProjectData(parseProjectJson(sampleJson))).toBe(sampleJson)
  })

  it('örnek dosya yuvarlanınca bozulacak bir ondalık içeriyor', () => {
    // Testin gerçekten bir şey koruduğunun kanıtı: fixture tam sayılara
    // indirgenirse "bit bit aynı" iddiası kendiliğinden doğru olur, bir şey ölçmez.
    const { points } = parseProjectJson(sampleJson)

    expect(points.some((point) => !Number.isInteger(point.x) || !Number.isInteger(point.y))).toBe(
      true,
    )
  })
})
