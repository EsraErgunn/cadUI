import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { Id } from '../core/model'
import type { SketchStroke } from '../core/sketchStroke'
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
   * BORU boyu yazıları (tesisat görünümü). Duvar ölçülerinden AYRI bayrak
   * (kullanıcı isteği): K131 ikisini tek anahtarda birleştirmişti, gerekçesi
   * menü çubugundaki tek "Ölçüleri Göster" maddesinin hangisini kastettiğini
   * söyleyememesiydi. O menü kalktı (K90) ve iki ölçü artık iki ayrı görünümde
   * yaşıyor — tek anahtar, tesisatta boru boyunu kapatmak isteyeni mimaride
   * duvar ölçülerinden de ediyordu.
   */
  isPipeLengthsVisible: boolean
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
   * Serbest çizim darbeleri (K163). PROJEYE KAYDEDİLMEZ — bu yüzden cadStore'da
   * değil burada: orada yalnız kaydedilecek JSON durur (CLAUDE.md kural 4).
   *
   * ⚠️ Sonucu: sayfa yenilenince kaybolurlar ve Ctrl+Z onlara DOKUNMAZ (geri
   * alma çizim geçmişini yönetiyor, bu store'u değil). Silmenin yolu SİLGİ.
   */
  sketchStrokes: SketchStroke[]
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
   * Mimari ad etiketleri: alan nesneleri (kolon/baca şaftı/kolon havalandırması,
   * K50) ve mimari cihazlar (alarm/sensör/söndürücü/pano/şalter/menfez/
   * aydınlatma). Varsayılan AÇIK: etiket eklenirken hep görünürdü, anahtar
   * davranışı değiştirmemeli — yalnız kapatma imkânı ekliyor.
   *
   * İki nesne ailesi TEK anahtar paylaşıyor: menüdeki adı "Nesne adları" ve
   * kullanıcı için ikisi de nesnenin adı; ayrı iki madde gereksiz bir ayrım
   * olurdu.
   */
  isAreaObjectNamesVisible: boolean
  /**
   * CİHAZ ad etiketleri (pano, menfez, alarm, yangın söndürücü…). Yapı
   * elemanı adlarından AYRI bayrak (kullanıcı isteği): ikisi tek anahtardaydı
   * ve gerekçesi "kullanıcı için ikisi de nesnenin adı"ydı — renkler ayrılınca
   * (K152) ikisi ayrı aile oldu, adlandırma da ayrıldı.
   */
  isDeviceNamesVisible: boolean
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
  /**
   * Katı modelde bütün bina mı yalnız aktif kat mı görünüyor. Varsayılan TÜMÜ:
   * katı modelin varlık sebebi katların üst üste okunması, tek kat zaten iki
   * çizim görünümünde var.
   */
  isSolidAllFloorsVisible: boolean
  /** Katı modelde oda döşemeleri. Kapalıyken bina yalnız duvar iskeleti olur. */
  isSolidSlabsVisible: boolean
  /** Katı modelde tesisat (boru + eleman). Mimariyi tek başına görmek için kapanır. */
  isSolidInstallationVisible: boolean
  /**
   * Duvarları yarı saydam gösterir: tesisat duvarın ARKASINDA kaldığında
   * borunun nereden geçtiği başka türlü görünmüyor.
   */
  isSolidWallsTransparent: boolean
  /**
   * Katı model kamerasını binaya yeniden oturtma isteği. `pendingFocusBounds`
   * ile aynı gerekçe: kamera <Canvas> içinde yaşıyor, çubuk dışında — arada
   * store'dan geçen tek seferlik bir emirden başka köprü yok.
   */
  pendingSolidCameraReset: boolean
  requestFocus: (bounds: PlanBounds) => void
  clearFocusRequest: () => void
  toggleSolidAllFloorsVisible: () => void
  toggleSolidSlabsVisible: () => void
  toggleSolidInstallationVisible: () => void
  toggleSolidWallsTransparent: () => void
  requestSolidCameraReset: () => void
  clearSolidCameraReset: () => void
  setActiveTool: (toolId: ToolId | InstallationToolId) => void
  setActiveView: (viewId: ViewId) => void
  toggleDimensionsVisible: () => void
  togglePipeLengthsVisible: () => void
  toggleOpeningDimensionsVisible: () => void
  toggleCornerAnglesVisible: () => void
  toggleElementLabelsVisible: () => void
  toggleGridVisible: () => void
  addSketchStroke: (stroke: SketchStroke) => void
  removeSketchStroke: (strokeId: Id) => void
  toggleGridSnapEnabled: () => void
  toggleAreaObjectNamesVisible: () => void
  toggleDeviceNamesVisible: () => void
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
    /**
     * MİMARİ AÇILIŞ KADRAJI (kullanıcı kararı): yalnız DUVAR ÖLÇÜLERİ ve ODA
     * ADLARI açık. Kalan katmanları isteyen elle açar.
     *
     * Gerekçe: plan ilk açıldığında okunabilir olmalı. Hepsi açıkken ölçü, açı,
     * yapı elemanı adı, cihaz adı ve boru boyu aynı anda yazılıyor ve küçük
     * dairelerde yazılar üst üste biniyordu — kullanıcı çizimi göremeden
     * katmanları kapatmakla başlıyordu.
     *
     * ⚠️ Bu, K74/K76'daki "açıklık ölçüsü varsayılan AÇIK" kararını GERİ ALIR.
     * O kararın gerekçesi "yeni anahtar davranışı değiştirmemeli"ydi, yani
     * geriye uyumluluktu — kullanıcı artık açılış kadrajını bilerek seçti.
     */
    isDimensionsVisible: true,
    isRoomNamesVisible: true,
    isOpeningDimensionsVisible: false,
    isCornerAnglesVisible: false,
    isAreaObjectNamesVisible: false,
    isDeviceNamesVisible: false,
    /**
     * ⚠️ Boru ölçüsü bayrağı TESİSATLA PAYLAŞILIYOR (K153: mimariden tesisatı
     * yöneten tek anahtar). Mimari açılışı temiz olsun diye KAPALI başlıyor —
     * bunun bedeli tesisat görünümünün de boru boyları kapalı açılması.
     * Ayrı varsayılan istenirse bayrağı ikiye bölmek gerekir ve o zaman
     * "tek anahtar, iki giriş noktası" kuralı düşer.
     */
    isPipeLengthsVisible: false,
    /** Tesisatın KENDİ katmanı; mimari açılış kararının kapsamı dışında. */
    isElementLabelsVisible: true,
    isGridVisible: true,
    sketchStrokes: [],
    isGridSnapEnabled: true,
    isPanModeActive: false,
    // Varsayılan KAPALI: kipi yalnız editör açıkça kuruyor, yani yönetici ve
    // proje firması kullanıcısı için hiçbir şey değişmiyor.
    isEditorReadOnly: false,
    pendingFocusBounds: null,
    isSolidAllFloorsVisible: true,
    isSolidSlabsVisible: true,
    isSolidInstallationVisible: true,
    isSolidWallsTransparent: false,
    pendingSolidCameraReset: false,

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
        // ⚠️ IZGARA GÖRÜNÜM GEÇİŞİNDE SIFIRLANMAZ (kullanıcı kararı, K153).
        // Eskiden tesisata geçince kapanıp mimariye dönünce açılıyordu;
        // gerekçesi tesisatta ızgaranın boru hayaletiyle karışmasıydı. Anahtar
        // menüden ÇUBUĞA çıkınca bu otomatik ezme hataya dönüştü: kullanıcının
        // bilerek kapattığı ve önünde duran bir düğme kendiliğinden geri
        // açılıyordu. Izgaranın durumu artık tümüyle kullanıcının.
        //
        // Katı modele her girişte kamera binaya yeniden oturur: kullanıcı
        // çizime devam edip binayı büyütmüş olabilir, eski çerçeve artık
        // yanlış yere bakıyordur. (Izgaranın aksine bu bir GÖRÜNÜRLÜK ayarı
        // değil, tek seferlik bir istek — kullanıcının açısını kalıcı olarak
        // ezmiyor.)
        if (viewId === 'solid') draft.pendingSolidCameraReset = true
      }),

    toggleDimensionsVisible: () =>
      set((draft) => {
        draft.isDimensionsVisible = !draft.isDimensionsVisible
      }),

    togglePipeLengthsVisible: () =>
      set((draft) => {
        draft.isPipeLengthsVisible = !draft.isPipeLengthsVisible
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

    addSketchStroke: (stroke) =>
      set((draft) => {
        draft.sketchStrokes.push(stroke)
      }),

    removeSketchStroke: (strokeId) =>
      set((draft) => {
        draft.sketchStrokes = draft.sketchStrokes.filter((stroke) => stroke.id !== strokeId)
      }),

    toggleGridSnapEnabled: () =>
      set((draft) => {
        draft.isGridSnapEnabled = !draft.isGridSnapEnabled
      }),

    toggleAreaObjectNamesVisible: () =>
      set((draft) => {
        draft.isAreaObjectNamesVisible = !draft.isAreaObjectNamesVisible
      }),

    toggleDeviceNamesVisible: () =>
      set((draft) => {
        draft.isDeviceNamesVisible = !draft.isDeviceNamesVisible
      }),

    toggleRoomNamesVisible: () =>
      set((draft) => {
        draft.isRoomNamesVisible = !draft.isRoomNamesVisible
      }),

    setPanModeActive: (isActive) =>
      set((draft) => {
        draft.isPanModeActive = isActive
      }),

    toggleSolidAllFloorsVisible: () =>
      set((draft) => {
        draft.isSolidAllFloorsVisible = !draft.isSolidAllFloorsVisible
        // Kapsam değişince gövde tümüyle başka bir yer kaplıyor; kamera eski
        // çerçevede kalsaydı tek kata inildiğinde bina ekrandan çıkardı.
        draft.pendingSolidCameraReset = true
      }),

    toggleSolidSlabsVisible: () =>
      set((draft) => {
        draft.isSolidSlabsVisible = !draft.isSolidSlabsVisible
      }),

    toggleSolidInstallationVisible: () =>
      set((draft) => {
        draft.isSolidInstallationVisible = !draft.isSolidInstallationVisible
      }),

    toggleSolidWallsTransparent: () =>
      set((draft) => {
        draft.isSolidWallsTransparent = !draft.isSolidWallsTransparent
      }),

    requestSolidCameraReset: () =>
      set((draft) => {
        draft.pendingSolidCameraReset = true
      }),

    clearSolidCameraReset: () =>
      set((draft) => {
        draft.pendingSolidCameraReset = false
      }),

    setEditorReadOnly: (isReadOnly) =>
      set((draft) => {
        draft.isEditorReadOnly = isReadOnly
      }),
  })),
)
