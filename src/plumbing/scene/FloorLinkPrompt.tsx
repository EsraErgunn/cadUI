import { Text } from '@react-three/drei'

import { FONT_URL } from './LengthLabels'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'

const LABEL_SIZE_PX = 12
/** Kot etiketiyle (LengthText, LABEL_OFFSET_PX=11) çakışmasın diye biraz daha uzak. */
const ROW_OFFSET_PX = 18
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]
/** Saf metin, tıklanmaz — bkz. dosya başı yorumu. */
const NO_RAYCAST = () => null

/**
 * Çizim sürerken zincirin ucunda HER ZAMAN görünen ipucu: "Üst Kata Bağla ↑" /
 * "Alt Kata Bağla ↓" (kullanıcı isteği, 2026-08). Yalnız GÖSTERİR — tıklanmaz:
 * bu araç `subscribeDrawSurface` ile HAM `pointerdown`'ı dinliyor
 * (`DrawSurface.tsx`), bu da R3F'in kendi `onClick` sentetik olayıyla
 * YARIŞIYOR ve kazanıyor (`commitStep` pointerdown'da hemen yeni bir adım
 * yazıyor) — tıklama pratikte hiç ulaşmıyordu. Gerçek tetikleyici ok tuşları
 * (`useLineTool.ts` `handleKeyDown`), etiket yalnız o kısayolu hatırlatıyor.
 */
export function FloorLinkPrompt({ anchor, zoom }: { anchor: PlanPoint; zoom: number }) {
  return (
    <group position={planToThree(anchor, PREVIEW_ELEVATION_CM)}>
      <group rotation={FLAT_ROTATION} scale={1 / zoom}>
        <Text
          font={FONT_URL}
          fontSize={LABEL_SIZE_PX}
          color={PLUMBING_COLORS.floorLink}
          anchorX="left"
          anchorY="middle"
          position={[LABEL_SIZE_PX, ROW_OFFSET_PX, 0]}
          renderOrder={RENDER_ORDER.measurement}
          raycast={NO_RAYCAST}
        >
          ↑ Üst Kata Bağla
        </Text>
        <Text
          font={FONT_URL}
          fontSize={LABEL_SIZE_PX}
          color={PLUMBING_COLORS.floorLink}
          anchorX="left"
          anchorY="middle"
          position={[LABEL_SIZE_PX, -ROW_OFFSET_PX, 0]}
          renderOrder={RENDER_ORDER.measurement}
          raycast={NO_RAYCAST}
        >
          ↓ Alt Kata Bağla
        </Text>
      </group>
    </group>
  )
}
