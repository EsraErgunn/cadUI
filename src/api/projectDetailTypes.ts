import type { PolicyEditTarget } from './policies'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from './projects'

/**
 * Proje detayı ekranının veri şekilleri. Uç gövdelerinden (`projectDetail.ts`)
 * ayrıldı: ikisi birlikte 200 satırı aşıyordu ve tipler bileşenlerin tek tek
 * import ettiği asıl yüzey. Çağıranlar tipleri yine `projectDetail.ts`
 * üzerinden alır — modülün tek public yüzü orası.
 */

/**
 * Detay ekranının durum sözlüğü. Dört durum liste ekranıyla ORTAK ve
 * `PROJECT_STATUSES`'tan türetiliyor — etiketi ve rengi tek yerde kalsın diye
 * ikinci bir liste yazılmadı (K50). Kaynağı sunucudaki `ProjeDurumu` kod grubu:
 * Draft / PendingApproval / Approved / Rejected (cadapi seed 6001–6004).
 *
 * `revizyonIstendi` o grubun İÇİNDE DEĞİL — sunucuda karşılığı olmadığı
 * doğrulandı. Gereksinim (KK-11) revizyonu bir durum olarak istediği için
 * arayüzde tanımlı ama GEÇİCİ.
 * TODO(esra): backend `ProjeDurumu` grubuna revizyon kodu ekleyince bu sabit
 * sunucunun `CodeValue`'suyla eşitlenecek; bugünkü değer istemci uydurmasıdır.
 */
export const REVISION_REQUESTED_STATUS = 'revizyonIstendi'

export const PROJECT_DETAIL_STATUSES = [
  ...PROJECT_STATUSES,
  REVISION_REQUESTED_STATUS,
] as const

export type ProjectDetailStatus = (typeof PROJECT_DETAIL_STATUSES)[number]

export const PROJECT_DETAIL_STATUS_LABELS: Record<ProjectDetailStatus, string> = {
  ...PROJECT_STATUS_LABELS,
  [REVISION_REQUESTED_STATUS]: 'Revizyon İstendi',
}

/** Taslak proje işleme alınmaz: firma göndermeden onay/ret çalışmaz (KK-2). */
export const DRAFT_STATUS: ProjectDetailStatus = 'taslak'

/**
 * `GET /api/projects/{id}` gövdesinden ekrana taşınan alanlar.
 *
 * Şema bir süre yalnız DOKUZ alan okuyordu; uç otuz alan döndürüyor ve geri
 * kalanı uydurma "extras" içinden geliyordu. Artık ucun taşıdığı her şey
 * buradan okunuyor.
 */
export interface ProjectServerFields {
  id: number
  /** Serbest biçimli proje numarası; sayı olarak yorumlanmaz. */
  pId: string
  name: string
  description: string | null
  /** Uçta KARŞILIĞI YOK; kimlikten türetilen mock değer (bkz. `mockStatusOf`). */
  /**
   * `null` = sunucu durum GÖNDERMEDİ ya da tanınmayan bir kod gönderdi.
   * Bilinmeyeni "taslak" saymak, projeyi olmadığı bir durumda gösterip onay
   * düğmelerini yanlış satıra koyardı (`toProjectStatus` ile aynı gerekçe).
   */
  status: ProjectDetailStatus | null
  cityName: string | null
  districtName: string | null
  addressLine: string | null
  blockLotParcel: string | null
  /**
   * Firma künyesine giden YOL (K159). Canlı uç `projectFirmId` DÖNDÜRMÜYOR;
   * proje firmasının kimliği bu yetki kaydından okunuyor.
   */
  projectFirmAuthorizationId: number | null
  gasDistributionFirmId: number | null
  /** Gaz dağıtım firmasının ünvanı; uç yetki kaydından türetip gövdede veriyor. */
  gasDistributionFirmName: string | null
  /** Bina kat adedi ve bodrum adedi (`Building`); ikisi de gövdeden geliyor. */
  floorCount: number | null
  basementCount: number | null
  projectTypeName: string | null
  heatingTypeName: string | null
  /** Mesken adedi. */
  apartmentCount: number | null
  /** Dükkân adedi. */
  workplaceCount: number | null
  areaSquareMeters: number | null
  buildingCode: string | null
  projectFirmId: number | null
  projectType: string | null
  heatingType: string | null
  buildingUsageType: string | null
  /** Yapı ruhsatına bağlı proje mi. */
  isPermitProject: boolean
  capacityCubicMeterPerHour: number | null
  serviceBoxPressureMbar: number | null
  createdAt: string
  updatedAt: string
}

export interface ProjectGeneralExtras {
  /**
   * `null` = sunucu durum GÖNDERMEDİ ya da tanınmayan bir kod gönderdi.
   * Bilinmeyeni "taslak" saymak, projeyi olmadığı bir durumda gösterip onay
   * düğmelerini yanlış satıra koyardı (`toProjectStatus` ile aynı gerekçe).
   */
  status: ProjectDetailStatus | null
  gasFirmName: string
  projectType: string
  heatingType: string
  hasLicense: boolean | null
}

export interface ProjectFirmInfo {
  title: string | null
  address: string | null
  phone: string | null
  taxNumber: string | null
}

export interface ProjectApprovalInfo {
  approvedAt: string | null
  approverName: string | null
  note: string | null
}

export interface ProjectSpecs {
  floorCount: number | null
  residenceCount: number | null
  shopCount: number | null
  boxPressureMbar: number | null
  totalAreaSquareMeters: number | null
  totalCapacity: number | null
  renovationNote: string | null
  connectionObject: string | null
}

export interface ProjectDetailExtras {
  general: ProjectGeneralExtras
  firm: ProjectFirmInfo
  approval: ProjectApprovalInfo
  specs: ProjectSpecs
}

/**
 * Ekranın veri paketi. İki parça BİLEREK ayrı duruyor: `server` alanları gerçek
 * uçtan geliyor, `extras` uydurma. Tek düz nesnede birleştirilseydi arayüz
 * hangi değerin gerçek olduğunu ayırt edemez ve mock işaretini koyamazdı.
 */
export interface ProjectDetail {
  server: ProjectServerFields
  /** Geliştirmede mock, üretim derlemesinde `null` (K50). */
  extras: ProjectDetailExtras | null
}

export interface ProjectDeviceRow {
  id: number
  name: string | null
  /**
   * SERBEST METİN, sayı değil. Çizimden senkronlanan değerler karışık birimli
   * geliyor ("12000 kcal/h", "24 kW", "14 L/dk", "—"); tek bir birime
   * çevrilemez, o yüzden olduğu gibi gösteriliyor.
   */
  capacity: string | null
  flowCubicMeterPerHour: number | null
  brand: string | null
  model: string | null
  /** Baca etiketi: "AÇIK", "HERMETİK". */
  flueType: string | null
}

export interface ProjectUnitRow {
  id: number
  unitNumber: string | null
  subscriberName: string | null
  subscriberNo: string | null
  /** Sayaç SINIFI ("G4"), seri numarası değil — uçtaki adı `meterClassLabel`. */
  meterLabel: string | null
  flowCubicMeterPerHour: number | null
  pressureMbar: number | null
  areaSquareMeters: number | null
  pipeType: string | null
  devices: ProjectDeviceRow[]
}

export const HISTORY_FILE_TYPES = ['pdf', 'zpd'] as const
export type HistoryFileType = (typeof HISTORY_FILE_TYPES)[number]

export const HISTORY_OPERATIONS = [
  'projeKayit',
  'projeGuncelleme',
  'projeOnay',
  'projeRet',
  'revizyonTalebi',
] as const
export type HistoryOperation = (typeof HISTORY_OPERATIONS)[number]

export const HISTORY_OPERATION_LABELS: Record<HistoryOperation, string> = {
  projeKayit: 'Proje Kayıt',
  projeGuncelleme: 'Proje Güncelleme',
  projeOnay: 'Proje Onay',
  projeRet: 'Proje Ret',
  revizyonTalebi: 'Revizyon Talebi',
}

/**
 * İşlem kodu sunucuda PARAMETRİK (`OperationHistory.OperationCode`): arayüz
 * bilmediği bir kodla karşılaşabilir. Dar birleşimle kilitlenseydi yeni bir kod
 * rozeti patlatırdı; bilinmeyen kodda etiket `operationName`'e düşer.
 */
export type HistoryOperationCode = HistoryOperation | (string & {})

export interface ProjectHistoryRow {
  /** Uç satır kimliği DÖNDÜRMÜYOR; damga + kod + sıradan kurulan tablo anahtarı. */
  id: string
  fileType: HistoryFileType | null
  createdAt: string
  userName: string
  /** `OperationHistory.RoleSnapshot` — işlemi yapan kaynak ("Zetacad USER"). */
  roleSnapshot: string
  operation: HistoryOperationCode
  /** Sunucunun okunabilir işlem adı; bilinmeyen kodda rozet metni bu olur. */
  operationName: string | null
  description: string | null
}

export interface ProjectDocumentRow {
  id: number
  fileName: string
  docType: string | null
  sizeBytes: number | null
  uploadedByName: string | null
  receivedAt: string | null
  /**
   * Evrağın bağlı olduğu birimler. Proje detayındaki sekme bağı
   * DEĞİŞTİREBİLİYOR; eski bağı koparmak için kimlik, hücreyi yazmak için ad
   * gerekiyor.
   */
  unitIds: number[]
  unitNames: string[]
}

/**
 * Bir projeye bağlı açılan ekranların (Evrak Ekle, Poliçe Oluşturma) başlıkta
 * gösterdiği künye. Detayın tamamı değil, sunucunun GERÇEKTEN döndürdüğü üç alan.
 */
export interface ProjectSummary {
  id: number
  name: string
  /** Serbest biçimli proje numarası; kod boşsa kimliğe düşer (projects.ts kuralı). */
  pId: string
}

export interface ProjectPolicyRow extends PolicyEditTarget {
  /**
   * Poliçenin bağlı olduğu birimin KİMLİĞİ. Ad değil kimlik gerekiyor: poliçe
   * sihirbazı "bu birimde zaten poliçe var mı" sorusunu bununla yanıtlıyor ve
   * birim numarası boş olabiliyor (çizimden senkron).
   *
   * Birimi silinmiş poliçede `null` — sunucu bağı koparıyor (`IsUnitDeleted`).
   */
  projectUnitId: number | null
  /**
   * Birim çizimden silindi mi. Poliçe İPTAL EDİLMİYOR, listede kalıyor; satır
   * uyarıyla işaretleniyor (`PolicyDto.IsUnitDeleted`).
   */
  isUnitDeleted: boolean
}

