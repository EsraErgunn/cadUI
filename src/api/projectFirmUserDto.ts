/**
 * Proje firması kullanıcılarının ARAYÜZ tipleri.
 *
 * `gasFirmDto`/`projectFirmDto`'nun aksine burada zod şeması YOK: bu ekranın
 * hiçbir ucu sunucuda yok (bkz. unimplementedEndpoints.ts), yani doğrulanacak
 * bir sunucu gövdesi de yok. Uydurma bir şema yazmak, olmayan bir sözleşmeyi
 * varmış gibi göstermek olurdu. Uç açıldığında DTO şeması ve `to…Item` eşlemesi
 * bu dosyaya eklenecek; ekranın kullandığı tipler aynı kalacak.
 *
 * Beklenen sözleşme taslağı: docs/api-eksikleri-kullanicilar.md
 */

/**
 * Belgedeki "Yetki" değerleri. Bunlar `Role.Code` DEĞİL: rol modeli üç kodla
 * kesinleşti ve kullanıcı başına tek rol var (knowledge/access-control.md),
 * oysa yetki KULLANICI başına değil YETKİ SATIRI başına değişiyor — aynı
 * kullanıcı bir firmada mühendis, diğerinde yetkili olabiliyor (KK-11).
 * Bu yüzden yetki, satırın bir alanıdır; kullanıcının rolü her zaman
 * `ROLE_CODES.projectFirmUser`.
 */
export const AUTHORITY_TYPES = ['firmEngineer', 'firmAuthorizedPerson'] as const

export type AuthorityType = (typeof AUTHORITY_TYPES)[number]

export const AUTHORITY_TYPE_LABELS: Record<AuthorityType, string> = {
  firmEngineer: 'Firma Mühendisi',
  firmAuthorizedPerson: 'Firma Yetkilisi',
}

export function parseAuthorityType(raw: string | null): AuthorityType | null {
  return AUTHORITY_TYPES.find((type) => type === raw) ?? null
}

/** Satırdaki tıklanabilir firma bağı (KK-10). */
export interface FirmReference {
  id: number
  name: string
}

/**
 * Listenin BİR SATIRI = bir yetki kaydı, bir kullanıcı değil (KK-11).
 * Kullanıcı bilgileri her satırda yinelenir; toplam adet ve sayfalama satır
 * sayısı üzerinden hesaplanır.
 */
export interface ProjectFirmUserRow {
  /** Satır kimliği — React key ve sayfalama bunu kullanır (indeks değil). */
  competencyId: number
  /** Aynı kullanıcının satırları bu kimliği paylaşır; güncelleme ekranı buna gider. */
  userId: number
  username: string
  fullName: string
  email: string
  /** Kayıtta bulunan HAM metin; maske gösterimde kurulur (KK-9). */
  phone: string | null
  authorityType: AuthorityType
  gasFirm: FirmReference
  projectFirm: FirmReference
  gdfRegistrationNumber: string | null
}

/** Formdaki bir yetki satırı. */
export interface ProjectFirmUserCompetency {
  id: number
  gasFirm: FirmReference
  projectFirm: FirmReference
  authorityType: AuthorityType
  gdfRegistrationNumber: string | null
  isActive: boolean
}

/** Güncelleme ekranını dolduran kayıt (KK-25). */
export interface ProjectFirmUserDetail {
  id: number
  fullName: string
  username: string
  email: string
  phone: string | null
  isActive: boolean
  competencies: ProjectFirmUserCompetency[]
}

/**
 * Liste sorgusu. Sayfalama SUNUCU tarafında: mock da bu sözleşmeyi taklit
 * ediyor, böylece uç geldiğinde sayfa ve tablo koduna dokunulmayacak.
 */
export interface ProjectFirmUserQuery {
  /** Kullanıcı adı, ad soyad ve e-posta üzerinde içerik bazlı arama (KK-5). */
  nameQuery: string
  /** `null` = "Tümü" (KK-2). */
  authorityType: AuthorityType | null
  /** İşaretliyken kullanıcı AKTİF ve yetki satırı AKTİF olanlar (KK-4). */
  onlyActive: boolean
  /**
   * Üst bardaki KAPSAM, gaz dağıtım firması kimliklerine açılmış hâliyle;
   * `null` = sistem geneli (daraltma yok). Dizi (küme değil): sorgu react-query
   * anahtarının parçası ve `Set` kararlı biçimde serileşmiyor.
   */
  gasFirmIds: number[] | null
  page: number
  pageSize: number
}

/**
 * Oluşturma/güncelleme gövdesi.
 *
 * `password` güncellemede boş gelebilir: boşsa şifre DEĞİŞMEZ (KK-25). Bu ayrım
 * `null` ile taşınıyor, boş dizeyle değil — boş dize "şifreyi sil" gibi
 * okunabilirdi.
 *
 * KULLANICI düzeyinde `isActive` YOK: alan formdan kalktı.
 *
 * Yetki satırları da gövdede YOK: "Kullanıcı Yetkinlikleri" bölümü formdan
 * kaldırıldı ve sunucuda o satırları yazan bir uç zaten yok — gövdede boş bir
 * alan bırakmak, olmayan bir sözleşmeyi varmış gibi gösterirdi.
 */
export interface ProjectFirmUserPayload {
  fullName: string
  username: string
  email: string
  /** HAM rakamlar ("05551234567") ya da girilmediyse `null`. */
  phone: string | null
  password: string | null
}
