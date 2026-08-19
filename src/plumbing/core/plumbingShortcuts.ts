import type { EditorShortcut } from '../../core/shortcuts'

/**
 * Tesisat görünümünde geçerli kısayollar — palet altındaki ipucu bu listeden
 * üretilir. Liste core'da: ipucunu çizen ui/ ile tuşu yakalayan pages/ aynı
 * metni iki yerde tutmasın (eslint ui/ ↔ pages/ importunu da engelliyor).
 * Geri al/yinele burada TESİSAT geçmişini gezer; mimari geçmişi ayrıdır
 * (bkz. pages/useEditorShortcuts.ts).
 */
export const PLUMBING_SHORTCUTS = [
  { id: 'undo', keys: ['Ctrl+Z'], label: 'Tesisatta geri al' },
  { id: 'redo', keys: ['Ctrl+Shift+Z', 'Ctrl+Y'], label: 'Tesisatta yinele' },
  { id: 'save', keys: ['Ctrl+S'], label: 'Projeyi kaydet' },
  { id: 'delete', keys: ['Delete', 'Backspace'], label: 'Seçili elemanları sil' },
  { id: 'marquee', keys: ['Sol tuşla sürükle'], label: 'Çerçeveyle çoklu seç' },
  { id: 'add-to-selection', keys: ['Shift+tık', 'Shift+sürükle'], label: 'Seçime ekle / çıkar' },
  {
    id: 'free-position',
    keys: ['Ctrl+tık', 'Ctrl+sürükle'],
    // Ctrl YALNIZ ızgarayı kapatır: porta/boruya/duvar eksenine yakalama sürer,
    // çünkü bağlantı kurmak serbest konumlandırmadan güçlü bir niyettir
    // (useLineTool.resolveSnap). Metin bunu söylemezse kullanıcı Ctrl'ün tüm
    // yakalamayı kapattığını sanıyor.
    label: 'Izgarayı kapat (port/boru yakalaması kalır)',
  },
  { id: 'copy', keys: ['Ctrl+C'], label: 'Seçimi kopyala' },
  { id: 'cut', keys: ['Ctrl+X'], label: 'Seçimi kes' },
  { id: 'paste', keys: ['Ctrl+V'], label: 'Yapıştır' },
  { id: 'cancel', keys: ['Esc'], label: 'İptal et, seçim aracına dön' },
  { id: 'zoom', keys: ['Tekerlek'], label: 'İmleç merkezli yakınlaş / uzaklaş' },
  { id: 'pan', keys: ['Space + sol tuş', 'Orta tuş'], label: 'Çizimi kaydır' },
] as const satisfies readonly EditorShortcut[]
