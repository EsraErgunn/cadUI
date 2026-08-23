import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { roomDefinitionChipVariants } from './canvasBarVariants'
import { isTypingTarget } from '../../core/domEvents'
import { getFloorRoomStops, getRoomFocusBounds } from '../../core/roomDefinition'
import { toSquareMetres } from '../../core/roomLabel'
import { getRoomUsageOptions, type RoomUsageType } from '../../core/roomUsage'
import {
  selectRoomDefinitionRoomId,
  useArchitectureUiStore,
} from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

/** İlk dokuz rozet rakam tuşuyla da seçilir; sonrası yalnız fareyle. */
const QUICK_KEY_COUNT = 9

function formatAreaM2(areaCm2: number): string {
  const areaM2 = toSquareMetres(areaCm2)
  return `${areaM2.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`
}

/**
 * "Mahalleri Tanımla" kipinin kartı — tuvalin ALTINDA yüzer, çizimi KAPATMAZ.
 *
 * Referans uygulamada bu iş ekranın ortasındaki bir pencereydi: kullanıcı hangi
 * mahali adlandırdığını GÖREMİYOR, yalnız "Zemin Kat" yazısına güveniyordu.
 * Burada sıradaki mahal ekranda vurgulanıyor ve kamera ona gidiyor; kart da
 * yoldan çekilmek için alta, yüzen çubukla aynı dile alındı (K54).
 */
export function RoomDefinitionCard() {
  const queue = useArchitectureUiStore((state) => state.roomDefinitionQueue)
  const index = useArchitectureUiStore((state) => state.roomDefinitionIndex)
  const currentRoomId = useArchitectureUiStore(selectRoomDefinitionRoomId)

  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const floorName = useCadStore(
    (state) => state.floors.find((floor) => floor.id === state.activeFloorId)?.name,
  )

  /**
   * Geometri KUYRUKTAN değil çizimden okunuyor: kuyruk yalnız kimlik tutuyor
   * (bkz. store) ve kullanıcı kip açıkken duvar oynatabilir.
   *
   * Harita kattaki BÜTÜN mahalleri taşır, yalnız tanımsızları değil: geri
   * gidilen durak artık tanımlıysa da kamera oraya gitmeli.
   */
  const stopsByRoomId = useMemo(() => {
    const stops = getFloorRoomStops(rooms, walls, points, activeFloorId)
    return new Map(stops.map((stop) => [stop.roomId, stop]))
  }, [rooms, walls, points, activeFloorId])

  const currentStop = currentRoomId === undefined ? undefined : stopsByRoomId.get(currentRoomId)
  const options = useMemo(() => getRoomUsageOptions(), [])

  // Durak değişince kamera oraya gider. İstek store'dan geçiyor: zoom/pan
  // kamerada yaşıyor ve DOM tarafı kamerayı doğrudan oynatamaz (ViewportFocus).
  const focusCorners = currentStop?.corners
  useEffect(() => {
    if (!focusCorners) return
    useUiStore.getState().requestFocus(getRoomFocusBounds(focusCorners))
  }, [focusCorners])

  /**
   * Tip yazıldıktan sonra İLK tanımsız durağa geçer, bir sonrakine değil:
   * kullanıcı geri gidip aradaki bir mahali düzelttiyse, tanımlanmış durakları
   * yeniden göstermek boşuna tıklatırdı. Kalan yoksa kip kendini kapatır —
   * boş kartla ekranda durmak "hâlâ iş var" der.
   *
   * ⚠️ `stopsByRoomId` bu anda BAYAT (yazım daha yeni yapıldı, render olmadı):
   * az önce tanımlanan mahal hâlâ haritada görünür, o yüzden ayrıca eleniyor.
   */
  const advanceAfter = (justDefinedRoomId: number) => {
    const state = useArchitectureUiStore.getState()
    const currentQueue = state.roomDefinitionQueue
    if (!currentQueue) return

    const nextIndex = currentQueue.findIndex(
      (roomId, position) =>
        position > state.roomDefinitionIndex &&
        roomId !== justDefinedRoomId &&
        stopsByRoomId.get(roomId)?.isDefined === false,
    )

    if (nextIndex === -1) state.stopRoomDefinition()
    else state.goToRoomDefinitionIndex(nextIndex)
  }

  const commitUsageType = (usageType: RoomUsageType) => {
    const state = useArchitectureUiStore.getState()
    const roomId = state.roomDefinitionQueue?.[state.roomDefinitionIndex]
    if (roomId === undefined) return

    useCadStore.getState().setRoomUsageType(roomId, usageType)
    advanceAfter(roomId)
  }

  const isActive = queue !== null
  useEffect(() => {
    if (!isActive) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const store = useArchitectureUiStore.getState()

      if (event.key === 'Escape') {
        store.stopRoomDefinition()
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const step = event.key === 'ArrowRight' ? 1 : -1
        store.goToRoomDefinitionIndex(store.roomDefinitionIndex + step)
        return
      }

      // Rakam tuşu = o sıradaki rozet. Rozetler tr-TR sırasında dizildiği için
      // rakam da ekranda görünen sırayı izler.
      const digit = Number(event.key)
      if (!Number.isInteger(digit) || digit < 1 || digit > QUICK_KEY_COUNT) return
      const option = options[digit - 1]
      if (option) commitUsageType(option.value)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // Dinleyici store'u HER TUŞTA yeniden okuyor; bağımlılığa yazılan tek şey
    // kipin açık olup olmadığı ve rozet listesi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, options])

  if (queue === null) return null

  const total = queue.length
  // Çizimden silinen mahal de "bitmiş" sayılır: kuyrukta duruyor ama artık
  // tanımlanamaz, ilerleme onun yüzünden hiç dolmamazlık etmesin.
  const definedCount = queue.filter(
    (roomId) => stopsByRoomId.get(roomId)?.isDefined !== false,
  ).length

  return (
    // Yüzen çubuğun ÜSTÜNDE duruyor (`bottom-16`), üstünü örtmüyor: kip
    // açıkken de kat oku, geri al ve ızgara anahtarı elin altında kalmalı —
    // kart onları kapatınca kullanıcı kipten çıkmak zorunda kalıyordu.
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-4">
      <section
        aria-label="Mahal tanımlama"
        className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-edge bg-surface/95 shadow-lg backdrop-blur"
      >
        {/* İlerleme kartın ÜST KENARINDA: ayrı bir satır kaplamadan "ne kadar
            kaldı" sorusunu yanıtlıyor. Genişlik çalışma zamanı yüzdesi —
            Tailwind sınıfıyla ifade edilemez, inline stil de yasak, o yüzden
            emir kipiyle yazılıyor (PropertySelectField'daki aynı kaçış). */}
        <div className="h-1 w-full bg-surface-sunken">
          <div
            ref={(element) => {
              if (element) element.style.width = `${(definedCount / total) * 100}%`
            }}
            className="h-full bg-selection transition-[width] duration-200"
          />
        </div>

        <header className="flex items-center gap-2 px-4 pt-3">
          <h2 className="text-sm font-semibold text-ink">Mahal Tanımlama</h2>
          <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs tabular-nums text-ink-muted">
            {index + 1} / {total}
          </span>
          {floorName && <span className="text-xs text-ink-muted">{floorName}</span>}

          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              title="Önceki mahal (←)"
              aria-label="Önceki mahal"
              disabled={index === 0}
              onClick={() => useArchitectureUiStore.getState().goToRoomDefinitionIndex(index - 1)}
              className={roomDefinitionChipVariants({ shape: 'icon' })}
            >
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden />
            </button>
            <button
              type="button"
              title="Sonraki mahal (→)"
              aria-label="Sonraki mahal"
              disabled={index >= total - 1}
              onClick={() => useArchitectureUiStore.getState().goToRoomDefinitionIndex(index + 1)}
              className={roomDefinitionChipVariants({ shape: 'icon' })}
            >
              <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
            </button>
            <button
              type="button"
              title="Bitir (Esc)"
              aria-label="Mahal tanımlamayı bitir"
              onClick={() => useArchitectureUiStore.getState().stopRoomDefinition()}
              className={roomDefinitionChipVariants({ shape: 'icon' })}
            >
              <X size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        </header>

        <p aria-live="polite" className="px-4 pt-1 text-xs text-ink-muted">
          {currentStop?.isDefined && (
            <Check size={12} strokeWidth={2.2} aria-hidden className="mr-1 inline text-selection" />
          )}
          {currentStop === undefined
            ? 'Bu mahal artık çizimde yok.'
            : currentStop.isDefined
              ? 'Bu mahal tanımlandı — başka bir tip seçebilir ya da ileri gidebilirsin.'
              : 'Ekranda vurgulanan mahal'}
          {currentStop && (
            <>
              {' · '}
              <span className="text-ink">{formatAreaM2(currentStop.areaCm2)}</span>
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-1.5 p-4 pt-2.5">
          {options.map((option, position) => (
            <button
              key={option.value}
              type="button"
              onClick={() => commitUsageType(option.value)}
              className={roomDefinitionChipVariants()}
            >
              {position < QUICK_KEY_COUNT && (
                <kbd className="rounded bg-surface-sunken px-1 text-[10px] text-ink-muted">
                  {position + 1}
                </kbd>
              )}
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
