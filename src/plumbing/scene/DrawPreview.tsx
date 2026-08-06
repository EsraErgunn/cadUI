import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { InterleavedBufferAttribute, type Group } from 'three'

import { PipeLine } from './InstallationLineMesh'
import { getLineColor, getLineWidthPx } from './lineStyle'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { getLoadedSymbol } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import type { LineToolState } from './useLineTool'
import type { PlacementPreviewState } from './usePlacementTool'
import { planToThree, type ThreePosition } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PREVIEW_OPACITY = 0.5

/** Lastik bandın başlangıç geometrisi; iki köşesi her karede yerinden yazılır. */
const RUBBER_BAND_SEED: ThreePosition[] = [
  [0, 0, 0],
  [0, 0, 0],
]

/**
 * Bırakılacak sembolün yarı saydam önizlemesi. Konum useFrame'de doğrudan
 * object3D'ye yazılır — imleç her kıpırdadığında React render'ı tetiklenmez.
 */
export function DrawPreview({ elementType, positionRef }: PlacementPreviewState) {
  const groupRef = useRef<Group>(null)

  const shapes = useMemo(
    () => (elementType ? getLoadedSymbol(elementType).shapes : []),
    [elementType],
  )

  // symbolLoader'ın PAYLAŞILAN material'ine yazılmaz; saydamlık klon üzerinde.
  const materials = useMemo(
    () =>
      shapes.map((shape) => {
        const material = shape.material.clone()
        material.transparent = true
        material.opacity = PREVIEW_OPACITY
        material.depthWrite = false
        return material
      }),
    [shapes],
  )

  useEffect(
    () => () => {
      for (const material of materials) material.dispose()
    },
    [materials],
  )

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const position = positionRef.current
    group.visible = position !== null
    if (position) group.position.set(...planToThree(position, PREVIEW_ELEVATION_CM))
  })

  if (shapes.length === 0) return null

  return (
    // visible=false ile başlar: imleç tuvale girip ilk pointermove gelene kadar
    // önizleme (0,0)'da durmasın.
    <group ref={groupRef} visible={false} renderOrder={RENDER_ORDER.linePreview}>
      {shapes.map((shape, index) => (
        // Dizi bir sembol tipinin SVG'sinden bir kez türer ve yeniden sıralanmaz —
        // domain nesnesi değil, indeks anahtar olarak güvenli (SymbolInstance ile aynı).
        <mesh
          key={index}
          geometry={shape.geometry}
          material={materials[index]}
          raycast={() => null}
        />
      ))}
    </group>
  )
}

/**
 * Devam eden hattın önizlemesi: yerleşmiş noktalar + son noktadan imlece uzanan
 * lastik bant. İkisi de yerleşmiş hattın ÇİZDİĞİ bileşenden (`PipeLine`) geçer —
 * ayrı ayrı kurulsalardı bir prop birinde unutulur ve önizleme farklı (ör. daha
 * ince) görünürdü.
 *
 * Yerleşmiş kısım yalnız TIKLAMA başına yeniden kurulur. Lastik bandın iki köşesi
 * her karede geometrinin İÇİNE yazılır (`instanceStart`/`instanceEnd`): drei
 * `<Line>` `points` propu her değiştiğinde yeni `BufferGeometry` ayırdığı için
 * bant propla sürülseydi kare başına geometri çöpü üretirdi.
 *
 * ⚠️ Banda `visible` PROPU VERİLMEZ: drei `<Line>` bilmediği propları hem nesneye
 * hem MATERIAL'e yayıyor, `material.visible = false` de bandı kalıcı olarak
 * görünmez yapıyor. Görünürlük yalnız useFrame'de nesne üzerinden ayarlanır.
 */
export function LineDraftPreview({ kind, cursorRef }: LineToolState) {
  const draft = usePlumbingUiStore((state) => state.draftLine)
  const activePipeTypeName = usePlumbingUiStore((state) => state.activePipeTypeName)
  const rubberBandRef = useRef<ComponentRef<typeof Line> | null>(null)
  const zoom = useCameraZoom()

  const points = draft?.points
  const pointCount = points?.length ?? 0

  // Referans kararlı tutulur: drei <Line> `points` değişince geometriyi yeniden ayırır.
  const settledPositions = useMemo(
    () => (points ?? []).map((point) => planToThree(point, PREVIEW_ELEVATION_CM)),
    [points],
  )

  useFrame(() => {
    const rubberBand = rubberBandRef.current
    if (!rubberBand) return

    const cursor = cursorRef.current
    const lastPoint = points?.at(-1)
    rubberBand.visible = Boolean(cursor && lastPoint)
    if (!cursor || !lastPoint) return

    // LineGeometry köşeleri araya dizilmiş tek tamponda tutar; ikisine de yazıp
    // tamponu bir kez güncellemek yeterli.
    const { instanceStart, instanceEnd } = rubberBand.geometry.attributes
    if (
      !(instanceStart instanceof InterleavedBufferAttribute) ||
      !(instanceEnd instanceof InterleavedBufferAttribute)
    ) {
      return
    }

    instanceStart.setXYZ(0, ...planToThree(lastPoint, PREVIEW_ELEVATION_CM))
    instanceEnd.setXYZ(0, ...planToThree(cursor, PREVIEW_ELEVATION_CM))
    instanceStart.data.needsUpdate = true
  })

  if (kind === null || pointCount === 0) return null

  const pipeLineProps = {
    colorHex: getLineColor(activePipeTypeName),
    widthPx: getLineWidthPx(activePipeTypeName, zoom),
    renderOrder: RENDER_ORDER.linePreview,
  }

  return (
    <group name="line-draft">
      {pointCount > 1 && <PipeLine positions={settledPositions} {...pipeLineProps} />}

      <PipeLine lineRef={rubberBandRef} positions={RUBBER_BAND_SEED} {...pipeLineProps} />
    </group>
  )
}
