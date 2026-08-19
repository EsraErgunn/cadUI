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

export const SAVE_ITEM_ID = 'save'
export const SAVE_AS_ITEM_ID = 'saveAs'
export const IMPORT_ITEM_ID = 'import'
export const EXPORT_ITEM_ID = 'export'
export const CLEAR_PROJECT_ITEM_ID = 'clearProject'

/**
 * Menü YALNIZ dosya biçimi işlerini taşır. Üst barda kendi düğmesi olan hiçbir
 * madde burada TEKRARLANMAZ — aynı işi iki yerde sunmak, ikisinin farklı şeyler
 * yaptığını düşündürüyor (K111):
 * - "Kapat" → soldaki "← Projeler" düğmesi (ikisi de `onCloseEditor`)
 * - "Proje Hareketleri" → sağdaki "Kayıt Geçmişi" düğmesi
 * - "Proje Bilgileri" → sahne değiştiricinin yanındaki bilgi ikonu
 * - "Gönder" → sağdaki "Gönder" düğmesi
 *
 * "Proje Dosyasını Aç/İndir" JSON'dan BAŞKA bir biçim için ayrılmış; biçim
 * kararlaşmadığı için pasif duruyorlar ve İçe/Dışa Aktar'ın kopyası DEĞİLLER.
 * Etiketlerdeki "(JSON)" bu ayrımı görünür kılıyor.
 */
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
        ],
      },
      {
        items: [
          { id: IMPORT_ITEM_ID, label: 'İçe Aktar (JSON)', kind: 'command', isEnabled: true },
          { id: EXPORT_ITEM_ID, label: 'Dışa Aktar (JSON)', kind: 'command', isEnabled: true },
        ],
      },
      {
        items: [
          { id: 'exportPdf', label: "PDF'e Aktar", ...DISABLED },
          { id: 'exportPdfFloors', label: "PDF'e Aktar (Katlar)", ...DISABLED },
        ],
      },
      {
        items: [
          { id: 'openProjectFile', label: 'Proje Dosyasını Aç', ...DISABLED },
          { id: 'downloadProjectFile', label: 'Proje Dosyasını İndir', ...DISABLED },
        ],
      },
      {
        // Yıkıcı olan tek madde, kendi grubunda ve EN SONDA: yanlışlıkla
        // tıklanmasın diye sık kullanılanlardan uzakta duruyor.
        items: [
          { id: CLEAR_PROJECT_ITEM_ID, label: 'Projeyi Temizle', kind: 'command', isEnabled: true },
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
