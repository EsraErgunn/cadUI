import { useMemo } from 'react'
import { CircleGeometry, DoubleSide, MeshBasicMaterial, PlaneGeometry, RingGeometry } from 'three'

import { LINE_ELEVATION_CM, LINE_END_MARKER_LIFT_CM } from './plumbingLayers'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import type { InstallationConnection, InstallationLinePoint } from '../core/installationModel'
import { getLineEndRole } from '../core/lineCornerLink'

/**
 * İşaretler birim yarıçapla üretilir, her hatta çapına göre ölçeklenir:
 * hat kalınlaştıkça işaret de büyür, tek geometri paylaşılır.
 */
const END_MARKER_SEGMENTS = 16
const CONNECTED_DISC_GEOMETRY = new CircleGeometry(1, END_MARKER_SEGMENTS)
CONNECTED_DISC_GEOMETRY.rotateX(Math.PI / 2)
const FREE_RING_GEOMETRY = new RingGeometry(0.55, 1, END_MARKER_SEGMENTS)
FREE_RING_GEOMETRY.rotateX(Math.PI / 2)
/** Kare = kenarı 1 birim düzlem; köşe işareti bunu kullanır (aşağıya bkz.). */
const CORNER_SQUARE_GEOMETRY = new PlaneGeometry(1, 1)
CORNER_SQUARE_GEOMETRY.rotateX(-Math.PI / 2)

/** Bağlı uç dolu daire, serbest uç içi boş halka — ayrım yalnız renkle yapılmaz. */
const CONNECTED_MARKER_SCALE = 0.55
const FREE_MARKER_SCALE = 0.9
/**
 * Köşe işareti KARE, daire DEĞİL (kullanıcı isteği, 2026-08): LineMaterial
 * piksel modda her segmentin ucuna YUVARLAK cap çiziyor (three.js Line2/
 * LineMaterial'in tek desteklediği şekil — worldUnits'te de aynı, cap seçimi
 * yok), duvarın kapsül görünümüyle aynı — ama duvar BİLEREK yuvarlak
 * (capsule-walls.md), boru öyle döşenmiyor. Mimariye dokunmadan yalnız boru
 * tarafını düzeltmek için köşeye pipe genişliğini aşan bir kare yama konur,
 * iki segmentin yuvarlak uçlarını örtüp köşeyi köşeli gösterir. Kare eksene
 * hizalı: borular ürün kuralı gereği çoğunlukla dik açıyla döşendiği için
 * (CLAUDE.md) tam bir gönye köşesi verir; dik olmayan nadir köşelerde tam
 * miter değildir ama yine de yuvarlak bloba göre belirgin şekilde köşelidir.
 */
const CORNER_MARKER_SCALE = 1.15

/**
 * Renk çaptan geldiği için material instance başına üretilir; geometri
 * paylaşılıyor ve mount başına dispose gerektirmiyor (React unmount'ta
 * material'i R3F bırakır).
 */
function useMarkerMaterial(colorHex: string) {
  return useMemo(
    () =>
      new MeshBasicMaterial({
        color: colorHex,
        // Yatırılan halkanın ön yüzü aşağı bakıyor; tepeden bakan kamera arkasını görür.
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [colorHex],
  )
}

type LineEndMarkerProps = {
  position: PlanPoint
  widthCm: number
  isConnected: boolean
  colorHex: string
}

/** Hattın ucu bağlı mı serbest mi (KK-7). */
function LineEndMarker({ position, widthCm, isConnected, colorHex }: LineEndMarkerProps) {
  const material = useMarkerMaterial(colorHex)

  return (
    <mesh
      geometry={isConnected ? CONNECTED_DISC_GEOMETRY : FREE_RING_GEOMETRY}
      material={material}
      position={planToThree(position, LINE_ELEVATION_CM + LINE_END_MARKER_LIFT_CM)}
      scale={widthCm * (isConnected ? CONNECTED_MARKER_SCALE : FREE_MARKER_SCALE)}
      renderOrder={RENDER_ORDER.fitting}
      raycast={() => null}
    />
  )
}

type CornerMarkerProps = {
  position: PlanPoint
  widthCm: number
  colorHex: string
}

/**
 * Kırılma noktası — boru yalnız köşelerinden tutulup sürüklenebiliyor, görünür
 * bir işaret olmadan kullanıcı nereyi tutacağını bilemezdi. Uç işaretinden
 * (bağlı/serbest ayrımı) kasıtlı olarak AYRI: köşede bağlantı durumu
 * gösterilmez, hep aynı kare yama (bkz. `CORNER_SQUARE_GEOMETRY`).
 */
export function CornerMarker({ position, widthCm, colorHex }: CornerMarkerProps) {
  const material = useMarkerMaterial(colorHex)

  return (
    <mesh
      geometry={CORNER_SQUARE_GEOMETRY}
      material={material}
      position={planToThree(position, LINE_ELEVATION_CM + LINE_END_MARKER_LIFT_CM)}
      scale={widthCm * CORNER_MARKER_SCALE}
      renderOrder={RENDER_ORDER.fitting}
      raycast={() => null}
    />
  )
}

type LineTerminalProps = {
  point: InstallationLinePoint
  end: InstallationConnection['end']
  lineId: Id
  connections: readonly InstallationConnection[]
  widthCm: number
  colorHex: string
}

/**
 * Hattın uç noktasındaki işaret. Her sol tık kendi borusunu yazdığı için (K-W)
 * bir "hat ucu" üç şeyden biri olabilir: bir elemanın portuna bağlı uç (dolu
 * daire), zincirin bir sonraki adımıyla paylaşılan KÖŞE (küçük nokta) ya da
 * gerçekten serbest uç (içi boş halka). Ayrım `getLineEndRole`'da — sahne
 * yalnız çizer. Ortak köşede iki komşu adım da aynı noktayı çizer; ikisi de
 * köşe işareti olduğu için üst üste tek bir nokta görünür.
 */
export function LineTerminal({
  point,
  end,
  lineId,
  connections,
  widthCm,
  colorHex,
}: LineTerminalProps) {
  const role = getLineEndRole(connections, lineId, point.id, end)

  // Armatür oturan köşe kendi sembolüyle zaten işaretli; üstüne nokta konmaz.
  if (role === 'corner') {
    if (point.inlineElementId !== undefined) return null
    return <CornerMarker position={point.position} widthCm={widthCm} colorHex={colorHex} />
  }

  return (
    <LineEndMarker
      position={point.position}
      widthCm={widthCm}
      colorHex={colorHex}
      isConnected={role === 'port'}
    />
  )
}
