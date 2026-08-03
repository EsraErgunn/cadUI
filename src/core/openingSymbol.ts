import type { PlanPoint } from './coords'
import type { OpeningType } from './model'

/**
 * Plan sembollerinin referans çerçevesi (kapi/pencere-plan-sembol.svg ile birebir):
 * orijin açıklığın ORTASI, x duvar boyunca (genişlik 100 birim), y duvar
 * kalınlığı boyunca (22 birim). Sayılar SVG'deki hâliyle duruyor ki iki taraf
 * gözle karşılaştırılabilsin; plan uzayına çevirmeyi toPlanPoint yapar.
 */
const SYMBOL_WIDTH_UNITS = 100
const SYMBOL_THICKNESS_UNITS = 22
const HALF_WIDTH_UNITS = SYMBOL_WIDTH_UNITS / 2
const HALF_THICKNESS_UNITS = SYMBOL_THICKNESS_UNITS / 2

/** Kapı kanadı: SVG rect x=-48..48, y=-4.5..4.5 (dolu koyu çubuk). */
const DOOR_LEAF_HALF_LENGTH_UNITS = 48
const DOOR_LEAF_HALF_DEPTH_UNITS = 4.5

/** Pencere cam çizgileri: SVG y=±3, açıklığın tüm boyunca. */
const WINDOW_GLASS_DEPTH_UNITS = 3

export type OpeningSymbolSegment = readonly [PlanPoint, PlanPoint]

/** Çizgi kalınlığını sahne tarafı bu role göre seçer; cm değeri core'da tutulmaz. */
export type OpeningSymbolRole = 'jamb' | 'face' | 'detail'

export type OpeningSymbolStroke = {
  /** Benzersiz ad — React key olarak kullanılır (indeks DEĞİL, CLAUDE.md kural 6). */
  name: string
  role: OpeningSymbolRole
  points: OpeningSymbolSegment
}

export type OpeningSymbol = {
  strokes: OpeningSymbolStroke[]
  /** Dolu koyu alanın 4 köşesi: kapı kanadı. Pencerede yok. */
  panel: PlanPoint[] | undefined
}

/**
 * SVG çerçevesindeki (x, y) → plan uzayı. Yön vektörleri açıklığın KÖŞELERİNDEN
 * türetilir (c0→c1 eksen, c0→c3 kalınlık): sembol çapraz duvarda da duvarın
 * eksenini takip eder ve burada açı/trigonometri hesabı yapılmaz.
 */
function toPlanPoint(outline: readonly PlanPoint[], svgX: number, svgY: number): PlanPoint {
  const [c0, c1, , c3] = outline
  const alongRatio = svgX / SYMBOL_WIDTH_UNITS + 0.5
  const acrossRatio = svgY / SYMBOL_THICKNESS_UNITS + 0.5

  return {
    x: c0.x + (c1.x - c0.x) * alongRatio + (c3.x - c0.x) * acrossRatio,
    y: c0.y + (c1.y - c0.y) * alongRatio + (c3.y - c0.y) * acrossRatio,
  }
}

/**
 * Açıklığın plan sembolü, `getOpeningOutline`'ın 4 köşesinden türetilir.
 * Kapı ve pencere aynı gövdeyi (söve + duvar yüzü hizası) paylaşır, yalnız
 * içi farklıdır: kapıda dolu kanat, pencerede iki cam çizgisi.
 */
export function getOpeningSymbol(
  outline: readonly PlanPoint[],
  type: OpeningType,
): OpeningSymbol {
  const at = (svgX: number, svgY: number) => toPlanPoint(outline, svgX, svgY)

  const body: OpeningSymbolStroke[] = [
    {
      name: 'jamb-start',
      role: 'jamb',
      points: [at(-HALF_WIDTH_UNITS, -HALF_THICKNESS_UNITS), at(-HALF_WIDTH_UNITS, HALF_THICKNESS_UNITS)],
    },
    {
      name: 'jamb-end',
      role: 'jamb',
      points: [at(HALF_WIDTH_UNITS, -HALF_THICKNESS_UNITS), at(HALF_WIDTH_UNITS, HALF_THICKNESS_UNITS)],
    },
    {
      name: 'face-near',
      role: 'face',
      points: [at(-HALF_WIDTH_UNITS, -HALF_THICKNESS_UNITS), at(HALF_WIDTH_UNITS, -HALF_THICKNESS_UNITS)],
    },
    {
      name: 'face-far',
      role: 'face',
      points: [at(-HALF_WIDTH_UNITS, HALF_THICKNESS_UNITS), at(HALF_WIDTH_UNITS, HALF_THICKNESS_UNITS)],
    },
  ]

  if (type === 'window') {
    return {
      strokes: [
        ...body,
        {
          name: 'glass-near',
          role: 'detail',
          points: [
            at(-HALF_WIDTH_UNITS, -WINDOW_GLASS_DEPTH_UNITS),
            at(HALF_WIDTH_UNITS, -WINDOW_GLASS_DEPTH_UNITS),
          ],
        },
        {
          name: 'glass-far',
          role: 'detail',
          points: [
            at(-HALF_WIDTH_UNITS, WINDOW_GLASS_DEPTH_UNITS),
            at(HALF_WIDTH_UNITS, WINDOW_GLASS_DEPTH_UNITS),
          ],
        },
      ],
      panel: undefined,
    }
  }

  return {
    strokes: body,
    panel: [
      at(-DOOR_LEAF_HALF_LENGTH_UNITS, -DOOR_LEAF_HALF_DEPTH_UNITS),
      at(DOOR_LEAF_HALF_LENGTH_UNITS, -DOOR_LEAF_HALF_DEPTH_UNITS),
      at(DOOR_LEAF_HALF_LENGTH_UNITS, DOOR_LEAF_HALF_DEPTH_UNITS),
      at(-DOOR_LEAF_HALF_LENGTH_UNITS, DOOR_LEAF_HALF_DEPTH_UNITS),
    ],
  }
}
