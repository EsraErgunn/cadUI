import { getPlanBounds, type PlanBounds } from './paper'
import { buildPlanAnnotationsSvg } from './planSvgAnnotations'
import { buildPlanOpeningsSvg, buildPlanRoomsSvg } from './planSvgArchitecture'
import {
  buildPlanInstallationSvg,
  type PlanElementLabel,
  type PlanSymbolAsset,
} from './planSvgInstallation'
import { buildPlanObjectsSvg, buildPlanTextsSvg } from './planSvgObjects'
import { n, svgLine, PLAN_COLORS, WALL_OUTLINE_CM } from './svgPrimitives'
import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import type { PlanPoint } from '../coords'
import type {
  AreaObject,
  Beam,
  Id,
  Opening,
  Point,
  PointSymbol,
  Room,
  TextLabel,
  Wall,
} from '../model'
import { buildPointIndex } from '../wall'
import { getWallCapsuleFrom } from '../wallShape'

/**
 * Sembol ve etiketin konumundan taşabileceği pay (cm). Gerçek kutuyu hesaplamak
 * sembol meta verisini core'a taşırdı; kaba ama güvenli bir pay yeterli çünkü
 * sonuç yalnız sayfa sınırını büyütüyor.
 */
const ELEMENT_EXTENT_MARGIN_CM = 60
const LABEL_EXTENT_MARGIN_CM = 40

export type PlanSvgInput = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  rooms: readonly Room[]
  symbols: readonly PointSymbol[]
  areaObjects: readonly AreaObject[]
  beams: readonly Beam[]
  texts: readonly TextLabel[]
  installationLines: readonly InstallationLine[]
  installationElements: readonly InstallationElement[]
  floorId: Id
  /** Yazı tipi ailesi; PDF'e gömülen fontun adıyla AYNI olmalı. */
  fontFamily: string
  resolveLineColor: (line: InstallationLine) => string
  resolveSymbolAsset: (type: InstallationElementType) => PlanSymbolAsset | undefined
  resolveElementLabel: (element: InstallationElement) => PlanElementLabel | undefined
}

export type PlanSvg = {
  /** Tam SVG belgesi. Birimi plan SANTİMİ; sayfaya ölçekleme width/height ile. */
  markup: string
  /** Çizimin plan sınırları; boş katta `undefined`. Sayfaya yerleştirme bunu kullanır. */
  bounds: PlanBounds | undefined
}

/**
 * Bir katın çizimini SVG'ye basar: mimari, nesneler, ölçüler ve tesisat TEK
 * sayfada.
 *
 * Birim PLAN SANTİMİ, punto değil. Sebep: duvar kalınlığı, boru çapı, oda alanı
 * ve yazı boyu zaten cm cinsinden; SVG'yi cm uzayında kurunca `stroke-width`
 * doğrudan gerçek kalınlık oluyor ve ölçek değişince hiçbir sayı yeniden
 * hesaplanmıyor — ölçeği `width`/`height` öznitelikleri taşıyor. Yan faydası,
 * çıktının test edilebilir olması: beklenen koordinat planın kendi koordinatı.
 *
 * Duvar İÇİ BOŞ basılır (K154): pafta tesisat odaklı, mimari yalnız bağlam.
 * Geometri yine ekrandaki YUVARLAK UÇLU kapsül (K23) — kavşak hesabı yok.
 *
 * ⚠️ SIRA anlamlıdır ve ekrandaki `renderOrder` ile aynıdır: duvar → açıklık →
 * nesne → tesisat → yazı. Yazılar en sonda çünkü hiçbir şeyin altında
 * kalmamalılar. Oda DOLGUSU artık yok; adı ve alanı duruyor.
 */
export function buildPlanSvg(input: PlanSvgInput): PlanSvg {
  const { points, walls, openings, rooms, floorId, fontFamily } = input

  const floorWalls = walls.filter((wall) => wall.floorId === floorId)
  const pointIndex = buildPointIndex(points)
  const capsules = floorWalls.flatMap((wall) => {
    const capsule = getWallCapsuleFrom(wall, pointIndex)
    return capsule ? [{ wall, capsule }] : []
  })

  const body: string[] = []
  const labels: string[] = []
  /**
   * Sayfa sınırını belirleyen noktalar. Duvar UÇLARI yetmez: duvarın kendi
   * kalınlığı yarı yarıya dışarı taşar, duvara oturan sembol (menfez) daha da
   * taşar, tesisat binanın dışından dolaşabilir. Yalnız uçlara bakıldığında bu
   * içerik sayfa kenarında KIRPILIYORDU (kullanıcı bildirimi).
   */
  const extent: PlanPoint[] = []
  const addExtent = (point: PlanPoint, marginCm = 0) => {
    extent.push(
      { x: point.x - marginCm, y: point.y - marginCm },
      { x: point.x + marginCm, y: point.y + marginCm },
    )
  }

  const roomsSvg = buildPlanRoomsSvg({ points, floorWalls, rooms, floorId, fontFamily })
  labels.push(...roomsSvg.labels)

  // 1) Duvarlar İKİ GEÇİŞTE: içi boş görünsün ama kavşaklar temiz kalsın.
  //
  // Her duvarı tek tek konturlamak yanlış sonuç verirdi: kapsüller birleşme
  // yerlerinde üst üste biner ve her birinin konturu ötekinin İÇİNDEN geçerdi.
  // Bunun yerine önce TÜM duvarlar kontur renginde `kalınlık + 2×kontur`
  // genişliğinde, sonra TÜM duvarlar tam kalınlıkta boşluk renginde basılır.
  // Geriye kalan tek şey birleşimin dış çeperi — polygon union yazmadan.
  //
  // ⚠️ İkinci geçiş OPAK: duvarın altında kalan hiçbir şey görünmez. Bu yüzden
  // duvarlar en altta çizilir ve oda dolgusu artık basılmıyor.
  for (const { wall, capsule } of capsules) {
    body.push(
      svgLine(
        capsule.p1,
        capsule.p2,
        wall.thickness + 2 * WALL_OUTLINE_CM,
        PLAN_COLORS.wall,
        true,
      ),
    )
    // Kapsül yuvarlak uçlu: her yöne yarım kalınlık + kontur taşar.
    addExtent(capsule.p1, wall.thickness / 2 + WALL_OUTLINE_CM)
    addExtent(capsule.p2, wall.thickness / 2 + WALL_OUTLINE_CM)
  }
  for (const { wall, capsule } of capsules) {
    body.push(svgLine(capsule.p1, capsule.p2, wall.thickness, PLAN_COLORS.wallVoid, true))
  }

  // 2) Açıklıklar duvarın ÜSTÜNE basılır: delik "boşluk" gibi okunsun.
  body.push(...buildPlanOpeningsSvg(openings, floorWalls, points))

  // 3) Kiriş / alan nesnesi / sembol, sonra tesisat.
  body.push(
    ...buildPlanObjectsSvg({
      points,
      walls: floorWalls,
      areaObjects: input.areaObjects,
      beams: input.beams,
      symbols: input.symbols,
      floorId,
      fontFamily,
    }),
    ...buildPlanInstallationSvg({
      lines: input.installationLines,
      elements: input.installationElements,
      floorId,
      resolveColor: input.resolveLineColor,
      resolveSymbol: input.resolveSymbolAsset,
      resolveLabel: input.resolveElementLabel,
      fontFamily,
    }),
  )

  // 4) Yazılar EN ÜSTTE.
  body.push(
    ...buildPlanAnnotationsSvg({ points, walls: floorWalls, openings, floorId, fontFamily }),
    ...buildPlanTextsSvg(input.texts, floorId, fontFamily),
    ...labels,
  )

  for (const line of input.installationLines) {
    if (line.floorId !== floorId) continue
    for (const point of line.points) addExtent(point.position)
  }
  for (const element of input.installationElements) {
    if (element.floorId !== floorId) continue
    addExtent(element.position, ELEMENT_EXTENT_MARGIN_CM)

    const label = input.resolveElementLabel(element)
    if (label) addExtent(label.anchor, LABEL_EXTENT_MARGIN_CM)
  }

  const bounds = getPlanBounds(extent)
  return { markup: wrapSvg(body, bounds), bounds }
}

/**
 * `viewBox` çevrilmiş (y aşağı) uzayda kurulur; boş katta sıfır boyutlu bir kutu
 * geçersiz olduğu için 1×1'lik bir kutu yazılır — sayfa yine basılacak, içi boş
 * olacak.
 */
function wrapSvg(body: readonly string[], bounds: PlanBounds | undefined): string {
  const box = bounds
    ? {
        x: bounds.minX,
        y: -bounds.maxY,
        width: Math.max(bounds.maxX - bounds.minX, 1),
        height: Math.max(bounds.maxY - bounds.minY, 1),
      }
    : { x: 0, y: 0, width: 1, height: 1 }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${n(box.x)} ${n(box.y)} ${n(box.width)} ${n(box.height)}">` +
    body.join('') +
    `</svg>`
  )
}
