import type { PlanElementLabel, PlanSymbolAsset } from '../../core/pdf/planSvgInstallation'
import { getElementWorldBoundsCm, hasElementNameLabel } from '../../plumbing/core/elementLabel'
import type { InstallationElement } from '../../plumbing/core/installationModel'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'

/*
 * Sembollerin HAM SVG'si. `symbolLoader.ts` aynı varlıkları okuyor ama onları
 * three.js geometrisine çeviriyor; PDF'in istediği metnin kendisi. Ayrı bir
 * okuyucu olmasının sebebi bu — mantık kopyalanmıyor, aynı dosyalar başka bir
 * biçimde okunuyor. `symbolLoader` fay C'nin dosyası, dokunulmadı.
 *
 * Vite `?raw` ile derleme zamanında gömüyor: ağ isteği yok, PDF üretimi senkron
 * kalıyor.
 */
const svgSources = import.meta.glob('../../plumbing/assets/symbols/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

/** Dış `<svg>` kabuğunu atar: içerik bir `<g transform>` içine gömülecek. */
function toInnerMarkup(svgText: string): string {
  const opening = svgText.indexOf('>')
  const closing = svgText.lastIndexOf('</svg>')
  if (opening < 0 || closing < 0) return ''

  return svgText.slice(opening + 1, closing).trim()
}

const bodyByAsset = new Map<string, string>()
for (const [path, source] of Object.entries(svgSources)) {
  const fileName = path.split('/').pop()
  if (fileName) bodyByAsset.set(fileName, toInnerMarkup(source))
}

/**
 * Elemanın PDF'e gömülecek sembolü.
 *
 * `origin` metadata'dan gelir ve sembolün KENDİ svg koordinatındaki bağlanma
 * noktasıdır; eleman konumu bu noktaya oturur (sahnedeki `bakeToLocalPlanSpace`
 * de aynı noktayı sıfıra çekiyor).
 *
 * ⚠️ Sembol svg'sinin 1 birimi 1 SANTİMDİR: `element.scale` metadata'daki doğal
 * boya çarpan, `bounds` da plan cm olarak kullanılıyor (elementPicking.ts).
 */
export function resolveSymbolAsset(
  type: InstallationElementType,
): PlanSymbolAsset | undefined {
  const metadata = getSymbolMetadata(type)
  const body = bodyByAsset.get(metadata.asset)
  if (!body) return undefined

  return { body, originX: metadata.origin[0], originY: metadata.origin[1] }
}

/** Etiketin sembol kutusunun üstünde duracağı pay (cm). Ekranda bu ekran-piksel;
 *  kâğıtta ölçek sabit olduğu için doğrudan cm verilir. */
const LABEL_MARGIN_CM = 10

/** Cihazlarda ADIN yanına yazılacak tek ek alan. Serbest metin (birim dayatılmaz). */
function getCapacityText(element: InstallationElement): string {
  const properties =
    element.stove ??
    element.spaceHeater ??
    element.combiBoiler ??
    element.waterHeater ??
    element.boiler ??
    element.otherAppliance
  return properties?.capacity?.trim() ?? ''
}

/**
 * Elemanın kâğıda yazılacak etiketi.
 *
 * MİNİMUM tutuluyor: ad + varsa kapasite. Referans paftada cihaz başına marka,
 * model, verim, brülör tipi gibi bir blok var ama bizde o alanların çoğu serbest
 * metin ve çoğu projede BOŞ — hepsini basmak boş satırlar üretirdi. Yazılan
 * alan kullanıcının GİRDİĞİ değerdir, birim uydurulmaz.
 *
 * Vana gibi ad taşımayan türler `hasElementNameLabel` ile eleniyor — ekranda da
 * etiketsiz çiziliyorlar.
 */
export function resolveElementLabel(element: InstallationElement): PlanElementLabel | undefined {
  if (!hasElementNameLabel(element.type)) return undefined

  const metadata = getSymbolMetadata(element.type)
  const lines = [metadata.label, getCapacityText(element)].filter((line) => line.length > 0)
  if (lines.length === 0) return undefined

  // Kullanıcı etiketi taşıdıysa onun kaydı kazanır; taşımadıysa kutunun üstü.
  // Ekrandaki `getElementLabelAnchorCm` zoom'a bağlı, kâğıtta zoom yok.
  const anchor = element.labelOffsetCm
    ? {
        x: element.position.x + element.labelOffsetCm.x,
        y: element.position.y + element.labelOffsetCm.y,
      }
    : (() => {
        const bounds = getElementWorldBoundsCm(element, metadata)
        return { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY + LABEL_MARGIN_CM }
      })()

  return { anchor, lines }
}
