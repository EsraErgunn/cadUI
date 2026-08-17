import type { NewProjectFormValues } from './newProjectSchema'

const DEFAULT_COUNT = 0
/** Servis kutusu çıkış basıncının saha varsayılanı (mbar). */
const DEFAULT_SERVICE_BOX_PRESSURE_MBAR = 21

/**
 * Isınma tipi ve bina kullanımı tipi bilerek BOŞ (`null`) açılır: belge bunlara
 * varsayılan tanımlamıyor. Sessizce ilk seçeneğe düşselerdi kullanıcı hiç
 * dokunmadan "Merkezi" bir proje kaydedebilirdi. Proje tipinin varsayılanı ise
 * belgede var (ilk seçenek) ve liste sunucudan geldiği için burada değil,
 * hook'ta atanıyor.
 */
export function buildDefaultValues(): NewProjectFormValues {
  return {
    name: '',
    projectFirmId: null,
    gasDistributionFirmId: null,
    connectionObject: '',
    cityId: null,
    districtId: null,
    address: '',
    apartmentCount: DEFAULT_COUNT,
    workplaceCount: DEFAULT_COUNT,
    areaSquareMeters: DEFAULT_COUNT,
    parcelInfo: '',
    projectTypeCodeId: null,
    isPermitProject: false,
    heatingTypeCodeId: null,
    buildingUsageTypeCodeId: null,
    capacityCubicMeterPerHour: DEFAULT_COUNT,
    serviceBoxPressureMbar: DEFAULT_SERVICE_BOX_PRESSURE_MBAR,
    coverNote: '',
  }
}
