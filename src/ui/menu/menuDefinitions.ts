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
/** "Proje Dosyasını İndir" — pafta + gömülü proje verisi taşıyan PDF. */
export const DOWNLOAD_PROJECT_FILE_ITEM_ID = 'downloadProjectFile'
/** "Proje Dosyasını Aç" — aynı PDF'ten çizimi geri yükler. */
export const OPEN_PROJECT_FILE_ITEM_ID = 'openProjectFile'
/** "Mahalleri Tanımla" — tanımsız mahalleri tek tek gezdiren kip (K145). */
export const DEFINE_ROOMS_ITEM_ID = 'defineRooms'

/**
 * Menü YALNIZ dosya biçimi işlerini taşır. Üst barda kendi düğmesi olan hiçbir
 * madde burada TEKRARLANMAZ — aynı işi iki yerde sunmak, ikisinin farklı şeyler
 * yaptığını düşündürüyor (K111):
 * - "Kapat" → soldaki "← Projeler" düğmesi (ikisi de `onCloseEditor`)
 * - "Proje Hareketleri" → sağdaki "Kayıt Geçmişi" düğmesi
 * - "Proje Bilgileri" → sahne değiştiricinin yanındaki bilgi ikonu
 * - "Gönder" → sağdaki "Gönder" düğmesi
 *
 * "Proje Dosyasını İndir/Aç" artık ÇALIŞIYOR ve biçimi PDF: indirilen dosya hem
 * basılabilir pafta hem de çizimin kendisi — proje verisi belgeye GÖMÜLÜ
 * (core/pdf/projectPayload.ts), "Aç" onu geri okuyor. İçe/Dışa Aktar (JSON) ile
 * kopya değiller: o ikisi ham veri alışverişi, bunlar teslim edilebilir dosya.
 * Etiketlerdeki "(JSON)" ayrımı bu yüzden duruyor.
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
          {
            id: DOWNLOAD_PROJECT_FILE_ITEM_ID,
            label: 'Proje Dosyasını İndir',
            kind: 'command',
            isEnabled: true,
          },
          {
            id: OPEN_PROJECT_FILE_ITEM_ID,
            label: 'Proje Dosyasını Aç',
            kind: 'command',
            isEnabled: true,
          },
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
      /*
       * Menü DÖRT maddeye indi (kullanıcı seçti). Çıkanlar: Birim
       * Numaralandırmayı Başlat, Tüketim Vanası Branşmanlarını DN25 Yap,
       * Tüketim Vanalarını Ekle, Tesisat Detayları ve Hata Kontrollerini
       * Çalıştır.
       *
       * Hata kontrolü menüden çıktı ama KAYBOLMADI: üst barda kendi düğmesi var
       * ve o ÇALIŞIYOR (K115) — menüdeki pasif kopyası ikinci bir giriş yolu
       * vaat edip hiçbir şey yapmıyordu.
       *
       * "Mahalleri Tanımla" K145'te ÇALIŞIR hâle geldi; kalanlar hâlâ PASİF
       * (`isPlanned` deseni, K79): "tıklanabilir görünüp hiçbir şey yapmayan
       * madde" yerine "henüz yok" demek.
       */
      {
        title: 'Toplu İşlemler',
        items: [
          {
            id: DEFINE_ROOMS_ITEM_ID,
            label: 'Mahalleri Tanımla',
            kind: 'command',
            isEnabled: true,
          },
          { id: 'deleteRiserLine', label: 'Kolon Hattını Sil', ...DISABLED },
          { id: 'deleteUnitInstallations', label: 'Tesisat Sil', ...DISABLED },
        ],
      },
      {
        items: [{ id: 'billOfMaterials', label: 'Malzeme Listesi', ...DISABLED }],
      },
    ],
  },
]
