import { Text } from '@react-three/drei'
import { useMemo, useState } from 'react'
import { Shape } from 'three'

import { RENDER_ORDER, ROOM_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint } from '../core/coords'

/**
 * Font REPODAN gelir. Verilmezse troika varsayılanı Google Fonts CDN'inden
 * çekmeye çalışıyor, istek düşünce de hata vermeden 0 piksel çiziyor — etiketin
 * hiç görünmemesinin sebebi buydu. Dosya latin + latin-ext içerir; yalnız latin
 * alt kümesinde ğ/ş/İ yok ve oda adları Türkçe.
 */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Türkçe büyük harf i → İ; varsayılan locale I üretir ve ad yanlış okunur. */
const TURKISH_LOCALE = 'tr-TR'

const NAME_SIZE_CM = 26
const AREA_SIZE_CM = 20
/** Ad ile alan arasındaki dikey boşluk; ikisi ortak bir blok gibi okunsun. */
const LINE_GAP_CM = 6

const BADGE_PADDING_X_CM = 22
const BADGE_PADDING_Y_CM = 14
const BADGE_CORNER_RADIUS_CM = 12
/**
 * Rozet yazının bir tık ALTINDA durur. Aynı yükseklikte olsalardı saydam
 * geçişin derinlik sıralaması ikisi arasında kararsız kalır, yazı bazı
 * karelerde rozetin arkasına düşerdi.
 */
const BADGE_DEPTH_GAP_CM = 0.05

type TextBlockBounds = readonly [minX: number, minY: number, maxX: number, maxY: number]

/** drei `onSync`'i `any` veriyor; ihtiyacımız olan tek alan bu. */
type TroikaText = { textRenderInfo?: { blockBounds: TextBlockBounds } }

type TextBox = { minX: number; minY: number; maxX: number; maxY: number }

function isSameBox(left: TextBox | undefined, right: TextBox): boolean {
  return (
    left !== undefined &&
    left.minX === right.minX &&
    left.minY === right.minY &&
    left.maxX === right.maxX &&
    left.maxY === right.maxY
  )
}

function createRoundedRect(widthCm: number, heightCm: number, radiusCm: number): Shape {
  // Yarıçap kenarın yarısını aşarsa köşe yayları birbirini keser ve şekil bozulur.
  const radius = Math.min(radiusCm, widthCm / 2, heightCm / 2)
  const halfWidth = widthCm / 2
  const halfHeight = heightCm / 2

  const shape = new Shape()
  shape.moveTo(-halfWidth + radius, -halfHeight)
  shape.lineTo(halfWidth - radius, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
  shape.lineTo(halfWidth, halfHeight - radius)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
  shape.lineTo(-halfWidth + radius, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
  shape.lineTo(-halfWidth, -halfHeight + radius)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)

  return shape
}

type RoomLabelProps = {
  /** Odanın İÇİNDE olduğu garanti edilen çapa noktası (bkz. getRoomLabelAnchor). */
  anchor: PlanPoint
  name: string
  areaM2: number
}

/**
 * Oda etiketi: büyük harf ad + altında m², ikisi ortak bir rozetin içinde.
 *
 * Rozet iki yazının BİRLEŞİK ölçüsünden büyür; sabit bir kutu uzun adlarda
 * taşardı. Ölçü troika'dan `onSync` ile geliyor, yazı senkronlanana kadar rozet
 * çizilmez (bir kare).
 *
 * Grup plan düzlemine yatırılır (kamera tepeden bakıyor, dik dursaydı
 * görünmezdi); içerideki her şey grubun yerel cm koordinatlarında durur. Yerel
 * +z, döndürmeden sonra dünyada YUKARI bakar — derinlik sıralaması oradan gelir.
 */
export function RoomLabel({ anchor, name, areaM2 }: RoomLabelProps) {
  const [nameBox, setNameBox] = useState<TextBox>()
  const [areaBox, setAreaBox] = useState<TextBox>()

  /** `offsetYCm`: yazının gruptaki kendi konumu; ölçü onun yereline göre geliyor. */
  const readBox = (troika: TroikaText, offsetYCm: number): TextBox | undefined => {
    const bounds = troika.textRenderInfo?.blockBounds
    if (!bounds) return undefined

    const [minX, minY, maxX, maxY] = bounds
    return { minX, minY: minY + offsetYCm, maxX, maxY: maxY + offsetYCm }
  }

  // onSync her yeniden çizimde tetiklenir; ölçü değişmediyse state'e dokunma,
  // yoksa sonsuz render döngüsü olur.
  const handleNameSync = (troika: TroikaText) => {
    const next = readBox(troika, 0)
    if (next) setNameBox((current) => (isSameBox(current, next) ? current : next))
  }

  const handleAreaSync = (troika: TroikaText) => {
    const next = readBox(troika, -LINE_GAP_CM)
    if (next) setAreaBox((current) => (isSameBox(current, next) ? current : next))
  }

  const badge = useMemo(() => {
    if (!nameBox || !areaBox) return undefined

    const minX = Math.min(nameBox.minX, areaBox.minX)
    const maxX = Math.max(nameBox.maxX, areaBox.maxX)
    const minY = Math.min(nameBox.minY, areaBox.minY)
    const maxY = Math.max(nameBox.maxY, areaBox.maxY)
    const widthCm = maxX - minX + BADGE_PADDING_X_CM * 2
    const heightCm = maxY - minY + BADGE_PADDING_Y_CM * 2

    return {
      centerXCm: (minX + maxX) / 2,
      centerYCm: (minY + maxY) / 2,
      shape: createRoundedRect(widthCm, heightCm, BADGE_CORNER_RADIUS_CM),
    }
  }, [nameBox, areaBox])

  return (
    <group position={planToThree(anchor, ROOM_ELEVATION_CM)} rotation={[-Math.PI / 2, 0, 0]}>
      {badge && (
        <mesh
          position={[badge.centerXCm, badge.centerYCm, -BADGE_DEPTH_GAP_CM]}
          renderOrder={RENDER_ORDER.label}
          raycast={() => null}
        >
          <shapeGeometry args={[badge.shape]} />
          {/*
           * Opak değil SAYDAM: opak olsaydı ayrı geçişte ve oda dolgusundan ÖNCE
           * çizilir, saydam dolgu üstünü boyardı. Saydam geçişte renderOrder
           * geçerli, rozet dolgunun üstünde kalır.
           */}
          <meshBasicMaterial
            color={SCENE_COLORS.roomLabelBadge}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      <Text
        font={FONT_URL}
        fontSize={NAME_SIZE_CM}
        color={SCENE_COLORS.roomLabel}
        anchorX="center"
        anchorY="bottom"
        renderOrder={RENDER_ORDER.label}
        onSync={handleNameSync}
        raycast={() => null}
      >
        {name.toLocaleUpperCase(TURKISH_LOCALE)}
      </Text>

      <Text
        font={FONT_URL}
        position={[0, -LINE_GAP_CM, 0]}
        fontSize={AREA_SIZE_CM}
        color={SCENE_COLORS.roomLabel}
        anchorX="center"
        anchorY="top"
        renderOrder={RENDER_ORDER.label}
        onSync={handleAreaSync}
        raycast={() => null}
      >
        {`${areaM2.toFixed(2)} m²`}
      </Text>
    </group>
  )
}
