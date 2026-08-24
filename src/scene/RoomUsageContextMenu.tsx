import { Html } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

import { HANDLE_ELEVATION_CM } from './layers'
import { includesTr } from '../api/turkishText'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { findRoomFaces } from '../core/room'
import { getWallSetKey } from '../core/roomIdentity'
import { toSquareMetres } from '../core/roomLabel'
import { getRoomUsageOptions, type RoomUsageType } from '../core/roomUsage'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { RoomUsagePicker } from '../ui/canvas/RoomUsagePicker'

function closeMenu(): void {
  useArchitectureUiStore.getState().setRoomUsageMenu(null)
}

/**
 * Menünün GÖVDESİ; yalnız menü açıkken mount edilir.
 *
 * Arama kutusunun taslağı burada duruyor, dışarıdaki bileşende değil: menü
 * kapanınca bu bileşen sökülüyor ve arama kendiliğinden sıfırlanıyor. Taslak
 * dışarıda tutulup effect ile sıfırlansaydı hem fazladan bir render turu doğar
 * hem de "effect içinde setState" kuralı çiğnenirdi (eslint yakaladı).
 */
function RoomUsageMenuBody({ roomId }: { roomId: Id }) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => getRoomUsageOptions(), [])
  const visibleOptions = useMemo(
    () => (query.trim() === '' ? options : options.filter((o) => includesTr(o.label, query))),
    [options, query],
  )

  const areaM2 = useRoomAreaM2(roomId)
  const hasUsageType = useCadStore(
    (state) => state.rooms.find((room) => room.id === roomId)?.usageType !== undefined,
  )

  const commit = (usageType: RoomUsageType | undefined) => {
    useCadStore.getState().setRoomUsageType(roomId, usageType)
    closeMenu()
  }

  return (
    <div
      data-room-usage-menu
      role="menu"
      aria-label="Mahal özellikleri"
      // Liste yirmi beş tip: kendi içinde KAYDIRILIR, yoksa menü tuvali baştan
      // aşağı kaplar (kullanıcı isteği: "scroll menü").
      className="max-h-72 w-64 overflow-y-auto rounded-lg border border-edge bg-surface pb-1 shadow-xl"
    >
      {/* Başlık kaydırılan listeyle birlikte kaymasın: menü uzun ve kullanıcı
          aşağıdayken hangi kutuda olduğunu görmeye devam etmeli. */}
      <div className="sticky top-0 z-10 border-b border-edge bg-surface px-4 pb-2 pt-3">
        <h2 className="text-sm font-semibold text-ink">Mahal Özellikleri</h2>
        {/* Alan SALT OKUNUR: mahalin geometrisi duvarların türevi, sayı
            yazılarak değişmez. Yine de yazılıyor çünkü tip seçerken bakılan ilk
            şey mahalin büyüklüğü — kalkan özellik panelinden devralındı. */}
        {areaM2 !== undefined && (
          <p className="mt-0.5 text-xs text-ink-muted">
            Alan: {areaM2.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
          </p>
        )}
      </div>

      <RoomUsagePicker
        query={query}
        onQueryChange={setQuery}
        visibleOptions={visibleOptions}
        onPick={commit}
        onDismiss={closeMenu}
      />

      {/* Tipi GERİ ALMA yolu. Kalkan özellik panelindeki "Tanımsız" seçeneği
          bunu yapıyordu; menüye taşınmasaydı yanlış seçilen bir tip bir daha
          temizlenemezdi. Rozetlerin arasına konmadı: bu bir tip değil, tipi
          kaldıran bir eylem. */}
      {hasUsageType && (
        <div className="border-t border-edge px-4 pb-1 pt-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => commit(undefined)}
            className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Tipi kaldır (Tanımsız)
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Mahalin alanı (m²). Yüzler duvarlardan TÜRETİLİYOR (`Room` geometri taşımaz),
 * bu yüzden her açılışta taze hesaplanıyor — menü yalnız sağ tıkla açıldığı
 * için maliyeti tek seferlik.
 */
function useRoomAreaM2(roomId: Id): number | undefined {
  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return useMemo(() => {
    const room = rooms.find((candidate) => candidate.id === roomId)
    if (!room) return undefined

    const key = getWallSetKey(room.wallIds)
    const face = findRoomFaces(walls, points, activeFloorId).find(
      (candidate) => getWallSetKey(candidate.wallIds) === key,
    )
    return face ? toSquareMetres(face.areaCm2) : undefined
  }, [rooms, walls, points, activeFloorId, roomId])
}

/**
 * Mahale sağ tıkla açılan kullanım tipi menüsü (K160).
 *
 * Seçiciyi `RoomDefinitionCard` ile PAYLAŞIYOR (`RoomUsagePicker`): arama
 * kutusu, Türkçe duyarsız süzme ve rozet düzeni iki yerde de aynı. İkinci bir
 * liste yazılsaydı tip listesi büyüdüğünde biri geride kalırdı.
 *
 * ⚠️ drei `<Html>`: menü gerçek bir DOM parçası ama konumunu KAMERADAN alıyor,
 * bu yüzden menü açıkken kaydırıp yakınlaştırmak onu mahalin üstünde tutuyor.
 * `TextLabelEditor` ile aynı desen.
 *
 * ⚠️ Kapatma NATIVE dinleyicide: `<Html>` ayrı bir react-dom kökünde çiziyor ve
 * o kökten yapılan store yazımı R3F ağacını yeniden çizdirmiyor — React
 * olayına bırakılsaydı menü ekranda asılı kalabilirdi (`TextLabelEditor`de
 * ölçülmüş tuzak).
 */
export function RoomUsageContextMenu() {
  const menu = useArchitectureUiStore((state) => state.roomUsageMenu)
  const isOpen = menu !== null

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    // Menünün DIŞINA yapılan tıklama kapatır. Sağ tıkla açılıyor, sol tıkla
    // kapanıyor: tuvale dönen kullanıcı menüyü ayrıca kapatmak zorunda kalmasın.
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-room-usage-menu]')) return
      closeMenu()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  if (!menu) return null

  const anchor: PlanPoint = menu.anchor

  return (
    <Html position={planToThree(anchor, HANDLE_ELEVATION_CM)} zIndexRange={[30, 20]}>
      <RoomUsageMenuBody roomId={menu.roomId} />
    </Html>
  )
}
