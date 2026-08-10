import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { InterleavedBufferAttribute, type Group } from 'three'

import { PipeLine } from './InstallationLineMesh'
import { getLineColor, getLineWidthPx } from './lineStyle'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { getLoadedSymbol } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import type { LineToolState } from './useLineTool'
import type { PlacementPreviewState } from './usePlacementTool'
import { planToThree, type ThreePosition } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { getElementAttachMode } from '../core/attachModes'
import type { InstallationElementType } from '../core/symbolMetadata'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PREVIEW_OPACITY = 0.5
const DEG_TO_RAD = Math.PI / 180

/** Lastik bandın başlangıç geometrisi; iki köşesi her karede yerinden yazılır. */
const RUBBER_BAND_SEED: ThreePosition[] = [
  [0, 0, 0],
  [0, 0, 0],
]

/**
 * Önizlemedeki TEK sembol. Konum ve açı useFrame'de doğrudan object3D'ye yazılır
 * — imleç her kıpırdadığında React render'ı tetiklenmez. Yerleşim dizisi araç
 * seçilince sabitlenen `previewTypes` ile aynı sıradadır; bu bileşen kendi
 * sırasındaki girdiyi okur, yoksa görünmez olur.
 */
function PreviewSymbol({
  elementType,
  index,
  placementsRef,
}: {
  elementType: InstallationElementType
  index: number
  placementsRef: PlacementPreviewState['placementsRef']
}) {
  const groupRef = useRef<Group>(null)
  const shapes = useMemo(() => getLoadedSymbol(elementType).shapes, [elementType])

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

    const placement = placementsRef.current?.[index] ?? null
    group.visible = placement !== null
    if (!placement) return

    group.position.set(...planToThree(placement.position, PREVIEW_ELEVATION_CM))
    // Sembol boruya hizalanır; dönme yönü ports.ts'teki rotatePlanOffset ile aynı (R2).
    group.rotation.y = placement.angleDeg * DEG_TO_RAD
  })

  if (shapes.length === 0) return null

  return (
    // visible=false ile başlar: imleç tuvale girip ilk pointermove gelene kadar
    // önizleme (0,0)'da durmasın.
    <group ref={groupRef} visible={false} renderOrder={RENDER_ORDER.linePreview}>
      {shapes.map((shape, shapeIndex) => (
        // Dizi bir sembol tipinin SVG'sinden bir kez türer ve yeniden sıralanmaz —
        // domain nesnesi değil, indeks anahtar olarak güvenli (SymbolInstance ile aynı).
        <mesh
          key={shapeIndex}
          geometry={shape.geometry}
          material={materials[shapeIndex]}
          raycast={() => null}
        />
      ))}
    </group>
  )
}

/**
 * Cihazı en yakın boruya bağlayan kolun önizlemesi. Lastik bantla aynı teknik:
 * iki köşe her karede geometrinin İÇİNE yazılır, `points` propu değiştirilmez
 * (drei `<Line>` her değişimde yeni BufferGeometry ayırırdı).
 */
function StubPreviewLine({ stubRef }: Pick<PlacementPreviewState, 'stubRef'>) {
  const activePipeTypeName = usePlumbingUiStore((state) => state.activePipeTypeName)
  const lineRef = useRef<ComponentRef<typeof Line> | null>(null)
  const zoom = useCameraZoom()

  useFrame(() => {
    const line = lineRef.current
    if (!line) return

    const stub = stubRef.current
    line.visible = stub !== null
    if (!stub) return

    const { instanceStart, instanceEnd } = line.geometry.attributes
    if (
      !(instanceStart instanceof InterleavedBufferAttribute) ||
      !(instanceEnd instanceof InterleavedBufferAttribute)
    ) {
      return
    }

    instanceStart.setXYZ(0, ...planToThree(stub[0], PREVIEW_ELEVATION_CM))
    instanceEnd.setXYZ(0, ...planToThree(stub[1], PREVIEW_ELEVATION_CM))
    instanceStart.data.needsUpdate = true
    // Kesikli desen `points` PROPUNDAN türeyen mesafeye bakar (drei `<Line>`,
    // Line.js); lastik bant tekniğinde `points` SABİT kalıyor (RUBBER_BAND_SEED),
    // yalnız tampon elle yazılıyor — drei'nin otomatik `computeLineDistances()`'ı
    // hiç tetiklenmez ve desen sıfır uzunluklu ilk kareye takılı kalır. Elle
    // çağrılmazsa kol her zaman DÜZ görünürdü.
    line.computeLineDistances()
  })

  return (
    <PipeLine
      lineRef={lineRef}
      positions={RUBBER_BAND_SEED}
      colorHex={PLUMBING_COLORS.applianceStub}
      widthPx={getLineWidthPx(activePipeTypeName, zoom)}
      renderOrder={RENDER_ORDER.linePreview}
      isDashed
    />
  )
}

/**
 * Bırakılacak sembollerin yarı saydam önizlemesi. Boruya yapışan elemanlarda
 * önizleme YALNIZ geçerli bir hedef yakalanınca çıkar; regülatör gibi
 * refakatçileriyle gelen elemanlarda vanaları ve manometresi de görünür, çünkü
 * tıklama hepsini birden koyacak.
 */
export function DrawPreview({
  elementType,
  previewTypes,
  placementsRef,
  stubRef,
}: PlacementPreviewState) {
  const hasStub = elementType !== null && getElementAttachMode(elementType) === 'nearestLine'

  return (
    <group name="placement-preview">
      {previewTypes.map((type, index) => (
        // key olarak indeks: aynı tür (iki vana) birden çok kez geçebiliyor ve
        // dizi araç seçilince sabitlenip bir daha sıralanmıyor.
        <PreviewSymbol
          key={index}
          elementType={type}
          index={index}
          placementsRef={placementsRef}
        />
      ))}

      {hasStub && <StubPreviewLine stubRef={stubRef} />}
    </group>
  )
}

/**
 * Devam eden çizimin önizlemesi: zincirin ucundan imlece uzanan lastik bant.
 * YALNIZ bant çizilir — yazılmış adımlar artık gerçek borulardır (her sol tık
 * kendi borusunu yazıyor, K-W) ve sahnede zaten duruyorlar. Bant da yerleşmiş
 * hattın ÇİZDİĞİ bileşenden (`PipeLine`) geçer; ayrı kurulsaydı bir prop
 * unutulur ve önizleme farklı (ör. daha ince) görünürdü.
 *
 * Bandın iki köşesi her karede geometrinin İÇİNE yazılır (`instanceStart`/
 * `instanceEnd`): drei `<Line>` `points` propu her değiştiğinde yeni
 * `BufferGeometry` ayırdığı için bant propla sürülseydi kare başına geometri
 * çöpü üretirdi.
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

  const anchor = draft?.anchor

  useFrame(() => {
    const rubberBand = rubberBandRef.current
    if (!rubberBand) return

    const cursor = cursorRef.current
    rubberBand.visible = Boolean(cursor && anchor)
    if (!cursor || !anchor) return

    // LineGeometry köşeleri araya dizilmiş tek tamponda tutar; ikisine de yazıp
    // tamponu bir kez güncellemek yeterli.
    const { instanceStart, instanceEnd } = rubberBand.geometry.attributes
    if (
      !(instanceStart instanceof InterleavedBufferAttribute) ||
      !(instanceEnd instanceof InterleavedBufferAttribute)
    ) {
      return
    }

    instanceStart.setXYZ(0, ...planToThree(anchor, PREVIEW_ELEVATION_CM))
    instanceEnd.setXYZ(0, ...planToThree(cursor, PREVIEW_ELEVATION_CM))
    instanceStart.data.needsUpdate = true
  })

  if (kind === null || !anchor) return null

  return (
    <group name="line-draft">
      <PipeLine
        lineRef={rubberBandRef}
        positions={RUBBER_BAND_SEED}
        colorHex={getLineColor(activePipeTypeName)}
        widthPx={getLineWidthPx(activePipeTypeName, zoom)}
        renderOrder={RENDER_ORDER.linePreview}
      />
    </group>
  )
}
