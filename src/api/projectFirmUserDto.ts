import { z } from 'zod'

/**
 * Proje firması kullanıcılarının ARAYÜZ tipleri ve `GET /api/users` şeması.
 *
 * **Ayrı bir "proje firması kullanıcısı" ucu YOK.** Ekran genel kullanıcı
 * uçlarını proje firması bağlamıyla kullanıyor: liste `RoleCode` süzgeciyle,
 * oluşturma `POST /api/auth/register` ile, güncelleme `PUT /api/users/{id}` ile.
 *
 * **"Kullanıcı Tipi" ve "Gdf Kayıt No" KALKTI.** Sunucudaki `User` kullanıcı
 * başına TEK `ProjectFirmId` tutuyor; "aynı kullanıcı bir firmada mühendis,
 * diğerinde yetkili" (eski KK-11) şemada ifade edilemiyor ve o iki alanın
 * karşılığı hiç yok. Liste artık KULLANICI başına tek satır.
 */

/** Satırdaki tıklanabilir firma bağı (KK-10). */
export interface FirmReference {
  id: number
  name: string
}

/** Listenin bir satırı = bir KULLANICI. */
export interface ProjectFirmUserRow {
  id: number
  username: string
  fullName: string
  email: string
  /** Kayıtta bulunan HAM metin; maske gösterimde kurulur (KK-9). */
  phone: string | null
  /** Kullanıcının bağlı olduğu proje firması; sunucuda opsiyonel. */
  projectFirm: FirmReference | null
}

/** Güncelleme ekranını dolduran kayıt (KK-25). */
export interface ProjectFirmUserDetail {
  id: number
  fullName: string
  username: string
  email: string
  phone: string | null
  projectFirmId: number | null
}

/**
 * Liste sorgusu. Sayfalama ve sıralama SUNUCUDA.
 *
 * ARAMA YOK: `UserListQueryDto` bir arama parametresi almıyor ve sayfalı bir
 * listede istemci tarafı arama yalnız GÖRÜNEN sayfayı süzeceği için yanlış
 * sonuç verirdi (`totalCount` süzülmemiş kalır). Kutu bu yüzden ekrandan
 * kaldırıldı.
 */
export interface ProjectFirmUserQuery {
  /**
   * Üst bardaki kapsam GRUP firmasıysa onun kimliği. Uç bunu proje firmasının
   * YETKİLERİ üzerinden çözüyor, yani bu ekranda doğru çalışıyor.
   *
   * Kapsam TEK bir gaz dağıtım firmasıysa gönderilecek bir parametre YOK:
   * `GasDistributionFirmId` yalnız `User.GasDistributionFirmId`'ye bakıyor ve
   * proje firması kullanıcısında o alan boş — göndermek listeyi boşaltırdı.
   * O durumda liste daraltılmadan gösteriliyor.
   */
  gasFirmGroupId: number | null
  page: number
  pageSize: number
}

/**
 * Oluşturma/güncelleme gövdesi.
 *
 * `password` güncellemede `null` gelir: `PUT /api/users/{id}` şifre alanı
 * TAŞIMIYOR, şifre değiştirme ayrı uçta (`POST /api/users/{id}/reset-password`).
 */
export interface ProjectFirmUserPayload {
  fullName: string
  username: string
  email: string
  /** HAM rakamlar ("05551234567") ya da girilmediyse `null`. */
  phone: string | null
  password: string | null
  /** Kullanıcının bağlanacağı proje firması. */
  projectFirmId: number | null
}

/** `GET /api/users` satırı. Alanlar sunucuda boş dize dönebiliyor. */
export const userListItemSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string(),
  email: z.string(),
  username: z.string(),
  phone: z.string().nullish(),
  roleCode: z.string(),
  projectFirmId: z.number().int().nullish(),
  projectFirmName: z.string().nullish(),
})

export type UserListItemDto = z.infer<typeof userListItemSchema>

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

export function toProjectFirmUserRow(dto: UserListItemDto): ProjectFirmUserRow {
  const firmName = toNullable(dto.projectFirmName)

  return {
    id: dto.id,
    username: dto.username,
    fullName: dto.fullName,
    email: dto.email,
    phone: toNullable(dto.phone),
    // Kimlik gelmiyorsa bağ kurulmaz ama ad yine gösterilir; adı atmak
    // sunucunun GERÇEKTEN döndürdüğü veriyi saklamak olurdu.
    projectFirm:
      firmName === null ? null : { id: dto.projectFirmId ?? 0, name: firmName },
  }
}
