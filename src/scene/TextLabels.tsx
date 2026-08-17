import { Text } from '@react-three/drei'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree } from '../core/coords'
import type { TextLabel } from '../core/model'
import { isSelected } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/** Ölçü/oda etiketleriyle aynı yazı tipi; repodan gelir (CDN'e gitmez). */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION_X = -Math.PI / 2

const DEG_TO_RAD = Math.PI / 180

/**
 * Kullanıcının plana koyduğu notlar. Ölçü ve oda adlarının AKSİNE boyu dünya
 * biriminde (`heightCm`): metin çizimin parçası, üstünde yüzen bir okuma
 * yardımcısı değil — zoom'da duvarlarla birlikte büyür (K81).
 *
 * Düzenleme kutusu ayrı bileşende (`TextLabelEditor`), jest `useTextTool`'da:
 * burası salt çizim, `AreaObjectNameLabels` ile aynı iş bölümü.
 */
export function TextLabels() {
  const texts = useCadStore((state) => state.texts)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selection = useArchitectureUiStore((state) => state.selection)
  const editingTextId = useArchitectureUiStore((state) => state.editingTextId)
  const draggingTexts = useArchitectureUiStore((state) => state.draggingTexts)

  return (
    <group name="text-labels">
      {texts
        .filter((text) => text.floorId === activeFloorId)
        // Düzenlenen metin çizilmez: kutu zaten aynı yerde ve aynı yazıyı
        // gösteriyor, ikisi üst üste binince yazı çift görünüyordu.
        .filter((text) => text.id !== editingTextId)
        .map((text) => {
          // Sürüklenen metin geçici konumuyla çizilir; store'a bırakma anında yazılır.
          const drag = draggingTexts?.textIds.includes(text.id) ? draggingTexts : undefined
          const drawn: TextLabel = drag
            ? { ...text, x: text.x + drag.dxCm, y: text.y + drag.dyCm }
            : text

          return (
            <Text
              // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
              key={text.id}
              font={FONT_URL}
              position={planToThree(drawn, HANDLE_ELEVATION_CM)}
              // Z ekseni etrafındaki dönüş yazıyı kendi açısında tutar; yatırma
              // (X) önce uygulanıyor, sıra değişirse yazı düzlemden kalkar.
              rotation={[FLAT_ROTATION_X, 0, drawn.angleDeg * DEG_TO_RAD]}
              fontSize={drawn.heightCm}
              color={
                isSelected(selection, 'text', text.id)
                  ? SCENE_COLORS.selection
                  : ARCHITECTURE_COLORS.text
              }
              anchorX="center"
              anchorY="middle"
              renderOrder={RENDER_ORDER.label}
            >
              {drawn.text}
            </Text>
          )
        })}
    </group>
  )
}
