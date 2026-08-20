import { PropertySelectField } from './PropertySelectField'
import type { Id } from '../../core/model'
import { findRoomFaces } from '../../core/room'
import { getWallSetKey } from '../../core/roomIdentity'
import { toSquareMetres } from '../../core/roomLabel'
import { getRoomUsageOptions, isRoomUsageType } from '../../core/roomUsage'
import { useCadStore } from '../../store/cadStore'

type RoomPropertiesProps = {
  roomIds: readonly Id[]
}

/**
 * "Tip seçilmedi" için AYRI bir sentinel: `PropertySelectField` boş string'i
 * ÇOKLU SEÇİMDE AYRIŞAN değer olarak kullanıyor. Tipi olmayan mahal de boş
 * string verseydi "hepsi tipsiz" ile "hepsi farklı tipte" aynı görünürdü.
 */
const NO_USAGE_TYPE = 'none'

/**
 * Mahal tanımlama paneli (K117). Kullanıcı serbest metin YAZMAZ, hazır kullanım
 * tipi listesinden seçer — bu yüzden panelde tek düzenlenebilir alan var.
 *
 * Alan (m²) SALT OKUNUR: mahalin geometrisi duvarların türevi, bir sayı yazarak
 * değiştirilemez. Yine de gösteriliyor çünkü tipi seçerken bakılan ilk şey
 * mahalin büyüklüğü.
 */
export function RoomProperties({ roomIds }: RoomPropertiesProps) {
  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const setRoomUsageType = useCadStore((state) => state.setRoomUsageType)

  const selected = rooms.filter((room) => roomIds.includes(room.id))
  if (selected.length === 0) return null

  const [sole] = selected
  const isSingle = selected.length === 1

  const usageTypes = new Set(selected.map((room) => room.usageType ?? NO_USAGE_TYPE))
  const commonUsageType = usageTypes.size === 1 ? [...usageTypes][0] : undefined

  // Alan yalnız TEK mahalde anlamlı: iki mahalin alanını toplamak da birini
  // seçip göstermek de yanlış bilgi olurdu.
  const areaM2 = (() => {
    if (!isSingle) return undefined

    const key = getWallSetKey(sole.wallIds)
    const face = findRoomFaces(walls, points, activeFloorId).find(
      (candidate) => getWallSetKey(candidate.wallIds) === key,
    )
    return face ? toSquareMetres(face.areaCm2) : undefined
  })()

  return (
    <>
      <PropertySelectField
        label="Kullanım Tipi"
        value={commonUsageType}
        options={[
          { value: NO_USAGE_TYPE, label: 'Tanımsız' },
          ...getRoomUsageOptions(),
        ]}
        targetKey={`rooms-${roomIds.join(',')}`}
        onCommit={(value) => {
          for (const room of selected) {
            setRoomUsageType(room.id, isRoomUsageType(value) ? value : undefined)
          }
          return true
        }}
      />

      {areaM2 !== undefined && (
        <p className="px-1 py-1 text-xs text-ink-muted">
          Alan: {areaM2.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
        </p>
      )}
    </>
  )
}
