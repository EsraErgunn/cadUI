import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type ComponentRef } from 'react'
import { InterleavedBufferAttribute } from 'three'

import { DischargeRunMesh } from './DischargeRunMesh'
import { PipeLine } from './InstallationLineMesh'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { DISCHARGE_STROKE_COLORS } from './plumbingTheme'
import type { DischargeToolState } from './useDischargeTool'
import { planToThree } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { DISCHARGE_WIDTH_CM } from '../core/lineKinds'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Lastik bandın tohum köşeleri: tampon her karede elle yazılıyor (DrawPreview deseni). */
const RUBBER_BAND_SEED = [
  [0, 0, 0],
  [0, 0, 0],
] as [number, number, number][]

const RUBBER_BAND_WIDTH_PX = 1.5

const START_MARKER_WIDTH_PX = 3

/**
 * Taslak YOKKEN imlecin altındaki geçerli ağzı işaretler. Ağız artık sabit bir
 * port değil, cihazın kenarı boyunca kayan serbest bir noktadır — bu yüzden
 * işaret bir NOKTA değil, kanalın tam genişliğinde bir AĞIZ ÇİZGİSİ: kullanıcı
 * tıklamadan önce kanalın hangi kenardan, ne genişlikte ve nereye oturacağını
 * görmeli.
 *
 * Konum `startRef`'ten her karede okunur: imleç cihazın üstünde gezdikçe ağız
 * kenar boyunca kayar ve bu React render'ı tetiklememeli (`DrawingPortMarkers`
 * ile aynı desen).
 *
 * İşaret çıkmıyorsa oraya kanal çizilemez — "önizleme yoksa yerleştirme de yok"
 * kuralının görsel tarafı; cihaz kotasını doldurmuşsa (ya tek baca ya çok
 * havalandırma) işaret hiç belirmez.
 */
function StartMarker({
  startRef,
  colorHex,
  widthCm,
}: Pick<DischargeToolState, 'startRef'> & { colorHex: string; widthCm: number }) {
  const lineRef = useRef<ComponentRef<typeof Line> | null>(null)

  useFrame(() => {
    const line = lineRef.current
    if (!line) return

    const start = startRef.current
    line.visible = start !== null
    if (!start) return

    const { instanceStart, instanceEnd } = line.geometry.attributes
    if (
      !(instanceStart instanceof InterleavedBufferAttribute) ||
      !(instanceEnd instanceof InterleavedBufferAttribute)
    ) {
      return
    }

    // Ağız yöne DİK uzanır; kanalın iki duvarı bu iki uçtan başlayacak.
    const halfWidthCm = widthCm / 2
    const offsetX = -start.direction.y * halfWidthCm
    const offsetY = start.direction.x * halfWidthCm

    instanceStart.setXYZ(
      0,
      ...planToThree(
        { x: start.position.x + offsetX, y: start.position.y + offsetY },
        PREVIEW_ELEVATION_CM,
      ),
    )
    instanceEnd.setXYZ(
      0,
      ...planToThree(
        { x: start.position.x - offsetX, y: start.position.y - offsetY },
        PREVIEW_ELEVATION_CM,
      ),
    )
    instanceStart.data.needsUpdate = true
  })

  return (
    <PipeLine
      lineRef={lineRef}
      positions={RUBBER_BAND_SEED}
      colorHex={colorHex}
      widthPx={START_MARKER_WIDTH_PX}
      renderOrder={RENDER_ORDER.portMarker}
    />
  )
}

/**
 * Devam eden baca/havalandırma çizimi: yazılmamış güzergâhın yarı saydam gövdesi
 * + son köşeden imlece uzanan lastik bant.
 *
 * Boru aracından farkı, gövdenin de önizleme olması: kanal bitişte TEK hat
 * olarak yazıldığı için sahnede henüz gerçek bir kanal YOK (boruda her tık kendi
 * hattını hemen yazıyor ve önizleme yalnız banttan ibaret kalıyor).
 *
 * ⚠️ Banda `visible` PROPU VERİLMEZ: drei `<Line>` bilmediği propları material'e
 * de yayıyor ve `material.visible = false` bandı kalıcı olarak öldürüyor
 * (DrawPreview'daki aynı tuzak).
 */
export function DischargePreview({ kind, cursorRef, startRef }: DischargeToolState) {
  const draft = usePlumbingUiStore((state) => state.dischargeDraft)
  const rubberBandRef = useRef<ComponentRef<typeof Line> | null>(null)

  const anchor = draft?.points.at(-1)

  useFrame(() => {
    const rubberBand = rubberBandRef.current
    if (!rubberBand) return

    const cursor = cursorRef.current
    rubberBand.visible = Boolean(cursor && anchor)
    if (!cursor || !anchor) return

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

  if (kind === null) return null

  const colorHex = DISCHARGE_STROKE_COLORS[kind]

  return (
    <group name="discharge-draft">
      {!draft && (
        <StartMarker
          startRef={startRef}
          colorHex={colorHex}
          widthCm={DISCHARGE_WIDTH_CM[kind]}
        />
      )}

      {draft && draft.points.length >= 2 && (
        <DischargeRunMesh kind={kind} centerline={draft.points} tone="preview" />
      )}

      {anchor && (
        <PipeLine
          lineRef={rubberBandRef}
          positions={RUBBER_BAND_SEED}
          colorHex={colorHex}
          widthPx={RUBBER_BAND_WIDTH_PX}
          renderOrder={RENDER_ORDER.linePreview}
        />
      )}
    </group>
  )
}
