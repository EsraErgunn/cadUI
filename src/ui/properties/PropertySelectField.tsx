import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type PropertySelectOption = { value: string; label: string }

type PropertySelectFieldProps = {
  label: string
  /** Ayrışan değer: çoklu seçimde nesneler farklıysa undefined gelir. */
  value: string | undefined
  options: readonly PropertySelectOption[]
  /** Değer hangi nesneye ait — PropertyNumberField/PropertyTextField ile aynı imza,
   *  burada yalnız tutarlılık için tutulur (seçimde taslak metin yok, senkron gerekmez). */
  targetKey: string
  isReadOnly?: boolean
  /** false dönerse yazım reddedilmiştir. */
  onCommit?: (value: string) => boolean
  rejectionMessage?: string
}

const MIXED_LABEL = 'Farklı'

/** Liste açıldığı yerde EN AZ bu kadar yer bulamazsa da aşağı açılır, içi kayar. */
const MIN_LIST_HEIGHT_PX = 96
const MAX_LIST_HEIGHT_PX = 280
/** Tetikleyici dar (w-24); uzun etiketler ("Merdiven Boşluğu") listede tam okunsun. */
const MIN_LIST_WIDTH_PX = 176
const VIEWPORT_MARGIN_PX = 8

type ListPosition = { topPx: number; leftPx: number; widthPx: number; maxHeightPx: number }

/**
 * Özellik panelinin seçim alanı.
 *
 * Native `<select>` DEĞİL: açılır listenin YÖNÜNÜ tarayıcı seçiyor ve uzun
 * listelerde (mahal kullanım tipi, yirmiyi aşkın seçenek) yukarı doğru açılıp
 * garip görünüyordu — CSS'le kontrol edilebilen bir şey değil. Bu liste HER ZAMAN
 * aşağı açılır; yer yetmezse kısalır ve içi kayar.
 *
 * Liste PORTAL ile `body`'ye çiziliyor: panelin içerik alanı `overflow-y-auto`
 * ve mutlak konumlanan bir kutu orada KIRPILIRDI. Konum tetikleyicinin ekran
 * dikdörtgeninden hesaplandığı için `position: fixed`; panel kaydırılırsa liste
 * kapanır (kayan panelle birlikte hareket etmeyen bir kutu daha kötü olurdu).
 *
 * Taslak metin sorunu yok (kullanıcı harf harf yazmıyor, bir seçenek seçiyor),
 * bu yüzden seçim DOĞRUDAN commit edilir.
 */
export function PropertySelectField({
  label,
  value,
  options,
  targetKey,
  isReadOnly = false,
  onCommit,
  rejectionMessage,
}: PropertySelectFieldProps) {
  const inputId = useId()
  const listId = useId()

  const [isRejected, setIsRejected] = useState(false)
  const [syncedTargetKey, setSyncedTargetKey] = useState(targetKey)
  const [position, setPosition] = useState<ListPosition | undefined>(undefined)
  const [activeIndex, setActiveIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Seçim değişince red bayrağı tazelenir — önceki nesnenin reddi yeni
  // nesnede görünmesin.
  if (syncedTargetKey !== targetKey) {
    setSyncedTargetKey(targetKey)
    setIsRejected(false)
  }

  const isOpen = position !== undefined

  /**
   * Konum EMİR KİPİYLE yazılıyor: değerler `getBoundingClientRect`'ten geliyor,
   * yani çalışma zamanında hesaplanan piksel — Tailwind sınıfıyla ifade
   * edilemez ve JSX inline stili repo kuralınca yasak (sahnedeki imleç
   * atamalarıyla aynı kaçış). `useLayoutEffect`: boyama ÖNCESİ yazılmazsa liste
   * bir kare yanlış yerde görünür.
   */
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || !position) return

    list.style.top = `${position.topPx}px`
    list.style.left = `${position.leftPx}px`
    list.style.width = `${position.widthPx}px`
    list.style.maxHeight = `${position.maxHeightPx}px`
  }, [position])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedLabel = selectedIndex === -1 ? MIXED_LABEL : options[selectedIndex].label

  const close = () => setPosition(undefined)

  const open = () => {
    const trigger = triggerRef.current
    if (!trigger || isReadOnly) return

    const rect = trigger.getBoundingClientRect()
    // Aşağıdaki boşluk asgarinin altındaysa bile YÖN değişmez; liste kısalır.
    const available = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX
    setPosition({
      topPx: rect.bottom,
      leftPx: Math.max(VIEWPORT_MARGIN_PX, rect.right - MIN_LIST_WIDTH_PX),
      widthPx: Math.max(rect.width, MIN_LIST_WIDTH_PX),
      maxHeightPx: Math.max(MIN_LIST_HEIGHT_PX, Math.min(MAX_LIST_HEIGHT_PX, available)),
    })
    setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex)
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (document.getElementById(listId)?.contains(target)) return
      close()
    }
    // Kaydırma/boyut değişiminde konum bayatlar; yeniden hesaplamak yerine
    // kapatılıyor — liste zaten tek tıklamalık bir etkileşim.
    const handleResize = () => close()

    // ⚠️ Dinleyici CAPTURE kipinde: listenin KENDİ kaydırması da buraya düşüyor
    // ve liste açılır açılmaz kapanıyordu (uzun listede aşağı inmek imkânsızdı).
    // Listenin içi konumu bayatlatmaz — yalnız DIŞARIDAKİ kaydırma kapatır.
    const handleScroll = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return
      close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, listId])

  const commit = (nextValue: string) => {
    close()
    triggerRef.current?.focus()
    if (isReadOnly || !onCommit) return

    setIsRejected(!onCommit(nextValue))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isReadOnly) return

    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(options[activeIndex].value)
      return
    }

    const nextIndex = {
      ArrowDown: Math.min(options.length - 1, activeIndex + 1),
      ArrowUp: Math.max(0, activeIndex - 1),
      Home: 0,
      End: options.length - 1,
    }[event.key]

    if (nextIndex !== undefined) {
      event.preventDefault()
      setActiveIndex(nextIndex)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className="text-xs text-ink-muted" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-col items-end">
        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={isRejected}
          disabled={isReadOnly}
          title={selectedLabel}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleKeyDown}
          className="flex w-24 items-center justify-between gap-1 rounded border border-edge bg-surface px-1.5 py-0.5 text-sm text-ink disabled:text-ink-muted aria-invalid:border-danger"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown size={13} strokeWidth={1.8} aria-hidden className="shrink-0" />
        </button>

        {isOpen &&
          createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              // `overscroll-contain`: liste ucuna gelince kaydırma ARKADAKİ
              // panele atlamasın — atlarsa o kaydırma listeyi kapatır ve
              // kullanıcı son seçeneklere ulaşmadan listeyi kaybeder.
              className="fixed z-50 overflow-y-auto overscroll-contain rounded-md border border-edge bg-surface py-1 shadow-lg"
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onPointerDown={(event) => {
                    // pointerdown: dışarı-tık dinleyicisi click'ten önce çalışıp
                    // listeyi kapatıyor ve seçim hiç gerçekleşmiyordu.
                    event.preventDefault()
                    commit(option.value)
                  }}
                  onPointerEnter={() => setActiveIndex(index)}
                  className={`cursor-pointer px-2 py-1 text-sm ${
                    index === activeIndex ? 'bg-selection/15 text-ink' : 'text-ink'
                  } ${option.value === value ? 'font-medium' : ''}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>,
            document.body,
          )}

        {isRejected && rejectionMessage && (
          <span aria-live="polite" className="mt-0.5 text-xs text-danger">
            {rejectionMessage}
          </span>
        )}
      </div>
    </div>
  )
}
