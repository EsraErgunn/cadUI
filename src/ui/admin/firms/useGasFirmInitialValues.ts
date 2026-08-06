import { useQuery } from '@tanstack/react-query'

import type { GasFirmFormValues } from './gasFirmSchema'
import { buildEmptyGasFirmValues, toGasFirmValues } from './gasFirmValues'
import { getGasDistributionFirm, getNextDfirmNo } from '../../../api/adminFirmForm'

export interface GasFirmInitialValues {
  /** Veri gelene kadar `null`; form bu değer dolmadan MOUNT EDİLMEZ. */
  values: GasFirmFormValues | null
  isPending: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Formun açılış değerleri. Ekleme modunda sıradaki numara, güncelleme modunda
 * seçilen firmanın verisi.
 *
 * Değerler forma prop olarak veriliyor ve form onları `useState` başlatıcısında
 * bir kez alıyor; sonradan efektle içeri yazılsaydı geç gelen yanıt kullanıcının
 * o sırada yazdığının üstüne biner, "bir kez uygula" bayrağı gerekirdi.
 */
export function useGasFirmInitialValues(firmId: number | null): GasFirmInitialValues {
  const isUpdateMode = firmId !== null

  const detailQuery = useQuery({
    queryKey: ['gasDistributionFirm', firmId],
    queryFn: ({ signal }) => getGasDistributionFirm(firmId ?? 0, signal),
    enabled: isUpdateMode,
  })

  // Sıradaki numara SUNUCUDAN gelir; istemci listeden türetemez, sayfalama
  // sunucu taraflı ve tek sayfada 30 kayıt var.
  const nextNoQuery = useQuery({
    queryKey: ['gasFirmNextNo'],
    queryFn: ({ signal }) => getNextDfirmNo(signal),
    enabled: !isUpdateMode,
  })

  // Pasif sorgu react-query'de sonsuza dek "pending" kalır; bu yüzden yalnız
  // moda ait sorgunun durumuna bakılıyor.
  const activeQuery = isUpdateMode ? detailQuery : nextNoQuery

  return {
    values: buildValues(firmId, detailQuery.data, nextNoQuery.data),
    isPending: activeQuery.isPending,
    isError: activeQuery.isError,
    refetch: () => void activeQuery.refetch(),
  }
}

function buildValues(
  firmId: number | null,
  detail: Parameters<typeof toGasFirmValues>[0] | undefined,
  nextDfirmNo: number | undefined,
): GasFirmFormValues | null {
  if (firmId !== null) return detail === undefined ? null : toGasFirmValues(detail)
  if (nextDfirmNo === undefined) return null

  return { ...buildEmptyGasFirmValues(), dfirmNo: String(nextDfirmNo) }
}
