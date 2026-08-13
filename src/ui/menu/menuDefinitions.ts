export type MenuItemDefinition = {
  id: string
  label: string
  /** checkbox tipi maddeler işaretlenebilir/işaret kaldırılabilir (issue 2.4). */
  kind: 'command' | 'checkbox'
  isEnabled: boolean
  /** Kullanıcıya göründüğü gibi ("Ctrl+K", "Page Up"); tuşu yakalayan yer ayrı. */
  shortcut?: string
}

export type MenuGroupDefinition = {
  /** Grup başlığı (ör. "Toplu İşlemler"). Yoksa gruplar arasına yalnız çizgi girer. */
  title?: string
  items: MenuItemDefinition[]
}

export type MenuDefinition = {
  id: string
  label: string
  groups: MenuGroupDefinition[]
}

/** Bu issue'da yalnız "Kapat" aktif; diğer maddelerin tamamı pasif (issue 2.4). */
const DISABLED: Pick<MenuItemDefinition, 'kind' | 'isEnabled'> = {
  kind: 'command',
  isEnabled: false,
}

const DISABLED_CHECKBOX: Pick<MenuItemDefinition, 'kind' | 'isEnabled'> = {
  kind: 'checkbox',
  isEnabled: false,
}

export const CLOSE_EDITOR_ITEM_ID = 'close'
export const SAVE_ITEM_ID = 'save'
export const EXPORT_ITEM_ID = 'export'
export const UNDO_ITEM_ID = 'undo'
export const REDO_ITEM_ID = 'redo'
export const FLOOR_MANAGEMENT_ITEM_ID = 'floorManagement'
export const FLOOR_COPY_ITEM_ID = 'floorCopy'
export const FLOOR_UP_ITEM_ID = 'floorUp'
export const FLOOR_DOWN_ITEM_ID = 'floorDown'
/** Madde id'si eski adını korur; etiket "Ölçüleri Göster"e genişledi (yalnız duvar değil). */
export const SHOW_DIMENSIONS_ITEM_ID = 'showWallDimensions'
export const SHOW_ELEMENT_LABELS_ITEM_ID = 'showElementLabels'
export const SHOW_GRID_ITEM_ID = 'showGrid'

export const EDITOR_MENUS: readonly MenuDefinition[] = [
  {
    id: 'file',
    label: 'Dosya',
    groups: [
      {
        items: [
          { id: 'open', label: 'Aç', ...DISABLED },
          { id: SAVE_ITEM_ID, label: 'Kaydet', kind: 'command', isEnabled: true },
          { id: 'saveAs', label: 'Farklı Kaydet', ...DISABLED },
          { id: 'clearProject', label: 'Projeyi Temizle', ...DISABLED },
          { id: 'import', label: 'İçe Aktar', ...DISABLED },
          { id: EXPORT_ITEM_ID, label: 'Dışa Aktar (JSON)', kind: 'command', isEnabled: true },
          { id: 'exportPdf', label: "PDF'e Aktar", ...DISABLED },
          { id: 'exportPdfFloors', label: "PDF'e Aktar (Katlar)", ...DISABLED },
          { id: 'downloadProjectFile', label: 'Proje Dosyasını İndir', ...DISABLED },
          { id: 'openProjectFile', label: 'Proje Dosyasını Aç', ...DISABLED },
          { id: 'projectInfo', label: 'Proje Bilgileri', ...DISABLED },
          { id: 'projectHistory', label: 'Proje Hareketleri', ...DISABLED },
          { id: 'send', label: 'Gönder', ...DISABLED },
          { id: CLOSE_EDITOR_ITEM_ID, label: 'Kapat', kind: 'command', isEnabled: true },
        ],
      },
    ],
  },
  {
    id: 'edit',
    label: 'Düzenle',
    groups: [
      {
        items: [
          // Aktiflik çalışma zamanında: geçmiş boşken MenuBar bunları
          // unavailableItemIds ile pasifleştirir.
          { id: UNDO_ITEM_ID, label: 'Geri Al', kind: 'command', isEnabled: true },
          { id: REDO_ITEM_ID, label: 'Yinele', kind: 'command', isEnabled: true },
          { id: 'saveHistory', label: 'Kayıt Geçmişi', ...DISABLED },
        ],
      },
    ],
  },
  {
    id: 'view',
    label: 'Görünüm',
    groups: [
      {
        items: [
          { id: 'viewArchitecture', label: 'Mimari Tasarım', ...DISABLED },
          { id: 'viewInstallation', label: 'Tesisat Tasarımı', ...DISABLED },
          { id: 'viewIsometric', label: 'İzometrik Görünüm', ...DISABLED },
        ],
      },
      {
        items: [
          { id: 'showCanvas', label: 'Çizim Alanı', ...DISABLED_CHECKBOX },
          { id: 'showGuides', label: 'Klavuzlar', ...DISABLED_CHECKBOX },
          {
            id: 'showSceneSwitchButtons',
            label: 'Sahne Değiştirme Düğmelerini Göster',
            ...DISABLED_CHECKBOX,
          },
          {
            id: SHOW_DIMENSIONS_ITEM_ID,
            label: 'Ölçüleri Göster',
            kind: 'checkbox',
            isEnabled: true,
          },
          {
            id: SHOW_ELEMENT_LABELS_ITEM_ID,
            label: 'Etiketleri Göster',
            kind: 'checkbox',
            isEnabled: true,
          },
          {
            id: SHOW_GRID_ITEM_ID,
            label: 'Izgarayı Göster',
            kind: 'checkbox',
            isEnabled: true,
          },
        ],
      },
    ],
  },
  {
    id: 'floors',
    label: 'Katlar',
    groups: [
      {
        items: [
          {
            id: FLOOR_MANAGEMENT_ITEM_ID,
            label: 'Kat Yönetimi',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Ctrl+K',
          },
          {
            id: FLOOR_COPY_ITEM_ID,
            label: 'Kat Kopyalama',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Ctrl+Shift+K',
          },
          // Bu ikisi pencere AÇMAZ, doğrudan aktif katı değiştirir (madde 1).
          {
            id: FLOOR_UP_ITEM_ID,
            label: 'Üst Kata Geç',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Page Up',
          },
          {
            id: FLOOR_DOWN_ITEM_ID,
            label: 'Alt Kata Geç',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Page Down',
          },
        ],
      },
    ],
  },
  {
    id: 'tools',
    label: 'Araçlar',
    groups: [
      {
        title: 'Toplu İşlemler',
        items: [
          { id: 'defineRooms', label: 'Mahalleri Tanımla', ...DISABLED },
          { id: 'startUnitNumbering', label: 'Birim Numaralandırmayı Başlat', ...DISABLED },
          {
            id: 'setConsumptionValveBranchesDn25',
            label: 'Tüketim Vanası Branşmanlarını DN25 Yap',
            ...DISABLED,
          },
          { id: 'deleteRiserLine', label: 'Kolon Hattını Sil', ...DISABLED },
          { id: 'addConsumptionValves', label: 'Tüketim Vanalarını Ekle', ...DISABLED },
          { id: 'deleteUnitInstallations', label: 'Daire İçi Tesisatları Sil', ...DISABLED },
        ],
      },
      {
        items: [
          { id: 'runValidation', label: 'Hata Kontrollerini Çalıştır', ...DISABLED },
          { id: 'installationDetails', label: 'Tesisat Detayları', ...DISABLED },
          { id: 'billOfMaterials', label: 'Malzeme Listesi', ...DISABLED },
        ],
      },
    ],
  },
]

/** Rozet gösterilecek menü (issue 2.4: Katlar başlığının yanında kat adedi). */
export const FLOOR_MENU_ID = 'floors'
