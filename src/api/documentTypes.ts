/**
 * Evrak tipleri — MOCK. Uç yazmak backend'in işi; burada yalnız ekranların
 * beslendiği liste duruyor.
 *
 * Sunucuda parametrik kod grubu mekanizması var (`GET /api/codes/by-group-name/
 * {groupName}`), yani bu liste ileride oradan gelecek. Bugünkü kaynağı
 * gereksinim belgesi. Sözleşme taslağı: docs/api-eksikleri-evraklar.md
 */

export interface DocumentType {
  code: string
  label: string
}

/**
 * Belgedeki 19 tipten "Favori Evrak" ÇIKARILDI: favori kavramı tümüyle kapsam
 * dışı, seçilebilen ama hiçbir şey yapmayan bir tip kullanıcıya olmayan bir
 * özellik vaat ederdi.
 *
 * Kodlar istemci uydurmasıdır: kod grubu açılınca sunucunun `CodeValue`'ları
 * gelecek. URL'deki `type` filtresi bu kodu taşıdığı için geçişte eski
 * bağlantılar filtresiz açılır — bilinçli.
 */
const DOCUMENT_TYPES: DocumentType[] = [
  { code: 'bacaRaporu', label: 'Baca Raporu' },
  { code: 'cihazBacaAtisBelgesi', label: 'Cihaz Baca Atış Belgesi' },
  { code: 'cihazMinimumTuketimBeyani', label: 'Cihaz Minimum Tüketim Beyanı' },
  { code: 'cihazServisKontrolRaporu', label: 'Cihaz Servis Kontrol Raporu' },
  { code: 'cihazStandartBelgesi', label: 'Cihaz Standart Belgesi' },
  { code: 'cihazUygunlukBelgesi', label: 'Cihaz Uygunluk Belgesi' },
  { code: 'daskPolicesi', label: 'DASK Poliçesi' },
  { code: 'dogalgazUygunlukBelgesi', label: 'Doğalgaz Uygunluk Belgesi' },
  { code: 'esnekTesisatEgitimBelgesi', label: 'Esnek Tesisat Eğitim Belgesi' },
  { code: 'esnekTesisatMykBelgesi', label: 'Esnek Tesisat MYK Belgesi' },
  { code: 'gazYeterlilikBelgesi', label: 'Gaz Yeterlilik Belgesi' },
  { code: 'genelEvrak', label: 'Genel Evrak' },
  { code: 'mahalUygunlukBelgesi', label: 'Mahal Uygunluk Belgesi' },
  { code: 'musteriSozlesmesi', label: 'Müşteri Sözleşmesi' },
  { code: 'numurataj', label: 'Numurataj' },
  { code: 'police', label: 'Poliçe' },
  { code: 'resim', label: 'Resim' },
  { code: 'ruhsat', label: 'Ruhsat' },
]

/**
 * Liste filtresinin ve Evrak Ekle dropdown'ının ORTAK kaynağı (gereksinim 3):
 * iki ekran ayrı liste tutsaydı filtrede hiç görünmeyen bir tiple evrak
 * yüklenebilirdi.
 *
 * Sıralama Türkçe ve BURADA: kod grubu ucuna geçilince sunucunun sırası
 * ('Ç' harfini 'D'den sonra veriyor) dropdown'ı bozmasın.
 */
export function getDocumentTypes(): DocumentType[] {
  return [...DOCUMENT_TYPES].sort((left, right) => left.label.localeCompare(right.label, 'tr'))
}

/** Satırdaki kodun ekranda görünecek karşılığı; tanınmayan kod HAM gösterilir —
    listeye sonradan eklenen bir tip yüzünden hücre boşalmasın. */
export function resolveDocumentTypeLabel(code: string, types: DocumentType[]): string {
  return types.find((type) => type.code === code)?.label ?? code
}
