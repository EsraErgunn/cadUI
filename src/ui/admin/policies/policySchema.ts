import { z } from 'zod'

import type { CreatePolicyPayload, PolicyMethod } from '../../../api/policies'
import { toIsoDate } from '../adminDateRange'

/**
 * Sihirbazın adımları ve doğrulaması. Adım ETİKETLERİ burada değil
 * `PolicyStepper.tsx`'te: bileşen dosyası bileşen dışında bir şey dışa
 * aktaramıyor (react-refresh kuralı), o yüzden makinenin okuduğu anahtarlar
 * burada, kullanıcının okuduğu etiketler orada duruyor.
 */
export const POLICY_STEPS = ['method', 'firm', 'info', 'summary', 'done'] as const
export type PolicyStep = (typeof POLICY_STEPS)[number]

export interface PolicyFormValues {
  method: PolicyMethod
  /**
   * Poliçenin bağlandığı BİRİM. Sunucuda poliçe proje seviyesinde durmuyor,
   * her kayıt bir `ProjectUnit`e ait (`PolicyAddDto.ProjectUnitId` zorunlu) —
   * seçim boş bırakılırsa kaydın gideceği yer yok.
   */
  projectUnitId: number | null
  /**
   * Poliçenin firması. Sunucuda TEK alan var (`InsuranceCompanyId`); ayrı bir
   * acente alanı yok, o yüzden formda da tek kutu.
   */
  insuranceCompanyId: number | null
  policyNumber: string
  /**
   * HAM metin. Kullanıcı yazarken biçimlendirilmiyor: canlı binlik ayraç imleci
   * kaydırıyor. Ayraç odaktan çıkınca uygulanır (`formatPolicyAmount`), sayıya
   * çevirme `parsePolicyAmount`'ta.
   */
  amountText: string
  /** yyyy-aa-gg — native `input[type=date]`'in beklediği biçim. */
  startDate: string
  endDate: string
}

export type PolicyField = keyof PolicyFormValues
export type PolicyErrors = Partial<Record<PolicyField, string>>

export const POLICY_ERRORS = {
  insuranceCompany: 'Sigorta şirketi / poliçe firması seçiniz.',
  unit: 'Poliçenin bağlanacağı birimi seçiniz.',
  policyNumber: 'Poliçe no zorunludur.',
  policyNumberTooLong: 'Poliçe no en fazla 50 karakter olabilir.',
  amount: 'Teminat tutarı zorunludur.',
  amountPositive: 'Teminat tutarı sıfırdan büyük olmalıdır.',
  startDate: 'Başlangıç tarihi zorunludur.',
  endDate: 'Bitiş tarihi zorunludur.',
  endBeforeStart: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
} as const

/** Görsel sıra; doğrulama sonrası odak İLK hatalı alana taşınır. */
const POLICY_FIELD_ORDER: PolicyField[] = [
  'insuranceCompanyId',
  'projectUnitId',
  'policyNumber',
  'amountText',
  'startDate',
  'endDate',
]

/** Girdi `id`'si alan adından türetilir; odak taşıma bu tek kurala dayanıyor. */
export function policyFieldId(field: PolicyField): string {
  return `policy-${field}`
}

export function firstPolicyErrorField(errors: PolicyErrors): PolicyField | null {
  return POLICY_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

/** Sunucudaki `PolicyAddValidator` sınırı: `MaximumLength(50)`. */
const MAX_POLICY_NUMBER_LENGTH = 50

/** Basamak hatasını (bir sıfır fazla) kaydetmeden yakalayan sınır; üst sınır
    tutar olarak konmadı, yalnız hane sayısı sınırlı. */
const MAX_AMOUNT_DIGITS = 15

const AMOUNT_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Girdiye yazılabilecek hâli süzer. `null` = tuş vuruşu REDDEDİLİR (değer eski
 * hâlinde kalır): harf, ikinci virgül ya da 15 haneyi aşan sayı.
 */
export function sanitizePolicyAmount(raw: string): string | null {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  if (cleaned !== raw) return null

  if ((cleaned.match(/,/g) ?? []).length > 1) return null
  if ((cleaned.match(/\d/g) ?? []).length > MAX_AMOUNT_DIGITS) return null

  return cleaned
}

/** Metin → sayı. Nokta binlik ayracı, virgül ondalık (tr-TR). */
export function parsePolicyAmount(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const parsed = Number(trimmed.replaceAll('.', '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

/** Odaktan çıkışta binlik ayraç + iki ondalık; çözülemeyen metne dokunulmaz. */
export function formatPolicyAmount(text: string): string {
  const parsed = parsePolicyAmount(text)
  return parsed === null ? text : AMOUNT_FORMATTER.format(parsed)
}

export function buildPolicyDefaults(today: Date): PolicyFormValues {
  return {
    // Tek yöntem var ve seçili GELİYOR (gereksinim 15).
    method: 'manual',
    insuranceCompanyId: null,
    projectUnitId: null,
    policyNumber: '',
    amountText: '',
    // Başlangıç bugünle dolu gelir (gereksinim 17); bitiş türetilmez, poliçe
    // süresi için belgede bir varsayılan yok.
    startDate: toIsoDate(today),
    endDate: '',
  }
}

function validateFirmStep(values: PolicyFormValues): PolicyErrors {
  const errors: PolicyErrors = {}

  if (values.insuranceCompanyId === null) errors.insuranceCompanyId = POLICY_ERRORS.insuranceCompany

  return errors
}

function validateInfoStep(values: PolicyFormValues): PolicyErrors {
  const errors: PolicyErrors = {}

  if (values.projectUnitId === null) errors.projectUnitId = POLICY_ERRORS.unit

  // BENZERSİZLİK DENETİMİ YOK: sunucuda poliçe numarası için ne benzersiz
  // indeks ne de kontrol var (doğrulandı, cadapi @ a6ea695). Bir süre istemcide
  // bellekteki mock depoya karşı denetleniyordu ve bu, olmayan bir kısıtı
  // varmış gibi öğretiyordu. Sunucunun gerçek kuralı başka: bir birimde tek
  // aktif poliçe — onu da sunucu 400 ile söylüyor.
  //
  // Uzunluk sınırı ise GERÇEK: `PolicyAddDto` doğrulayıcısı 50 karakterde
  // kesiyor, burada erken söyleniyor.
  if (values.policyNumber.trim() === '') {
    errors.policyNumber = POLICY_ERRORS.policyNumber
  } else if (values.policyNumber.trim().length > MAX_POLICY_NUMBER_LENGTH) {
    errors.policyNumber = POLICY_ERRORS.policyNumberTooLong
  }

  const amount = parsePolicyAmount(values.amountText)
  if (amount === null) errors.amountText = POLICY_ERRORS.amount
  else if (amount <= 0) errors.amountText = POLICY_ERRORS.amountPositive

  if (values.startDate === '') errors.startDate = POLICY_ERRORS.startDate

  if (values.endDate === '') errors.endDate = POLICY_ERRORS.endDate
  else if (values.startDate !== '' && values.endDate < values.startDate) {
    errors.endDate = POLICY_ERRORS.endBeforeStart
  }

  return errors
}

/**
 * Adımın kendi kuralları. Sihirbazda doğrulama ADIM BAZLI: kullanıcı henüz
 * görmediği alanların hatasını görmemeli, "İleri" yalnız bulunduğu adımı
 * denetler (gereksinim 20).
 */
export function validatePolicyStep(step: PolicyStep, values: PolicyFormValues): PolicyErrors {
  if (step === 'firm') return validateFirmStep(values)
  if (step === 'info') return validateInfoStep(values)
  // Yöntem adımında tek seçenek seçili geliyor, özet ve sonuç adımlarında girdi yok.
  return {}
}

/** Kayıttan hemen önce iki veri adımı birden: özetten "Bitir"e basılıyor ve
    araya dönülüp bozulmuş bir alan olabilir. */
export function validatePolicyForm(values: PolicyFormValues): PolicyErrors {
  return { ...validateFirmStep(values), ...validateInfoStep(values) }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * İstek gövdesinin SINIR denetimi. Adım doğrulaması kullanıcıya mesaj yazmak
 * için, bu şema gövdenin şeklini garanti etmek için: `null` kimlikler burada
 * artık sayı ve çağıran `as` yazmak zorunda kalmıyor.
 *
 * Alanlar `PolicyAddDto` ile BİREBİR. `projectId` YOK (sunucu projeyi birimden
 * türetiyor), `method` ve `agencyId` de yok — ikisinin de sunucuda karşılığı
 * bulunmuyor. Gövdeye giren her alanın uçta bir yeri var.
 */
const policyPayloadSchema = z.object({
  insuranceCompanyId: z.number().int().positive(),
  projectUnitId: z.number().int().positive(),
  policyNumber: z.string().min(1).max(MAX_POLICY_NUMBER_LENGTH),
  amount: z.number().positive(),
  startDate: z.string().regex(ISO_DATE),
  endDate: z.string().regex(ISO_DATE),
})

export function buildPolicyPayload(values: PolicyFormValues): CreatePolicyPayload | null {
  const parsed = policyPayloadSchema.safeParse({
    insuranceCompanyId: values.insuranceCompanyId,
    projectUnitId: values.projectUnitId,
    policyNumber: values.policyNumber.trim(),
    amount: parsePolicyAmount(values.amountText),
    startDate: values.startDate,
    endDate: values.endDate,
  })

  return parsed.success ? parsed.data : null
}
