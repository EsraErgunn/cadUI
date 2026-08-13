/**
 * Evrak Ekle ekranındaki kaynak sekmeleri. Bileşen dosyasından ayrı: o dosya
 * yalnız bileşen dışa aktarabiliyor (react-refresh kuralı).
 *
 * İKİ sekme — belgedeki "Favori Evraklar" kapsam dışı.
 */
export const DOCUMENT_SOURCES = ['computer', 'project'] as const

export type DocumentSource = (typeof DOCUMENT_SOURCES)[number]
