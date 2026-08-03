export type MenuItemDefinition = {
  id: string
  label: string
  /** checkbox tipi maddeler işaretlenebilir/işaret kaldırılabilir (issue 2.4). */
  kind: 'command' | 'checkbox'
  isEnabled: boolean
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
          { id: 'export', label: 'Dışa Aktar', ...DISABLED },
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
          { id: 'undo', label: 'Geri Al', ...DISABLED },
          { id: 'redo', label: 'Yinele', ...DISABLED },
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
          { id: 'showWallDimensions', label: 'Duvar Ölçülerini Göster', ...DISABLED_CHECKBOX },
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
          { id: 'floorManagement', label: 'Kat Yönetimi', ...DISABLED },
          { id: 'floorCopy', label: 'Kat Kopyalama', ...DISABLED },
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
