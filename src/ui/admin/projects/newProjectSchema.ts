import { z } from 'zod'

import type { CreateProjectPayload } from '../../../api/projects'

/**
 * DİKKAT: `createNewProjectSchema` tek başına TAM doğrulama DEĞİLDİR — alanlar
 * arası kural (bitiş ≥ başlama) şemada değil `validateNewProject` içindedir.
 * Sebebi: zod'un `refine`/`superRefine`'ı yalnız nesnenin tamamı geçerliyken
 * çalışıyor, yani boş formda proje adı hatası tarih hatasını gölgeliyor ve
 * kullanıcı eksikleri tur tur görüyordu.
 *
 * Bu yüzden ekran ve testler doğrulamayı HER ZAMAN `validateNewProject`
 * üzerinden yapar; şemayı doğrudan `parse` etmek tarih kuralını sessizce atlar.
 */

/**
 * Kapasite tavanı (m³/h). Bina ölçeğinde en büyük merkezi sistem bile bu değerin
 * çok altında kalır; sınır gerçek bir tesisatı engellemek için değil, basamak
 * hatasını (100000) kaydetmeden yakalamak için var.
 */
export const MAX_CAPACITY_CUBIC_METER_PER_HOUR = 10_000

const capacityLimitLabel = new Intl.NumberFormat('tr-TR').format(
  MAX_CAPACITY_CUBIC_METER_PER_HOUR,
)

/** Hata metinleri gereksinim belgesindeki karşılıklarıyla birebir aynı. */
export const NEW_PROJECT_ERRORS = {
  name: 'Proje adı zorunludur.',
  projectFirm: 'Proje firması zorunludur.',
  gasDistributionFirm: 'Gaz dağıtım firması zorunludur.',
  address: 'Adres zorunludur.',
  city: 'İl seçiniz.',
  district: 'İlçe seçiniz.',
  negative: 'Negatif değer girilemez.',
  integer: 'Tam sayı giriniz.',
  maxCapacity: `Kapasite en çok ${capacityLimitLabel} m³/h olabilir.`,
  projectType: 'Proje tipi zorunludur.',
  heatingType: 'Isınma tipi zorunludur.',
  buildingUsageType: 'Bina kullanımı tipi zorunludur.',
} as const

/**
 * Formun tuttuğu değerler. Seçim kutuları `null` ile "henüz seçilmedi" der;
 * boş dize kullanılsaydı kimlik alanlarında 0 ile karışırdı.
 */
export interface NewProjectFormValues {
  name: string
  projectFirmId: number | null
  gasDistributionFirmId: number | null
  connectionObject: string
  cityId: number | null
  districtId: number | null
  address: string
  apartmentCount: number
  workplaceCount: number
  areaSquareMeters: number
  parcelInfo: string
  /** Kod grubu kayıtlarının KİMLİĞİ (bkz. api/codes.ts) — kod metni değil. */
  projectTypeCodeId: number | null
  isPermitProject: boolean
  heatingTypeCodeId: number | null
  buildingUsageTypeCodeId: number | null
  capacityCubicMeterPerHour: number
  serviceBoxPressureMbar: number
  coverNote: string
}

export type NewProjectField = keyof NewProjectFormValues
export type NewProjectErrors = Partial<Record<NewProjectField, string>>

/** Girdi `id`'si alan adından türetilir: doğrulama sonrası odağın hatalı alana
    taşınması, `getElementById` ile bu tek kurala dayanıyor. */
export function newProjectFieldId(field: NewProjectField): string {
  return `new-project-${field}`
}

/**
 * Alanların ekrandaki sırası (kart 1 → 2 → 3). Doğrulama sonrası odak İLK hatalı
 * alana taşınacağı için "ilk" tanımının görsel sırayla aynı olması gerekiyor;
 * zod'un ürettiği sıra şema tanımına bağlı, ekrana değil.
 */
export const NEW_PROJECT_FIELD_ORDER: NewProjectField[] = [
  'name',
  'projectFirmId',
  'gasDistributionFirmId',
  'connectionObject',
  'cityId',
  'districtId',
  'address',
  'apartmentCount',
  'workplaceCount',
  'areaSquareMeters',
  'parcelInfo',
  'projectTypeCodeId',
  'isPermitProject',
  'heatingTypeCodeId',
  'buildingUsageTypeCodeId',
  'capacityCubicMeterPerHour',
  'serviceBoxPressureMbar',
  'coverNote',
]

function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== '', { message })
}

/** Sayısal alanların ortak kuralı: sonlu ve negatif olmayan. */
const nonNegativeNumber = z
  .number()
  .refine((value) => Number.isFinite(value) && value >= 0, {
    message: NEW_PROJECT_ERRORS.negative,
  })

/**
 * Formdaki sayısal alanların HEPSİ kesirsiz: uç karşılıklarının tümü int32
 * (`ProjectCreateDto`), ondalık gövde 400 döner. Kural ekranda da var (girdi
 * ondalık ayraç kabul etmiyor) ama sözleşme burada durur.
 */
const nonNegativeInteger = nonNegativeNumber.refine((value) => Number.isInteger(value), {
  message: NEW_PROJECT_ERRORS.integer,
})

const boundedCapacity = nonNegativeInteger.refine(
  (value) => value <= MAX_CAPACITY_CUBIC_METER_PER_HOUR,
  { message: NEW_PROJECT_ERRORS.maxCapacity },
)

/** Tip daraltan `refine`: doğrulama geçince alan artık `number`, `null` değil —
    böylece istek gövdesi kurulurken `as` ile zorlamaya gerek kalmıyor. */
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((value): value is number => value !== null && value > 0, { message })
}

export interface NewProjectSchemaOptions {
  /**
   * Firma alanları YALNIZCA admin'de görünür ve zorunludur; proje firması
   * kullanıcısında alan hiç render edilmediği için zorunlu tutulamaz.
   */
  isAdmin: boolean
}

export function createNewProjectSchema({ isAdmin }: NewProjectSchemaOptions) {
  // Firma zorunluluğu ALAN düzeyinde: `superRefine` yalnız nesnenin tamamı
  // geçerliyken çalışıyor, yani boş formda proje adı hatası firma hatasını
  // gölgeler ve kullanıcı eksikleri tur tur görürdü.
  const projectFirmId = isAdmin
    ? requiredId(NEW_PROJECT_ERRORS.projectFirm)
    : z.number().nullable()
  const gasDistributionFirmId = isAdmin
    ? requiredId(NEW_PROJECT_ERRORS.gasDistributionFirm)
    : z.number().nullable()

  return z
    .object({
      name: requiredText(NEW_PROJECT_ERRORS.name),
      projectFirmId,
      gasDistributionFirmId,
      connectionObject: z.string(),
      // İl ve ilçe ZORUNLU: uç ikisini de alıyor ve adres bunlar olmadan
      // eksik kalıyor. `requiredId` null'ı reddedip tipi daraltıyor.
      cityId: requiredId(NEW_PROJECT_ERRORS.city),
      districtId: requiredId(NEW_PROJECT_ERRORS.district),
      address: requiredText(NEW_PROJECT_ERRORS.address),
      apartmentCount: nonNegativeInteger,
      workplaceCount: nonNegativeInteger,
      areaSquareMeters: nonNegativeInteger,
      parcelInfo: z.string(),
      // Üç tip de kod grubundan geliyor: seçenekler sunucudan geldiği için
      // arayüz kod listesini tanımaz, yalnız "seçildi mi" diye bakar.
      projectTypeCodeId: requiredId(NEW_PROJECT_ERRORS.projectType),
      isPermitProject: z.boolean(),
      heatingTypeCodeId: requiredId(NEW_PROJECT_ERRORS.heatingType),
      buildingUsageTypeCodeId: requiredId(NEW_PROJECT_ERRORS.buildingUsageType),
      capacityCubicMeterPerHour: boundedCapacity,
      serviceBoxPressureMbar: nonNegativeInteger,
      coverNote: z.string(),
    })
}

/** Yapısal tip: zod sürümleri arasında değişen `ZodIssue` adına bağlanmamak için. */
interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

/** Alan başına TEK mesaj: bir alanın altında hata listesi değil, tek satır görünür. */
export function collectErrors(issues: readonly ValidationIssue[]): NewProjectErrors {
  const errors: NewProjectErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue

    const key = NEW_PROJECT_FIELD_ORDER.find((candidate) => candidate === field)
    if (key !== undefined) errors[key] ??= issue.message
  }

  return errors
}

/** Görsel sıraya göre ilk hatalı alan; odak buraya taşınır. */
export function firstErrorField(errors: NewProjectErrors): NewProjectField | null {
  return NEW_PROJECT_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

export interface NewProjectValidation {
  errors: NewProjectErrors
  /** Yalnız hiç hata yokken dolu; istek gövdesi bundan kurulur. */
  data: NewProjectParsedValues | null
}

/**
 * Formun TEK doğrulama girişi. Alan kuralları zod'da; alanlar arası bir kural
 * kalmadı (iş başlama/bitiş tarihleri uçta karşılığı olmadığı için kaldırıldı).
 */
export function validateNewProject(
  values: NewProjectFormValues,
  options: NewProjectSchemaOptions,
): NewProjectValidation {
  const result = createNewProjectSchema(options).safeParse(values)
  const errors: NewProjectErrors = result.success ? {} : collectErrors(result.error.issues)

  const hasError = Object.keys(errors).length > 0
  return { errors, data: hasError || !result.success ? null : result.data }
}

/** Boş metin alanı sunucuya boş dize değil `null` gider: "girilmedi" ile "boş
    bırakıldı" ayrımı veritabanında tek biçimde dursun. */
function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Şemadan GEÇMİŞ değerler: kod kimlikleri burada artık `number`, `null` değil.
    Gövde bu tipten kurulduğu için `as` gerekmiyor. */
export type NewProjectParsedValues = z.infer<ReturnType<typeof createNewProjectSchema>>

/**
 * Doğrulanmış değerleri istek gövdesine çevirir. Admin değilse firma kimlikleri
 * gövdeye HİÇ konmaz — sunucu token'dan türetir (knowledge/access-control.md).
 */
export function toCreateProjectPayload(
  values: NewProjectParsedValues,
  { isAdmin }: NewProjectSchemaOptions,
): CreateProjectPayload {
  const payload: CreateProjectPayload = {
    name: values.name.trim(),
    connectionObject: optionalText(values.connectionObject),
    cityId: values.cityId,
    districtId: values.districtId,
    address: values.address.trim(),
    apartmentCount: values.apartmentCount,
    workplaceCount: values.workplaceCount,
    areaSquareMeters: values.areaSquareMeters,
    parcelInfo: optionalText(values.parcelInfo),
    projectTypeCodeId: values.projectTypeCodeId,
    isPermitProject: values.isPermitProject,
    heatingTypeCodeId: values.heatingTypeCodeId,
    buildingUsageTypeCodeId: values.buildingUsageTypeCodeId,
    capacityCubicMeterPerHour: values.capacityCubicMeterPerHour,
    serviceBoxPressureMbar: values.serviceBoxPressureMbar,
    coverNote: optionalText(values.coverNote),
  }

  if (!isAdmin) return payload

  return {
    ...payload,
    projectFirmId: values.projectFirmId ?? undefined,
    gasDistributionFirmId: values.gasDistributionFirmId ?? undefined,
  }
}
