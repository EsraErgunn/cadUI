import { ArrowLeft, ChevronDown, Info } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { EditorActions } from './menu/EditorActions'
import { MenuDropdown } from './menu/MenuDropdown'
import { ViewSwitcher } from './menu/ViewSwitcher'
import { editorBarButtonVariants } from './menu/editorBarVariants'
import {
  CLEAR_PROJECT_ITEM_ID,
  DEFINE_ROOMS_ITEM_ID,
  DOWNLOAD_PROJECT_FILE_ITEM_ID,
  EDITOR_MENUS,
  EXPORT_ITEM_ID,
  IMPORT_ITEM_ID,
  OPEN_PROJECT_FILE_ITEM_ID,
  SAVE_AS_ITEM_ID,
  SAVE_ITEM_ID,
} from './menu/menuDefinitions'
import { MENU_ICONS } from './menu/menuIcons'
import { getFloorRoomStops } from '../core/roomDefinition'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'
import type { VersionHistorySource } from './versions/VersionHistoryMenu'

type MenuBarProps = {
  onCloseEditor: () => void
  /** Onay penceresini AÇAR; temizleme kararını çağıran verir, bar yalnız haber eder. */
  onClearProject: () => void
  /** Proje dosyası (PDF) penceresini açar; kat seçimi ve sayfa ayarları orada. */
  onDownloadProjectFile: () => void
  /** Proje dosyası (PDF) seçicisini açar; çizim o dosyadan geri yüklenir. */
  onOpenProjectFile: () => void
  onSave: () => void
  onSaveAs: () => void
  onImport: () => void
  onExport: () => void
  isSaving: boolean
  /** Kayıt geçmişi listesinin kaynağı; bar yalnız TAŞIR, kendisi kullanmaz. */
  versionHistory: VersionHistorySource
}

/**
 * Üst bar üç öbeğe indi: solda projeden çıkış + kalan iki menü (Dosya, Araçlar),
 * ortada sahne değiştirici, sağda proje eylemleri.
 *
 * Düzenle/Görünüm/Katlar menüleri KALKTI: geri al-yinele, görünüm anahtarları ve
 * kat geçişi tuvalin ALT çubuğuna taşındı (K54/K55) — çizerken el orada, üst
 * bara çıkmak için çizimi bırakmak gerekiyordu. Kayıt Geçmişi ise Düzenle'nin
 * tek kalan maddesiydi, sağdaki eylem öbeğine kendi düğmesi olarak geçti.
 *
 * Barın kendi zemini YOK: sayfa zemininin üstünde duruyor, düğmeler tek tek kart.
 */
export function MenuBar({
  onCloseEditor,
  onClearProject,
  onDownloadProjectFile,
  onOpenProjectFile,
  onSave,
  onSaveAs,
  onImport,
  onExport,
  isSaving,
  versionHistory,
}: MenuBarProps) {
  const isReadOnly = useUiStore((state) => state.isEditorReadOnly)
  const activeViewId = useUiStore((state) => state.activeViewId)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // "Mahalleri Tanımla"nın pasifliği için. Mahal sayısı çizimden TÜRETİLİYOR
  // (Room kendi katını taşımaz, duvarlarından gelir), o yüzden useMemo: bar her
  // render'da yüz taraması yapmasın — sürükleme önizlemesi cadStore'a
  // yazılmadığı için bu bağımlılıklar yalnız gerçek düzenlemede değişir.
  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const floorRoomCount = useMemo(
    () => getFloorRoomStops(rooms, walls, points, activeFloorId).length,
    [rooms, walls, points, activeFloorId],
  )
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (openMenuId === null) return undefined

    // pointerdown kullanılıyor: click ile dinlersek başlık butonunun kendi click'i
    // menüyü kapattıktan hemen sonra yeniden açar.
    const handlePointerDown = (event: PointerEvent) => {
      if (barRef.current?.contains(event.target as Node)) return
      setOpenMenuId(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  /**
   * Salt görüntülemede kapatılan DOSYA maddeleri. `MenuDropdown`'ın hâzır
   * `unavailableItemIds` prop'u kullanılıyor — menü için ikinci bir pasiflik
   * mekanizması yazılmadı.
   *
   * "Dışa Aktar" ve "Proje Dosyasını İndir" LİSTEDE YOK: ikisi de dosyayı
   * dışarı yazıyor, çizime dokunmuyor — okuma işlemi. Kapatılanların hepsi
   * çizime yazar (Kaydet ve Farklı Kaydet sunucuya; İçe Aktar, Proje Dosyasını
   * Aç ve Projeyi Temizle doğrudan store'a).
   */
  const unavailableItemIds = useMemo(() => {
    const unavailable = new Set<string>()
    if (isReadOnly) {
      unavailable.add(SAVE_ITEM_ID)
      unavailable.add(SAVE_AS_ITEM_ID)
      unavailable.add(IMPORT_ITEM_ID)
      unavailable.add(OPEN_PROJECT_FILE_ITEM_ID)
      unavailable.add(CLEAR_PROJECT_ITEM_ID)
      // Mahal tanımlamak da YAZAR: salt görüntülemede kip hiç açılmamalı.
      unavailable.add(DEFINE_ROOMS_ITEM_ID)
    }
    // Mahal MİMARİ görünümün nesnesi; tesisatta ve izometrikte tuvalde
    // vurgulanacak bir mahal yok, kip boşa açılırdı.
    if (activeViewId !== 'architecture') unavailable.add(DEFINE_ROOMS_ITEM_ID)
    // Katta HİÇ mahal yoksa madde pasif: gezilecek durak olmadığı için tıklama
    // hiçbir şey yapmazdı. "Hepsi tanımlı" hâli pasiflik sebebi DEĞİL — orada
    // kip gözden geçirme turuna dönüyor (bkz. startRoomDefinition).
    if (floorRoomCount === 0) unavailable.add(DEFINE_ROOMS_ITEM_ID)

    return unavailable.size === 0 ? undefined : unavailable
  }, [isReadOnly, activeViewId, floorRoomCount])

  /**
   * Kip için prop YOK: başlatmak saf UI durumu, sayfadan hiçbir şey gerektirmiyor
   * (Kaydet/İçe Aktar'ın aksine). Kuyruk BURADA hesaplanıp store'a veriliyor —
   * store cadStore'u okusaydı iki UI store'u birbirine bağlanırdı.
   *
   * Tanımsız mahal kalmadıysa kip TÜM mahalleri gezer: gözden geçirme turu.
   * Böylece madde hiçbir zaman "tıklanıp hiçbir şey yapmayan" duruma düşmez.
   *
   * ⚠️ Bu tur SIFIRLAMA DEĞİL — hiçbir tip silinmiyor, kullanıcı yalnız
   * mahalleri yeniden geziyor ve isterse üstüne yazıyor. Bu yüzden onay
   * penceresi de YOK: yıkıcı olmayan bir işlem için uyarı, kullanıcının her
   * seferinde geçtiği gereksiz bir kapıdır (yanlışlıkla yazılan tip zaten
   * Ctrl+Z ile geri alınır).
   */
  const startRoomDefinition = () => {
    const cad = useCadStore.getState()
    const stops = getFloorRoomStops(cad.rooms, cad.walls, cad.points, cad.activeFloorId)
    const undefinedStops = stops.filter((stop) => !stop.isDefined)
    const queue = undefinedStops.length > 0 ? undefinedStops : stops

    useArchitectureUiStore.getState().startRoomDefinition(queue.map((stop) => stop.roomId))
  }

  const handleSelectItem = (itemId: string) => {
    setOpenMenuId(null)
    // Yalnız aktif maddeler buraya gelir; kalanı disabled.
    if (itemId === CLEAR_PROJECT_ITEM_ID) onClearProject()
    if (itemId === DOWNLOAD_PROJECT_FILE_ITEM_ID) onDownloadProjectFile()
    if (itemId === OPEN_PROJECT_FILE_ITEM_ID) onOpenProjectFile()
    if (itemId === SAVE_ITEM_ID) onSave()
    if (itemId === SAVE_AS_ITEM_ID) onSaveAs()
    if (itemId === IMPORT_ITEM_ID) onImport()
    if (itemId === EXPORT_ITEM_ID) onExport()
    if (itemId === DEFINE_ROOMS_ITEM_ID) startRoomDefinition()
  }

  return (
    <header ref={barRef} className="flex shrink-0 items-center gap-2 px-4 py-2.5">
      {/* Tek çerçevesiz düğme: bu bir menü değil, ekrandan ÇIKIŞ — kartların
          arasında durursa aynı öbekten sayılır. */}
      <button
        type="button"
        onClick={onCloseEditor}
        className={`${editorBarButtonVariants()} mr-2 font-medium text-canvas-overlay-ink-strong`}
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden />
        Projeler
      </button>

      <nav className="flex items-center gap-2" aria-label="Ana menü">
        {EDITOR_MENUS.map((menu) => {
          const Icon = MENU_ICONS[menu.id]
          return (
            <div key={menu.id} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={openMenuId === menu.id}
                onClick={() => setOpenMenuId((current) => (current === menu.id ? null : menu.id))}
                className={editorBarButtonVariants({
                  tone: openMenuId === menu.id ? 'active' : 'card',
                })}
              >
                {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden />}
                {menu.label}
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden
                  className="text-canvas-overlay-ink"
                />
              </button>
              {openMenuId === menu.id && (
                <MenuDropdown
                  menu={menu}
                  onSelectItem={handleSelectItem}
                  unavailableItemIds={unavailableItemIds}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* İki esnek boşluk: sahne değiştirici, iki yandaki öbeklerin genişliğinden
          BAĞIMSIZ olarak barın ortasında kalsın (Kaydet "Kaydediliyor…" olunca
          öbek genişliyor, tek boşlukla ortadaki düğmeler kayardı). */}
      <div className="flex-1" />
      <ViewSwitcher />
      {/* Sahne değiştiricinin YANINDA ama çerçevesinin DIŞINDA: o üçlü tek bir
          seçici olarak okunmalı, bu ise bağımsız bir eylem (K111). Menüden buraya
          taşındı — proje künyesi bir "dosya işlemi" değil, her an bakılacak bilgi.
          Arkasındaki ekran yazılana kadar pasif (palet dürüstlüğü, K79). */}
      <button
        type="button"
        disabled
        title="Proje Bilgileri"
        aria-label="Proje Bilgileri"
        className={editorBarButtonVariants({ tone: 'card', shape: 'icon' })}
      >
        <Info size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <div className="flex-1" />

      <EditorActions
        onSave={onSave}
        isSaving={isSaving}
        isReadOnly={isReadOnly}
        versionHistory={versionHistory}
      />
    </header>
  )
}
