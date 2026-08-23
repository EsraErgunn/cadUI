import { buildLabelSvg, type PlanLabelledItem } from './planSvgLabels'
import { n, svgPolyline, PLAN_COLORS, SVG_COLORS } from './svgPrimitives'
import { getDischargeRunGeometry } from '../../plumbing/core/dischargeGeometry'
import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { getLineOuterWidthCm, isDischargeKind } from '../../plumbing/core/lineKinds'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import type { PlanPoint } from '../coords'
import type { Id } from '../model'

export type PlanSymbolAsset = {
  /** Sembol svg'sinin İÇERİĞİ (dış `<svg>` kabuğu atılmış). */
  body: string
  /** Bağlanma noktasının sembolün kendi svg koordinatındaki yeri. */
  originX: number
  originY: number
}

/** Elemanın yanına yazılacak satırlar; boşsa etiket çizilmez. */
export type PlanElementLabel = {
  anchor: PlanPoint
  lines: readonly string[]
}

/** Kanal duvarı ve uç kapağının çizgi kalınlığı (cm). */
const DISCHARGE_WALL_STROKE_CM = 2
const DISCHARGE_MARK_STROKE_CM = 1

export type PlanInstallationInput = {
  lines: readonly InstallationLine[]
  elements: readonly InstallationElement[]
  floorId: Id
  /**
   * Hattın rengini çözer. Callback olarak DIŞARIDAN geliyor çünkü renk kuralı
   * `plumbing/scene/lineStyle.ts`'te ve `core/` sahne katmanından import edemez
   * (CLAUDE.md kural 1/2). Renk bir sunum kararı; geometri burada, palet orada.
   */
  resolveColor: (line: InstallationLine) => string
  /**
   * Elemanın sembolünü çözer. Aynı gerekçe: varlıklar `plumbing/assets` altında
   * ve bundler'a bağlı (`import.meta.glob`), core saf kalmalı.
   */
  resolveSymbol: (type: InstallationElementType) => PlanSymbolAsset | undefined
  /**
   * Elemanın etiketi. Metni ÇAĞIRAN kuruyor: hangi cihazda hangi alanın
   * yazılacağı tesisat alan bilgisi (`elementProperties.ts`), core'un işi değil.
   */
  resolveLabel: (element: InstallationElement) => PlanElementLabel | undefined
  /** Etiket yazı tipi; PDF'e gömülen fontun adıyla aynı olmalı. */
  fontFamily: string
}

/**
 * Tesisat hatları ve elemanları.
 *
 * ⚠️ Baca/havalandırma BORU DEĞİL: sabit genişlikte, içi boş, ÇİFT ÇİZGİLİ bir
 * kanal olarak çizilir (ekrandaki `DischargeRunMesh` ile aynı geometri —
 * `getDischargeRunGeometry`). Tek kalın çizgi olsaydı en kalın borudan yalnız
 * iki kat kalın görünür, "kanal" olduğu okunmazdı.
 *
 * Gaz borusunda genişlik ÇAPTAN gelir; ekranda çizgi kalınlığı ekran-pikseli ve
 * zoom'a bağlı, kâğıtta gerçek cm — ölçekli paftada boru kalınlığı ölçülebilir
 * bir bilgidir.
 */
export function buildPlanInstallationSvg(input: PlanInstallationInput): string[] {
  const { lines, elements, floorId, resolveColor, resolveSymbol, resolveLabel } = input

  const floorLines = lines.filter(
    (line) => line.floorId === floorId && line.points.length >= 2,
  )

  const pipes = floorLines.flatMap((line) => {
    const centerline = line.points.map((point) => point.position)
    const color = resolveColor(line) || SVG_COLORS.ink

    if (!isDischargeKind(line.kind)) {
      return [svgPolyline(centerline, getLineOuterWidthCm(line), color, true)]
    }

    // Cihaza giren uç KAPATILMAZ: kanal oraya bağlanıyor, orada duvarı yok
    // (DischargeRunMesh ile aynı seçim).
    return getDischargeRunGeometry(line.kind, centerline, {
      hasStartCap: false,
      hasEndCap: true,
    }).map((stroke) =>
      svgPolyline(
        stroke.points,
        stroke.role === 'mark' ? DISCHARGE_MARK_STROKE_CM : DISCHARGE_WALL_STROKE_CM,
        color,
      ),
    )
  })

  const floorElements = elements.filter((element) => element.floorId === floorId)

  const symbols = floorElements.flatMap((element) => {
    const asset = resolveSymbol(element.type)
    // Sembolü çözülemeyen eleman çizilmez; ekranda da yer tutucuya düşüyor.
    if (!asset) return []

    return [`<g transform="${toSymbolTransform(element, asset)}">${asset.body}</g>`]
  })

  const labelled = floorElements.flatMap((element): PlanLabelledItem[] => {
    const label = resolveLabel(element)
    if (!label) return []

    // Kılavuz elemanın KONUMUNDAN çıkar: sembolün bağlanma noktası orasıdır.
    return [{ origin: element.position, anchor: label.anchor, lines: label.lines }]
  })

  // Elemanlar hatların ÜSTÜNDE (armatür borunun üstüne oturur), etiketler en üstte.
  return [...pipes, ...symbols, ...buildLabelSvg(labelled, input.fontFamily, PLAN_COLORS.installationText)]
}

/**
 * Sembolün kendi svg uzayından çıktı uzayına dönüşüm.
 *
 * Zincir sağdan sola okunur: önce bağlanma noktası sıfıra çekilir, sonra
 * elemanın ölçeği, sonra açısı, en son konumu uygulanır.
 *
 * ⚠️ İki işaret çevrilmesi var ve ikisi de kasıtlı:
 * - `translate`in y'si `-position.y`, çünkü çıktı svg'sinde y AŞAĞI büyür.
 * - `rotate` açısı `-angleDeg`, çünkü plan açısı saat yönünün TERSİNE ölçülür
 *   ama svg `rotate()` saat yönünde pozitiftir.
 *
 * Sembolün İÇ koordinatı çevrilmez: kaynak svg de y-aşağı, çıktı svg'si de
 * y-aşağı — ikisi aynı yönde olduğu için arada yalnız öteleme kalıyor.
 */
function toSymbolTransform(element: InstallationElement, asset: PlanSymbolAsset): string {
  return (
    `translate(${n(element.position.x)} ${n(-element.position.y)}) ` +
    `rotate(${n(-element.angleDeg)}) ` +
    `scale(${n(element.scale)}) ` +
    `translate(${n(-asset.originX)} ${n(-asset.originY)})`
  )
}
