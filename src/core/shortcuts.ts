export type EditorShortcut = {
  id: string
  /** Aynı işi yapan alternatif dizilimler (Ctrl+Shift+Z ile Ctrl+Y gibi). */
  keys: readonly string[]
  label: string
}

/**
 * Mimari görünümde geçerli kısayollar — palet altındaki ipucu bu listeden
 * üretilir. Liste core'da: ipucunu çizen ui/ ile tuşu yakalayan pages/ aynı
 * metni iki yerde tutmasın (tools.ts ile aynı gerekçe).
 * Geri al/yinele burada MİMARİ geçmişi gezer; tesisat geçmişi ayrıdır
 * (bkz. plumbing/core/plumbingShortcuts.ts).
 */
export const ARCHITECTURE_SHORTCUTS = [
  { id: 'undo', keys: ['Ctrl+Z'], label: 'Mimaride geri al' },
  { id: 'redo', keys: ['Ctrl+Shift+Z', 'Ctrl+Y'], label: 'Mimaride yinele' },
  { id: 'save', keys: ['Ctrl+S'], label: 'Projeyi kaydet' },
  { id: 'save-as', keys: ['Ctrl+Shift+S'], label: 'Yeni sürüm olarak kaydet' },
  { id: 'floors', keys: ['Ctrl+K'], label: 'Kat yönetimini aç' },
  { id: 'floor-copy', keys: ['Ctrl+Shift+K'], label: 'Kat kopyalamayı aç' },
  { id: 'delete', keys: ['Delete', 'Backspace'], label: 'Seçili elemanları sil' },
  { id: 'marquee', keys: ['Sol tuşla sürükle'], label: 'Çerçeveyle çoklu seç' },
  { id: 'add-to-selection', keys: ['Shift+tık', 'Shift+sürükle'], label: 'Seçime ekle / çıkar' },
  {
    id: 'free-position',
    keys: ['Ctrl+tık', 'Ctrl+sürükle'],
    // Ctrl YALNIZ ızgarayı kapatır (scene/gridSnapMode.ts): köşe ve duvar
    // eksenine yakalama sürer, çünkü mevcut geometriye bağlanmak serbest
    // konumlandırmadan güçlü bir niyettir. Metin bunu söylemezse kullanıcı
    // Ctrl'ün tüm yakalamayı kapattığını sanıyor.
    label: 'Izgarayı kapat (köşe/duvar yakalaması kalır)',
  },
  {
    id: 'free-angle',
    keys: ['Ctrl+tutamaç sürükle'],
    label: 'Döndürmede açı yakalamasını kapat',
  },
  { id: 'cancel', keys: ['Esc'], label: 'Süren jesti iptal et' },
  {
    id: 'right-click',
    keys: ['Sağ tık'],
    // Duvarda iki adımlı (useRightClickReturnsToSelection): ilk sağ tık zinciri
    // bitirir, ikincisi araçtan çıkar. Tek satırda anlatılamayacağı için metin
    // genel kuralı veriyor.
    label: 'Jesti bitir, seçim aracına dön',
  },
  { id: 'zoom', keys: ['Tekerlek'], label: 'İmleç merkezli yakınlaş / uzaklaş' },
  { id: 'pan', keys: ['Space + sol tuş', 'Orta tuş'], label: 'Çizimi kaydır' },
] as const satisfies readonly EditorShortcut[]
