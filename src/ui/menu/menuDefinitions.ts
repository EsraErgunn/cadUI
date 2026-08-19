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

export const CLOSE_EDITOR_ITEM_ID = 'close'
export const SAVE_ITEM_ID = 'save'
export const SAVE_AS_ITEM_ID = 'saveAs'
export const IMPORT_ITEM_ID = 'import'
export const EXPORT_ITEM_ID = 'export'

export const EDITOR_MENUS: readonly MenuDefinition[] = [
  {
    id: 'file',
    label: 'Dosya',
    groups: [
      {
        items: [
          { id: 'open', label: 'Aç', ...DISABLED },
          {
            id: SAVE_ITEM_ID,
            label: 'Kaydet',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Ctrl+S',
          },
          {
            id: SAVE_AS_ITEM_ID,
            label: 'Farklı Kaydet',
            kind: 'command',
            isEnabled: true,
            shortcut: 'Ctrl+Shift+S',
          },
          { id: 'clearProject', label: 'Projeyi Temizle', ...DISABLED },
          { id: IMPORT_ITEM_ID, label: 'İçe Aktar', kind: 'command', isEnabled: true },
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
