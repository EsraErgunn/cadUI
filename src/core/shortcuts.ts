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
 * Liste boşken ipucu paneli "henüz eklenmedi" yazar; buraya kayıt eklemek
 * dışında dokunulacak yer yok.
 */
// TODO(Enfal): mimari kısayollar (duvar/oda/açıklık araçları, seçim, silme)
// buraya yazılacak. Tuş metni kullanıcıya göründüğü gibi: 'Ctrl+Z', 'Esc'.
export const ARCHITECTURE_SHORTCUTS: readonly EditorShortcut[] = []
