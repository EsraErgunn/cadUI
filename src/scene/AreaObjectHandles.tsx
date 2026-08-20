import { Html, Line } from '@react-three/drei'
import { ArrowDownRight, RotateCw } from 'lucide-react'

import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useAreaObjectHandleTool } from './useAreaObjectHandleTool'
import { useCameraZoom } from './useCameraZoom'
import type { AreaObjectShape } from '../core/areaObject'
import {
  getAreaObjectHandleLayout,
  HANDLE_ICON_PX,
  type AreaObjectHandleKind,
} from '../core/areaObjectHandles'
import { planToThree, type PlanPoint } from '../core/coords'
import type { AreaObject, AreaObjectType } from '../core/model'
import { getSoleSelectedId } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/** Seçim çerçevesi ince ve KESİK: nesnenin kendi çizgisiyle karışmasın. */
const BOX_STROKE_PX = 1
const BOX_DASH_PX = 4
const BOX_GAP_PX = 3

type IconButtonProps = {
  kind: AreaObjectHandleKind
  position: PlanPoint
  isHovered: boolean
}

/**
 * Tek tutamaç ikonu. `pointer-events: none` ŞART: tıklama tuvale ulaşmalı —
 * tutma kararını `useAreaObjectHandleTool` saf geometriyle veriyor. Overlay
 * olayı yeseydi hem sürükleme hiç başlamaz hem de drei `<Html>`'in ayrı
 * react-dom kökünden yapılan store yazımı R3F ağacını tazelemezdi
 * (bkz. RoomDefinitionEditor'daki aynı tuzak).
 *
 * `wrapperClass` da ŞART: drei `transform` kapalıyken sarmalayıcı div'e
 * pointer-events YAZMIYOR (yalnız transform modunda `none` veriyor), yani
 * içerideki sınıf tek başına yetmez — sarmalayıcı basışı yutar.
 */
function HandleIcon({ kind, position, isHovered }: IconButtonProps) {
  const Icon = kind === 'rotate' ? RotateCw : ArrowDownRight

  return (
    <Html
      position={planToThree(position, HANDLE_ELEVATION_CM)}
      center
      zIndexRange={[80, 0]}
      wrapperClass="pointer-events-none"
    >
      {/* size-6 (24 px) çipin içinde 14 px'lik ikon: kutu ikondan bir tık geniş,
          böylece daire biçimi ikonun köşelerini kesmiyor. */}
      <div
        aria-hidden
        className={`pointer-events-none flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors ${
          isHovered
            ? 'border-selection bg-selection text-white'
            : 'border-canvas-overlay-edge bg-canvas-overlay text-canvas-overlay-ink'
        }`}
      >
        <Icon size={HANDLE_ICON_PX} strokeWidth={2} />
      </div>
    </Html>
  )
}

/** Sürükleme sırasındaki küçük ölçü balonu — Figma'daki gibi imlecin yanında. */
function HandleTooltip({ text, position }: { text: string; position: PlanPoint }) {
  return (
    <Html
      position={planToThree(position, HANDLE_ELEVATION_CM)}
      center
      zIndexRange={[90, 0]}
      wrapperClass="pointer-events-none"
    >
      {/* -translate-y-7 (28 px): balon ikonun üstüne binmesin. Kaydırma ekran
          pikselinde, çünkü <Html> içeriği zaten zoom'dan bağımsız DOM. */}
      <div className="pointer-events-none -translate-y-7 whitespace-nowrap rounded bg-selection px-1.5 py-0.5 text-xs font-medium tabular-nums text-white shadow-sm">
        {text}
      </div>
    </Html>
  )
}

/** Ölçü balonunun metni: döndürmede açı, boyutlandırmada genişlik × uzunluk. */
function formatHandleTooltip(kind: AreaObjectHandleKind, shape: AreaObjectShape): string {
  if (kind === 'rotate') return `${Math.round(shape.angleDeg)}°`
  return `${Math.round(shape.widthCm)} × ${Math.round(shape.lengthCm)} cm`
}

type TransformOverlayProps = {
  type: AreaObjectType
  shape: AreaObjectShape
  /** Sürükleme sürüyorsa hangisi; balon yalnız o zaman çıkar. */
  draggingKind: AreaObjectHandleKind | null
  hoveredKind: AreaObjectHandleKind | null
}

/**
 * Seçili alan nesnesinin transform katmanı (K45): kesik çizgili sınır kutusu +
 * iki küçük ikon. Nesnenin KENDİ geometrisine dokunulmaz; kutu, çizilen
 * geometrinin sınırlarından TÜRETİLİR (`getAreaObjectLocalBounds`) — daire olan
 * kolon havalandırmasında da ikonlar görünür kenara oturur.
 *
 * Ölçüler EKRAN pikselinde sabit: zoom değişince ikonlar büyüyüp küçülmez
 * (kullanıcı isteği). `useCameraZoom` zoom'u tepkili okur, dünya birimine
 * çevrim `px / zoom`.
 */
function TransformOverlay({ type, shape, draggingKind, hoveredKind }: TransformOverlayProps) {
  const zoom = useCameraZoom()
  const layout = getAreaObjectHandleLayout(type, shape, zoom)

  return (
    <group>
      <Line
        points={[...layout.boxCorners, layout.boxCorners[0]].map((point) =>
          planToThree(point, HANDLE_ELEVATION_CM),
        )}
        color={SCENE_COLORS.selection}
        lineWidth={BOX_STROKE_PX}
        dashed
        dashSize={BOX_DASH_PX / zoom}
        gapSize={BOX_GAP_PX / zoom}
        frustumCulled={false}
        renderOrder={RENDER_ORDER.handle}
        depthWrite={false}
        toneMapped={false}
        raycast={() => null}
      />

      <HandleIcon
        kind="rotate"
        position={layout.rotate}
        isHovered={hoveredKind === 'rotate' || draggingKind === 'rotate'}
      />
      <HandleIcon
        kind="resize"
        position={layout.resize}
        isHovered={hoveredKind === 'resize' || draggingKind === 'resize'}
      />

      {draggingKind && (
        <HandleTooltip
          text={formatHandleTooltip(draggingKind, shape)}
          position={draggingKind === 'rotate' ? layout.rotate : layout.resize}
        />
      )}
    </group>
  )
}

/**
 * Tutamaç katmanı + sürükleme hook'u. Hook <Canvas> içinde çalışmak zorunda;
 * `PointHandles` ile aynı desen.
 *
 * Tutamaçlar YALNIZ tek alan nesnesi seçiliyken görünür: çoklu seçimde hangi
 * nesnenin boyutlandırılacağı belirsiz olurdu (hook da aynı kuralı uyguluyor).
 */
export function AreaObjectHandles() {
  useAreaObjectHandleTool()

  const selection = useArchitectureUiStore((state) => state.selection)
  const handleDrag = useArchitectureUiStore((state) => state.areaObjectHandleDrag)
  const handleHover = useArchitectureUiStore((state) => state.areaObjectHandleHover)
  const areaObjects = useCadStore((state) => state.areaObjects)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  const areaObjectId = getSoleSelectedId(selection, 'area')
  if (areaObjectId === undefined) return null

  const areaObject: AreaObject | undefined = areaObjects.find(
    (candidate) => candidate.id === areaObjectId,
  )
  if (!areaObject || areaObject.floorId !== activeFloorId) return null

  // Sürükleme sırasında kutu ve ikonlar ÖNİZLENEN şekli takip eder; store'a
  // henüz yazılmadığı için nesnenin kendisi de aynı şekille çiziliyor.
  const isDragging = handleDrag?.areaObjectId === areaObjectId
  const shape = isDragging ? handleDrag.shape : areaObject

  return (
    <TransformOverlay
      type={areaObject.type}
      shape={shape}
      draggingKind={isDragging ? handleDrag.kind : null}
      hoveredKind={handleHover}
    />
  )
}
