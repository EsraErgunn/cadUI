/**
 * Mahalin KULLANIM TİPİ (talep dokümanı madde 104: "her mahal için kullanım
 * tipi — mutfak, salon…").
 *
 * Referans WebCAD'de karşılığı YOK: oradaki `Room` yalnız serbest metin bir
 * `label` taşıyor ve ekrandaki "Tanımsız" yazısı o etiketin BOŞ hâlinin
 * karşılığı, bir tip değil (bkz. knowledge/webcad-json-format.md). Yani bu
 * liste referanstan kopyalanamadı, doğalgaz tesisat planının ihtiyaç duyduğu
 * mahallerden TASLAK olarak yazıldı — analist listeyi budayınca değişecek TEK
 * yer burası.
 *
 * ⚠️ Bu liste henüz ONAYLANMADI. Üstüne kural yazma (hangi cihaz hangi mahale
 * konabilir sorusu ayrı bir tablo ve o tablo da yok — bkz.
 * docs/api-eksikleri-hata-kontrol.md, Hata3).
 */
export const ROOM_USAGE_TYPES = [
  'kitchen',
  'livingRoom',
  'bedroom',
  'bathroom',
  'toilet',
  'hall',
  'boilerRoom',
  'laundry',
  'pantry',
  'balcony',
  'stairwell',
  'garage',
  'storage',
  'shaft',
  'workplace',
] as const

export type RoomUsageType = (typeof ROOM_USAGE_TYPES)[number]

export const ROOM_USAGE_LABELS: Record<RoomUsageType, string> = {
  kitchen: 'Mutfak',
  livingRoom: 'Salon',
  bedroom: 'Yatak Odası',
  bathroom: 'Banyo',
  toilet: 'WC',
  hall: 'Hol',
  boilerRoom: 'Kazan Dairesi',
  laundry: 'Çamaşırlık',
  pantry: 'Kiler',
  balcony: 'Balkon',
  stairwell: 'Merdiven Boşluğu',
  garage: 'Garaj',
  storage: 'Depo',
  shaft: 'Şaft',
  workplace: 'İş Yeri',
}

/** Tipi de adı da olmayan mahalin etiketi — referans uygulamadaki yazının aynısı. */
export const UNDEFINED_ROOM_LABEL = 'Tanımsız'

export function isRoomUsageType(value: string): value is RoomUsageType {
  return (ROOM_USAGE_TYPES as readonly string[]).includes(value)
}

/**
 * Türkçe alfabetik sıralı seçenekler. Sıra listenin YAZIM sırasından değil
 * `tr-TR` karşılaştırmasından geliyor: liste büyüdükçe elle sıralı tutmak
 * unutuluyor ve kullanıcı aradığını bulamıyor.
 */
export function getRoomUsageOptions(): { value: RoomUsageType; label: string }[] {
  return ROOM_USAGE_TYPES.map((value) => ({ value, label: ROOM_USAGE_LABELS[value] })).sort(
    (left, right) => left.label.localeCompare(right.label, 'tr-TR'),
  )
}

/**
 * Mahalin ekranda görünen adı: kullanım tipinin adı, tip seçilmemişse
 * "Tanımsız".
 *
 * Serbest metin ad KALDIRILDI (K117): kullanıcı kendi metnini yazmıyor, hazır
 * etiketlerden seçiyor. Tek kaynak `usageType` olunca etiketin türetimi de tek
 * satıra indi.
 */
export function getRoomDisplayName(usageType: RoomUsageType | undefined): string {
  return usageType ? ROOM_USAGE_LABELS[usageType] : UNDEFINED_ROOM_LABEL
}
