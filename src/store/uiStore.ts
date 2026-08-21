import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { DEFAULT_TOOL_ID, type ToolId } from '../core/tools'
import type { PlanBounds } from '../core/viewport'
import { DEFAULT_VIEW_ID, type ViewId } from '../core/views'
import {
  DEFAULT_INSTALLATION_TOOL_ID,
  type InstallationToolId,
} from '../plumbing/core/installationTools'

type UiState = {
  activeToolId: ToolId | InstallationToolId
  activeViewId: ViewId
  /**
   * Görünüm ▸ Ölçüleri Göster. Görüntüleme tercihi: kaydedilmez, geçmişe girmez.
   * Varsayılan AÇIK (K131): ölçü çizimin okunmasının parçası, kullanıcının her
   * oturumda elle açması gereken bir ek değil.
   */
  isDimensionsVisible: boolean
  /**
   * Kapı/pencere GENİŞLİĞİNİN ölçüsü (K74). `isDimensionsVisible`den BAĞIMSIZ
   * (K76): duvar ölçüleri kapalıyken de açık kalabilir — kullanıcı yalnız
   * açıklık genişliklerini görmek isteyebilir ve bunun için planı sayıya
   * boğmak zorunda kalmasın.
   */
  isOpeningDimensionsVisible: boolean
  /**
   * Köşelerdeki duvar arası AÇILARI (K77). Ölçülerden ayrı anahtar ve varsayılan
   * KAPALI: planların çoğu dik açılardan oluşuyor, her köşeye 90° yazmak
   * kalabalıktan başka bir şey getirmez — açı, eğik duvarla çalışırken açılır.
   */
  isCornerAnglesVisible: boolean
  /** Görünüm ▸ Etiketleri Göster (tesisat eleman adları). Ölçülerle aynı gerekçe. */
  isElementLabelsVisible: boolean
  /**
   * Görünüm ▸ Izgarayı Göster. Kapalıyken hem çizgiler kaybolur hem de tesisat
   * araçlarının ızgara yakalaması devre dışı kalır (`plumbing/scene/
   * placementSnap.ts`) — kullanıcı isteği, çizim ızgara yüzünden zorlaşıyordu.
   * Mimari tarafın kendi ızgara yakalaması bu bayrağı OKUMAZ, kapsam dışı.
   */
  isGridVisible: boolean
  /**
   * Izgaraya yakalama açık mı (K54)? Ctrl'ün ANLIK kapatması bunun ÜSTÜNE
   * biner: etkin yakalama = `isGridSnapEnabled && !ctrlKey`.
   *
   * Uç/köşe/duvar yakalaması bu anahtardan ETKİLENMEZ — kullanıcı seçti.
   * Kapansaydı duvarlar köşede birleşmez, oda çevrimi kapanmaz ve mahal
   * tespiti çalışmazdı.
   */
  isGridSnapEnabled: boolean
  /**
   * Alan nesnesi ad etiketleri (kolon/baca şaftı/kolon havalandırması, K50).
   * Varsayılan AÇIK: etiket eklenirken hep görünürdü, anahtar davranışı
   * değiştirmemeli — yalnız kapatma imkânı ekliyor.
   */
  isAreaObjectNamesVisible: boolean
  /**
   * Oda etiketleri. Ad ve alan (m²) TEK blok olarak açılıp kapanır: ikisi
   * aynı çapaya yazılmış tek bir yazı öbeği, ayrı ayrı gizlemek ortada asılı
   * bir sayı bırakırdı.
   */
  isRoomNamesVisible: boolean
  /**
   * El (pan) modu: sol tuş sürüklemesi çizim/seçim yerine kamerayı kaydırır.
   * Space'in YAPIŞKAN hâli ve aynı bastırma yolundan geçer — ikinci bir pan
   * uygulaması yazılmaz (`useViewportControls`, `DrawSurface`).
   */
  isPanModeActive: boolean
  /**
   * SALT GÖRÜNTÜLEME kipi: çizim görünür ama hiçbir şekilde değiştirilemez.
   * `isPanModeActive` ile aynı kategori — editörün çalışma KİPİ, çizim verisi
   * değil: kaydedilmez, zundo geçmişine girmez, projeyi kirletmez.
   *
   * Kipi kuran tek yer `pages/EditorPage.tsx` (rolden türetir); okuyan yerler
   * tuval otobüsü (`scene/DrawSurface`), klavye dinleyicileri, arayüz yüzeyleri
   * ve cadStore'un merkezî kapısı.
   *
   * ⚠️ Bu bir GÜVENLİK sınırı DEĞİL. Çizimin sunucuya yazılmasının tek yolu
   * `POST /api/projects/{id}/newversion` ve o uç zaten
   * `Authorize(Roles = Admin, ProjectFirmUser)` ile korunuyor. Buradaki kip,
   * kullanıcıya yapamayacağı işi yaptırmamak içindir.
   */
  isEditorReadOnly: boolean
  /**
   * Hata kontrollerindeki "göster" için TEK SEFERLİK kamera isteği. Zoom/pan
   * hâlâ kamerada yaşıyor (aşağıdaki nota bkz.) — burada duran şey görüntünün
   * kendisi değil, DOM tarafından verilmiş bir emir: liste `<Canvas>` dışında,
   * kamera içinde ve ikisi arasında başka bir köprü yok. Sahne isteği
   * uyguladığı anda `null`'a çeker, yani sürekli bir durum birikmez.
   */
  pendingFocusBounds: PlanBounds | null
  requestFocus: (bounds: PlanBounds) => void
  clearFocusRequest: () => void
  setActiveTool: (toolId: ToolId | InstallationToolId) => void
  setActiveView: (viewId: ViewId) => void
  toggleDimensionsVisible: () => void
  toggleOpeningDimensionsVisible: () => void
  toggleCornerAnglesVisible: () => void
  toggleElementLabelsVisible: () => void
  toggleGridVisible: () => void
  toggleGridSnapEnabled: () => void
  toggleAreaObjectNamesVisible: () => void
  toggleRoomNamesVisible: () => void
  setPanModeActive: (isActive: boolean) => void
  setEditorReadOnly: (isReadOnly: boolean) => void
}

/**
 * cadStore'dan AYRI store: kaydedilmez, zundo geçmişine girmez.
 * Araç/görünüm seçiminin projeyi kirletmemesi (issue 2.9) bu ayrımın doğal
 * sonucudur — ayrıca kontrol edilmesi gereken bir kural değil.
 * Zoom/pan burada da yok; onlar kamerada yaşıyor (bkz. scene/useViewportControls).
 */
export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeToolId: DEFAULT_TOOL_ID,
    activeViewId: DEFAULT_VIEW_ID,
    isDimensionsVisible: true,
    // Varsayılan AÇIK: ölçüler açıldığında açıklık genişlikleri hep görünüyordu,
    // yeni anahtar davranışı değiştirmemeli — yalnız kapatma imkânı ekliyor.
    isOpeningDimensionsVisible: true,
    isCornerAnglesVisible: false,
    isElementLabelsVisible: true,
    isGridVisible: true,
    isGridSnapEnabled: true,
    isAreaObjectNamesVisible: true,
    isRoomNamesVisible: true,
    isPanModeActive: false,
    // Varsayılan KAPALI: kipi yalnız editör açıkça kuruyor, yani yönetici ve
    // proje firması kullanıcısı için hiçbir şey değişmiyor.
    isEditorReadOnly: false,
    pendingFocusBounds: null,

    requestFocus: (bounds) =>
      set((draft) => {
        draft.pendingFocusBounds = bounds
      }),

    clearFocusRequest: () =>
      set((draft) => {
        draft.pendingFocusBounds = null
      }),

    setActiveTool: (toolId) =>
      set((draft) => {
        draft.activeToolId = toolId
        // Bir çizim aracı seçmek el modundan ÇIKARIR: ikisi aynı anda açıkken
        // sol tuş hem pan hem çizim yapamaz, kullanıcı de aracı seçip
        // çizemediğinde sebebini göremezdi.
        draft.isPanModeActive = false
      }),

    setActiveView: (viewId) =>
      set((draft) => {
        draft.activeViewId = viewId
        // Görünüm değişince araç o görünümün varsayılanına döner; önceki paletin
        // aracı yeni palette geçersiz kalmasın. isometric'te palet yok, dokunulmaz.
        if (viewId === 'architecture') draft.activeToolId = DEFAULT_TOOL_ID
        if (viewId === 'installation') draft.activeToolId = DEFAULT_INSTALLATION_TOOL_ID
        // Izgara her görünümün kendi varsayılanına döner: tesisatta arkadaki
        // ızgara boru/sembol hayaletiyle karışıyordu, mimaride çizim için
        // gerekli. İsteyen Görünüm ▸ Izgarayı Göster ile elle kapatır/açar —
        // bu otomatik varsayım o manuel denetimin YERİNE geçmez, yalnız
        // görünüm değişiminde başlangıç durumunu belirler.
        if (viewId === 'installation') draft.isGridVisible = false
        if (viewId === 'architecture') draft.isGridVisible = true
      }),

    toggleDimensionsVisible: () =>
      set((draft) => {
        draft.isDimensionsVisible = !draft.isDimensionsVisible
      }),

    toggleOpeningDimensionsVisible: () =>
      set((draft) => {
        draft.isOpeningDimensionsVisible = !draft.isOpeningDimensionsVisible
      }),

    toggleCornerAnglesVisible: () =>
      set((draft) => {
        draft.isCornerAnglesVisible = !draft.isCornerAnglesVisible
      }),

    toggleElementLabelsVisible: () =>
      set((draft) => {
        draft.isElementLabelsVisible = !draft.isElementLabelsVisible
      }),

    toggleGridVisible: () =>
      set((draft) => {
        draft.isGridVisible = !draft.isGridVisible
      }),

    toggleGridSnapEnabled: () =>
      set((draft) => {
        draft.isGridSnapEnabled = !draft.isGridSnapEnabled
      }),

    toggleAreaObjectNamesVisible: () =>
      set((draft) => {
        draft.isAreaObjectNamesVisible = !draft.isAreaObjectNamesVisible
      }),

    toggleRoomNamesVisible: () =>
      set((draft) => {
        draft.isRoomNamesVisible = !draft.isRoomNamesVisible
      }),

    setPanModeActive: (isActive) =>
      set((draft) => {
        draft.isPanModeActive = isActive
      }),

    setEditorReadOnly: (isReadOnly) =>
      set((draft) => {
        draft.isEditorReadOnly = isReadOnly
      }),
  })),
)
