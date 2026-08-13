import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  ShapeGeometry,
  type BufferGeometry,
  type Material,
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import type { SymbolMetadataLookup } from '../core/elementPicking'
import {
  parseSymbolMetadata,
  type InstallationElementType,
  type SymbolMetadata,
} from '../core/symbolMetadata'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Soluk ama okunur: bu değerin altında koyu konturlu semboller ızgaraya karışıyor.
 *  Hat hayaleti de aynı değeri kullanır (InstallationLineMesh) — sembol ve boru
 *  aynı izde farklı solukluktaysa katman iki parçaya bölünmüş görünüyor.
 *  0.35 çok soluktu (kullanıcı geri bildirimi); tek kaynak olduğu için burayı
 *  değiştirmek hat/sembol/baca-havalandırma hayaletinin ÜÇÜNÜ birden etkiler. */
export const GHOST_OPACITY = 0.55

export type SymbolShape = { geometry: BufferGeometry; material: Material }
export type LoadedSymbol = { shapes: readonly SymbolShape[]; metadata: SymbolMetadata }

/** SVGLoader'ın path.userData.style'ı — SVGLoader.js kaynağıyla birebir (fill/stroke, 'none' olabilir). */
type SvgPathStyle = {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeLineJoin?: string
  strokeLineCap?: string
  strokeMiterLimit?: number
}

// Semboller derleme zamanında gömülü (Vite `?raw`) — ağ isteği yok, bu yüzden yükleme
// senkron ve önbellek düz bir Map; Promise/Suspense'e gerek kalmadı (docs/kararlar.md).
const svgSources = import.meta.glob('../assets/symbols/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const symbolMetadataList: readonly SymbolMetadata[] = Object.values(
  import.meta.glob('../assets/symbols/*.meta.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>,
).map(parseSymbolMetadata)

const svgLoader = new SVGLoader()
const materialCache = new Map<string, Material>()
const ghostMaterialCache = new Map<Material, Material>()
const symbolCache = new Map<InstallationElementType, LoadedSymbol>()

/**
 * side: DoubleSide ŞART. bakeToLocalPlanSpace'in rotateX'i geometrinin ön yüzünü
 * −Y'ye çeviriyor; tepeden bakan ortografik kamera arka yüzü görür ve varsayılan
 * FrontSide ile sembolün TAMAMI kırpılır (sessizce görünmez olur, hata vermez).
 */
function getSharedMaterial(colorHex: string): Material {
  const cached = materialCache.get(colorHex)
  if (cached) return cached
  const material = new MeshBasicMaterial({ color: new Color(colorHex), side: DoubleSide })
  materialCache.set(colorHex, material)
  return material
}

/**
 * Sembolün mimari görünümdeki soluk izi için saydam klon. Rengi KORUNUR, griye
 * boyanmaz — tuvalde sarı = gaz hattı, boyansaydı bu bilgi kaybolurdu.
 * Anahtar kaynak material olduğu için önbellek RENK başına tek klon tutar.
 * Klonlar uygulama ömrü boyunca yaşar ve dispose EDİLMEZ (paylaşılan material'lerle
 * aynı ömür); önizlemedeki klon ise mount başına üretilip unmount'ta dispose edilir.
 */
export function getGhostMaterial(source: Material): Material {
  const cached = ghostMaterialCache.get(source)
  if (cached) return cached

  const ghost = source.clone()
  ghost.transparent = true
  ghost.opacity = GHOST_OPACITY
  ghost.depthWrite = false
  ghostMaterialCache.set(source, ghost)
  return ghost
}

function findSvgText(assetFileName: string): string {
  const entry = Object.entries(svgSources).find(([path]) => path.endsWith(`/${assetFileName}`))
  if (!entry) throw new Error(`"${assetFileName}" asset dosyası bulunamadı`)
  return entry[1]
}

/**
 * Ham SVG'yi origin'e göre öteler ve XY çizim düzlemini plan'ın XZ zemin düzlemine
 * yatırır (rotateX). Bu tek işlem hem "SVG +Y aşağı / plan +Y yukarı" çevrimini HEM
 * de "çizim düzlemi → zemin düzlemi" eşlemesini kapsar; ports.ts → svgLocalToPlanOffset
 * ile denk düşer (bkz. src/plumbing/core/__tests__/symbolLoader.test.ts). scale burada
 * YOK — o element.scale olarak SymbolInstance'ın kendi group'unda uygulanır.
 */
function bakeToLocalPlanSpace(geometry: BufferGeometry, origin: readonly [number, number]): void {
  geometry.translate(-origin[0], -origin[1], 0)
  geometry.rotateX(Math.PI / 2)
}

function buildShapes(svgText: string, origin: readonly [number, number]): SymbolShape[] {
  const { paths } = svgLoader.parse(svgText)
  const shapes: SymbolShape[] = []

  for (const path of paths) {
    const style = path.userData?.style as SvgPathStyle | undefined
    if (!style) continue

    if (style.fill && style.fill !== 'none') {
      const material = getSharedMaterial(style.fill)
      for (const shape of path.toShapes()) {
        const geometry = new ShapeGeometry(shape)
        bakeToLocalPlanSpace(geometry, origin)
        shapes.push({ geometry, material })
      }
    }

    if (style.stroke && style.stroke !== 'none') {
      const material = getSharedMaterial(style.stroke)
      const strokeStyle = SVGLoader.getStrokeStyle(
        style.strokeWidth,
        style.stroke,
        style.strokeLineJoin,
        style.strokeLineCap,
        style.strokeMiterLimit,
      )
      for (const subPath of path.subPaths) {
        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), strokeStyle)
        if (!geometry) continue
        bakeToLocalPlanSpace(geometry, origin)
        shapes.push({ geometry, material })
      }
    }
  }

  return shapes
}

/**
 * Sahneye yerleşen bir sembolün geometrisini/malzemesini döndürür (yalnız
 * InstallationElementType — toolbar-only semboller sahneye port'la yerleşmez).
 * Sonuç sembol tipi başına ÖNBELLEKLENİR ve tüm instance'lar arasında PAYLAŞILIR;
 * highlight gerektiğinde material klonlanır, bu fonksiyonun döndürdüğü paylaşılan
 * material'e asla yazılmaz.
 */
export function getLoadedSymbol(type: InstallationElementType): LoadedSymbol {
  const cached = symbolCache.get(type)
  if (cached) return cached

  // SYMBOL_PORT_COUNTS her InstallationElementType için bir meta.json ister ve bu
  // symbolMetadata.test.ts ile doğrulanıyor — burada bulunamaması programlama hatasıdır,
  // asset hatası değil; bu yüzden aşağıdaki try/catch'in DIŞINDA, sessizce yutulmadan atılır.
  const metadata = symbolMetadataList.find((meta) => meta.id === type)
  if (!metadata) {
    throw new Error(`"${type}" için sembol metadata'sı bulunamadı`)
  }

  let shapes: SymbolShape[] = []
  try {
    shapes = buildShapes(findSvgText(metadata.asset), metadata.origin)
  } catch (error) {
    usePlumbingUiStore
      .getState()
      .setAssetError(type, error instanceof Error ? error.message : String(error))
  }

  const loaded: LoadedSymbol = { shapes, metadata }
  symbolCache.set(type, loaded)
  return loaded
}

/** Saf çekirdek fonksiyonlarının istediği metadata okuyucusu — her araçta tek satır kopyalanmasın. */
export const getSymbolMetadata: SymbolMetadataLookup = (type) => getLoadedSymbol(type).metadata
