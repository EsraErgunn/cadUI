import { useEffect } from 'react'

import { subscribeDrawSurface } from './drawSurfaceEvents'
import { findRoomIdAt } from '../core/roomPick'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/**
 * Mahale SAĞ TIK → kullanım tipi menüsü (K160).
 *
 * Mahali adlandırmanın üçüncü yolu. Diğer ikisi uzak kalıyordu: özellik paneli
 * mahali önce seçmeyi sonra panele gitmeyi istiyor, "Mahalleri Tanımla" kipi
 * (K145) ise TÜM mahalleri gezen bir tur — tek bir odayı düzeltmek için ağır.
 *
 * ⚠️ YALNIZ seçim aracındayken açılır. Sağ tıkın çizim araçlarında zaten bir
 * işi var: aracı bırakıp seçime döndürüyor (K84), duvarda ve boruda ise zinciri
 * bitiriyor. Menü her araçta açılsaydı bu jestlerin üstüne binerdi. Seçim
 * aracında sağ tıkın başka bir işi yok, boşluk orada.
 *
 * ⚠️ Menü açılırken mahal SEÇİLİR: kullanıcı hangi odaya işlem yaptığını
 * görmeli (kullanıcı isteği). Seçim `Room.tsx`'in dolgusunu seçim rengine
 * çeviriyor, ayrı bir vurgu katmanı gerekmedi.
 *
 * Boşluğa ya da mahal olmayan bir yere sağ tık menüyü KAPATIR — açık menü
 * varken başka yere tıklamak "vazgeçtim" demektir.
 */
export function useRoomUsageContextMenu(): void {
  useEffect(
    () =>
      subscribeDrawSurface({
        onContextMenu: (event) => {
          const ui = useArchitectureUiStore.getState()
          if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) {
            // Çizim aracındayken menü açılmaz; açık kalmış bir menü de kapanır.
            if (ui.roomUsageMenu) ui.setRoomUsageMenu(null)
            return
          }

          const cad = useCadStore.getState()
          const roomId = findRoomIdAt(event.planPoint, {
            walls: cad.walls,
            points: cad.points,
            rooms: cad.rooms,
            floorId: cad.activeFloorId,
          })

          if (roomId === undefined) {
            ui.setRoomUsageMenu(null)
            return
          }

          ui.setSelection([{ kind: 'room', id: roomId }])
          ui.setRoomUsageMenu({ roomId, anchor: event.planPoint })
        },
      }),
    [],
  )
}
