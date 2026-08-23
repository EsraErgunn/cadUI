import { Check, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { canvasBarButtonVariants, canvasBarMenuItemVariants } from './canvasBarVariants'
import { useUiStore } from '../../store/uiStore'

export type ViewOption = {
  id: string
  label: string
  isChecked: boolean
  onToggle: () => void
}

/**
 * Floating bar'ın "Görünüm" açılırı: çizim yardımcılarının görünürlük
 * anahtarları. Maddeler PROPS ile geliyor, burada gömülü değil — ölçü/açı/isim
 * anahtarları kendi aşamalarında ekleniyor ve her aşamada bu bileşen aynı kalıyor.
 *
 * `MenuDropdown` yeniden kullanılmadı: o `MenuDefinition` sözleşmesine bağlı
 * (menü çubuğunun grup/kısayol yapısı) ve buradaki üç satırlık liste için o
 * yapıyı kurmak, menü tanımlarına tuvale ait maddeler sokmak demekti.
 */
export function ViewOptionsMenu() {
  const isAreaObjectNamesVisible = useUiStore((state) => state.isAreaObjectNamesVisible)
  const toggleAreaObjectNamesVisible = useUiStore((state) => state.toggleAreaObjectNamesVisible)
  const isRoomNamesVisible = useUiStore((state) => state.isRoomNamesVisible)
  const toggleRoomNamesVisible = useUiStore((state) => state.toggleRoomNamesVisible)
  const isDimensionsVisible = useUiStore((state) => state.isDimensionsVisible)
  const isPipeLengthsVisible = useUiStore((state) => state.isPipeLengthsVisible)
  const toggleDimensionsVisible = useUiStore((state) => state.toggleDimensionsVisible)
  const togglePipeLengthsVisible = useUiStore((state) => state.togglePipeLengthsVisible)
  const isOpeningDimensionsVisible = useUiStore((state) => state.isOpeningDimensionsVisible)
  const toggleOpeningDimensionsVisible = useUiStore(
    (state) => state.toggleOpeningDimensionsVisible,
  )
  const isCornerAnglesVisible = useUiStore((state) => state.isCornerAnglesVisible)
  const toggleCornerAnglesVisible = useUiStore((state) => state.toggleCornerAnglesVisible)
  const isElementLabelsVisible = useUiStore((state) => state.isElementLabelsVisible)
  const toggleElementLabelsVisible = useUiStore((state) => state.toggleElementLabelsVisible)
  const activeViewId = useUiStore((state) => state.activeViewId)

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dışarı tıklayınca kapanır. Menü çubuğundaki açılırlarla aynı beklenti;
  // `pointerdown` kullanılıyor ki tuvale basıldığında çizim başlamadan kapansın.
  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Ölçüler artık YALNIZ mimarinin: duvar parçalarının boyu. Boru boyu kendi
  // anahtarında (K153) — K131 ikisini tek bayrakta birleştirmişti, gerekçesi
  // menü çubuğundaki tek maddeydi; o menü kalktı ve iki ölçü iki ayrı
  // görünümde yaşıyor.
  const dimensionsOption: ViewOption = {
    id: 'dimensions',
    label: 'Duvar ölçüleri',
    isChecked: isDimensionsVisible,
    onToggle: toggleDimensionsVisible,
  }

  /**
   * ⚠️ TEK İSTİSNA: mimari görünümden TESİSATI yöneten anahtar (kullanıcı
   * kararı). Mimarideki tesisat izi boru boylarını da yazıyor; kullanıcı
   * duvar ölçüsü okurken onları kapatabilmeli ve bunun için tesisat
   * görünümüne geçmek zorunda kalmamalı.
   *
   * Bayrak TEK (`isPipeLengthsVisible`): iki menüde iki ayrı madde değil, aynı
   * anahtarın iki giriş noktası — birinde kapatılan ötekinde de kapalı.
   */
  const pipeLengthsOption: ViewOption = {
    id: 'pipeLengths',
    label: 'Boru ölçüleri',
    isChecked: isPipeLengthsVisible,
    onToggle: togglePipeLengthsVisible,
  }

  const architectureOptions: ViewOption[] = [
    dimensionsOption,
    {
      // Yalnız MİMARİDE: tesisatta açıklık diye bir şey yok. "Ölçüler"den
      // BAĞIMSIZ (K76): kullanıcı yalnız kapı/pencere genişliklerini görmek
      // isteyebilir, bunun için duvar ölçülerini de açmak zorunda kalmasın.
      id: 'openingDimensions',
      label: 'Kapı/pencere ölçüleri',
      isChecked: isOpeningDimensionsVisible,
      onToggle: toggleOpeningDimensionsVisible,
    },
    {
      // Ölçülerden de birbirlerinden de bağımsız (K76'nın kuralı): açı, eğik
      // duvarla çalışırken açılan ayrı bir katman.
      id: 'cornerAngles',
      label: 'Açılar',
      isChecked: isCornerAnglesVisible,
      onToggle: toggleCornerAnglesVisible,
    },
    {
      id: 'areaObjectNames',
      label: 'Nesne adları',
      isChecked: isAreaObjectNamesVisible,
      onToggle: toggleAreaObjectNamesVisible,
    },
    {
      // Ad ve alan (m²) TEK madde: ikisi aynı çapaya yazılmış tek yazı öbeği,
      // ayrı ayrı gizlemek ortada asılı bir sayı bırakırdı.
      id: 'roomNames',
      label: 'Oda adları',
      isChecked: isRoomNamesVisible,
      onToggle: toggleRoomNamesVisible,
    },
    // EN SONDA: mimarinin kendi katmanları yukarıda kalsın, istisna sonda okunsun.
    pipeLengthsOption,
  ]

  // Tesisatın kendi anahtarları; ikisi de menü çubuğunun Görünüm menüsünde
  // zaten vardı, çubuk onları TUVALE getiriyor — durum tek yerde (uiStore),
  // iki arayüz aynı bayrağı okuyor.
  const installationOptions: ViewOption[] = [
    pipeLengthsOption,
    {
      id: 'elementLabels',
      label: 'Eleman adları',
      isChecked: isElementLabelsVisible,
      onToggle: toggleElementLabelsVisible,
    },
  ]

  const options = activeViewId === 'installation' ? installationOptions : architectureOptions

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Görünüm"
        className={canvasBarButtonVariants({ shape: 'label', tone: isOpen ? 'active' : 'plain' })}
      >
        <Eye size={16} strokeWidth={1.8} aria-hidden />
        Görünüm
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Görünüm seçenekleri"
          // Çubuk ekranın ALTINDA olduğu için açılır YUKARI doğru açılır.
          className="absolute bottom-full right-0 z-20 mb-1 min-w-48 rounded-lg border border-edge bg-surface p-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={option.isChecked}
              onClick={option.onToggle}
              className={canvasBarMenuItemVariants()}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {option.isChecked && <Check size={14} strokeWidth={2.2} aria-hidden />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
