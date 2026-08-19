import { Text } from '@react-three/drei'

import { FONT_URL } from './LengthLabels'
import { LINE_ELEVATION_CM, LINE_END_MARKER_LIFT_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { useCameraZoom } from './useCameraZoom'
import { planToThree } from '../../core/coords'
import type { FloorPipeLink } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'

const LABEL_SIZE_PX = 14
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]
/** Saf işaret, tıklanmaz — bkz. FloorLinkPrompt.tsx'teki gerekçe. Kata geçiş
 *  zaten PageUp/PageDown (`useEditorShortcuts.ts`) ve kat seçiciyle var. */
const NO_RAYCAST = () => null

/** Aktif kattaki bir `FloorPipeLink`'in kalıcı işareti — `PipeElevationGlyph` ile aynı yerde durur. */
function LinkBadge({ link, isBelow }: { link: FloorPipeLink; isBelow: boolean }) {
  const zoom = useCameraZoom()

  return (
    <group position={planToThree(link.position, LINE_ELEVATION_CM + LINE_END_MARKER_LIFT_CM)}>
      <group rotation={FLAT_ROTATION} scale={1 / zoom}>
        <Text
          font={FONT_URL}
          fontSize={LABEL_SIZE_PX}
          color={PLUMBING_COLORS.floorLink}
          anchorX="center"
          anchorY="middle"
          renderOrder={RENDER_ORDER.fitting}
          raycast={NO_RAYCAST}
        >
          {isBelow ? '▲' : '▼'}
        </Text>
      </group>
    </group>
  )
}

/** Aktif kattaki tüm kat bağlantı rozetleri. Karşı kattaki uç burada ÇİZİLMEZ. */
export function FloorLinkGlyphs() {
  const links = useCadStore((state) => state.floorPipeLinks)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return (
    <>
      {links
        .filter((link) => link.belowFloorId === activeFloorId || link.aboveFloorId === activeFloorId)
        .map((link) => (
          <LinkBadge key={link.id} link={link} isBelow={link.belowFloorId === activeFloorId} />
        ))}
    </>
  )
}
