import type { NewProjectFormValues } from './newProjectSchema'
import { toIsoDate } from '../adminDateRange'

const DEFAULT_DURATION_MONTHS = 2
const DEFAULT_COUNT = 0
/** Servis kutusu çıkış basıncının saha varsayılanı (mbar). */
const DEFAULT_SERVICE_BOX_PRESSURE_MBAR = 21

/**
 * Ay eklerken gün taşmasını engeller: 31 Aralık + 2 ay JavaScript'te 3 Mart'a
 * kayar, beklenen 28/29 Şubat'tır. `lastMonthRange` ile aynı gerekçe.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  if (result.getDate() !== date.getDate()) result.setDate(0)
  return result
}

/**
 * `new Date('2026-08-04')` UTC gece yarısı sayılır; saat farkı negatif olan
 * yerelde tarih bir gün geriye kayar. Parçalar bu yüzden elle ayrıştırılıyor.
 */
function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return null

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Bitiş tarihi başlama tarihinden TÜRER (+2 ay). Form, başlama her değiştiğinde
 * bunu yeniden hesaplar: "önce başlama, sonra bitiş" sırası ancak böyle fiilen
 * zorlanıyor — başlama dolu geldiği için bitiş alanını pasif tutmak yetmiyordu.
 * Başlama boşsa bitiş de boş kalır.
 */
export function deriveEndDate(startDate: string): string {
  const start = parseIsoDate(startDate)
  return start === null ? '' : toIsoDate(addMonths(start, DEFAULT_DURATION_MONTHS))
}

/**
 * Isınma tipi ve bina kullanımı tipi bilerek BOŞ açılır: belge bunlara varsayılan
 * tanımlamıyor. Sessizce ilk seçeneğe düşselerdi kullanıcı hiç dokunmadan
 * "Merkezi" bir proje kaydedebilirdi. Proje tipinin varsayılanı ise belgede var
 * (ilk seçenek) ve liste sunucudan geldiği için burada değil, hook'ta atanıyor.
 */
export function buildDefaultValues(today: Date): NewProjectFormValues {
  const startDate = toIsoDate(today)

  return {
    name: '',
    projectFirmId: null,
    gasDistributionFirmId: null,
    startDate,
    endDate: deriveEndDate(startDate),
    engineerUserId: null,
    connectionObject: '',
    cityId: null,
    districtId: null,
    address: '',
    apartmentCount: DEFAULT_COUNT,
    workplaceCount: DEFAULT_COUNT,
    areaSquareMeters: DEFAULT_COUNT,
    parcelInfo: '',
    projectType: '',
    isPermitProject: false,
    heatingType: '',
    buildingUsageType: '',
    capacityCubicMeterPerHour: DEFAULT_COUNT,
    serviceBoxPressureMbar: DEFAULT_SERVICE_BOX_PRESSURE_MBAR,
    coverNote: '',
  }
}
