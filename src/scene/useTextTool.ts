import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { getPlacementPosition } from '../core/placement'
import { SELECTION_TOOL_ID, TEXT_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

/**
 * Metin yerleştirme: tek tık metni koyar ve düzenleme kutusunu AÇAR. Boş bir
 * metin bırakmanın anlamı yok — kullanıcı yazmak için tıkladı.
 *
 * Yerleştirmenin ardından SEÇİM aracına dönülür (alan nesnesindeki sağ tık
 * kuralının, K42, buradaki karşılığı): metin arka arkaya konan bir şey değil,
 * konup yazılan bir şey. Araç açık kalsaydı kullanıcı kutuya yazarken tuvale
 * her tıkladığında yeni bir metin doğardı.
 *
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 */
export function useTextTool(): void {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const isActive = activeToolId === TEXT_TOOL_ID

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    const resolvePoint = (event: DrawSurfacePointerEvent): PlanPoint => {
      // Ctrl ızgarayı anlık kapatır — alan nesnesi/sembol yerleştirmesiyle aynı.
      if (event.ctrlKey) return event.planPoint
      return getPlacementPosition(event.planPoint, readCameraViewport(camera).zoom)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: (event) => {
        if (event.button !== LEFT_BUTTON) return

        const createdId = useCadStore.getState().addTextLabel(resolvePoint(event))
        const ui = useArchitectureUiStore.getState()
        // Yeni metin hem seçili hem düzenlemede: kullanıcı yazmayı bitirince
        // nesne zaten seçili kalsın, taşımak için ikinci bir tık gerekmesin.
        ui.setSelection([{ kind: 'text', id: createdId }])
        ui.setEditingText(createdId)
        useUiStore.getState().setActiveTool(SELECTION_TOOL_ID)
      },
    })

    return unsubscribe
  }, [camera, isActive])
}
