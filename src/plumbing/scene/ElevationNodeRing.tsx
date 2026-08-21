import { useEffect, useMemo } from 'react'
import { DoubleSide, MeshBasicMaterial, RingGeometry } from 'three'

import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'

const RING_SEGMENTS = 24
/**
 * Halka EKRAN boyunda sabit: yarıçaplar piksel, dünya boyu `1 / zoom` ölçeğiyle
 * elde ediliyor (`LengthText` ile aynı teknik, bkz. knowledge/viewport.md).
 * Köşe işaretinden (boru kalınlığına oranlı, ~birkaç piksel) belirgin şekilde
 * büyük seçildi — amaç düğümü İÇİNE ALMAK.
 */
const RING_INNER_RADIUS_PX = 9
const RING_OUTER_RADIUS_PX = 11

const RING_GEOMETRY = new RingGeometry(RING_INNER_RADIUS_PX, RING_OUTER_RADIUS_PX, RING_SEGMENTS)
// Yatırma: kamera tepeden bakıyor, dik duran halka çizgi gibi görünürdü.
RING_GEOMETRY.rotateX(-Math.PI / 2)

/**
 * Dikey (Z ekseni) hareketin YAPILDIĞI ya da YAPILACAĞI düğümü saran halka
 * (kullanıcı isteği, 2026-08). Planda saf dikey boru tek nokta gibi görünüyor;
 * halka olmadan kullanıcı kotun hangi düğümde değiştiğini gözle bulamıyordu.
 *
 * İki çağıranı var: yerleşmiş dikey segment (`PipeElevationGlyph`) ve `+`/`-`
 * ile kot kutusu açılmış taslağın ucu (`LineDraftPreview`) — "yapılacak olan"
 * düğüm de işaretlensin diye.
 */
export function ElevationNodeRing({ position, zoom }: { position: PlanPoint; zoom: number }) {
  // Renk tek ve sabit; material yine de dispose edilmek zorunda (R3F yalnız JSX
  // ile kendi kurduğu nesneleri bırakır, bkz. LineMarkers.useMarkerMaterial).
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: PLUMBING_COLORS.pipeElevationNode,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh
      geometry={RING_GEOMETRY}
      material={material}
      position={planToThree(position, PREVIEW_ELEVATION_CM)}
      scale={1 / zoom}
      renderOrder={RENDER_ORDER.fitting}
      raycast={() => null}
    />
  )
}
