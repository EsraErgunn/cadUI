import {
  optionalText,
  type GasFirmFormValues,
  type GasFirmParsedValues,
} from './gasFirmSchema'
import type {
  GasDistributionFirmDetail,
  GasDistributionFirmPayload,
} from '../../../api/adminFirmForm'
import { toPhoneDigits } from '../../../core/phone'

export function buildEmptyGasFirmValues(): GasFirmFormValues {
  return {
    dfirmNo: '',
    name: '',
    groupId: '',
    description: '',
    contactPerson: '',
    address: '',
    phoneDigits: '',
  }
}

/** Güncelleme ekranı aynı formu seçilen firmanın verisiyle doldurur (KK-11). */
export function toGasFirmValues(detail: GasDistributionFirmDetail): GasFirmFormValues {
  return {
    dfirmNo: String(detail.dfirmNo),
    name: detail.name,
    // Seçim kutusu değerleri dize; grubu olmayan kayıtta boş kalır.
    groupId: detail.groupId === null ? '' : String(detail.groupId),
    description: detail.description ?? '',
    contactPerson: detail.contactPerson ?? '',
    address: detail.address ?? '',
    // Sunucu telefonu null bırakabiliyor; ayrıca ham rakam beklense de süzülüyor
    // ki eski bir kayıtta maskeli metin dursa alan bozuk açılmasın.
    phoneDigits: toPhoneDigits(detail.phone ?? ''),
  }
}

/** Alana yazılabilecekleri kısıtlar: harf ve işaret girdiye HİÇ girmez. */
export function normalizeGasFirmValue(field: keyof GasFirmFormValues, value: string): string {
  if (field === 'phoneDigits') return toPhoneDigits(value)
  if (field === 'dfirmNo') return value.replace(/\D/g, '')
  return value
}

export function toGasFirmPayload(values: GasFirmParsedValues): GasDistributionFirmPayload {
  return {
    dfirmNo: Number(values.dfirmNo.trim()),
    name: values.name.trim(),
    // Seçilmediğinde `null` gider; sunucu grubu kimlikle alıyor.
    groupId: values.groupId === '' ? null : Number(values.groupId),
    description: optionalText(values.description),
    contactPerson: optionalText(values.contactPerson),
    address: optionalText(values.address),
    // Ham rakam: maske yalnız görüntüde (core/phone.ts).
    phone: values.phoneDigits,
  }
}
