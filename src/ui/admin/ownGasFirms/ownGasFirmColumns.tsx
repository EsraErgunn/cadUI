import type { OwnGasFirmRow } from './useOwnGasFirms'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'

export const OWN_GAS_FIRM_TABLE_CAPTION =
  'Kullanıcının bağlı olduğu gaz dağıtım firmaları listesi.'

/**
 * Satırda tıklanabilir hücre YOK: bu iki rol gaz dağıtım firmasını
 * düzenleyemiyor (`PUT /api/gasdistributionfirms/{id}` yönetime açık), bağlantı
 * kurmak tıklayınca "yetkiniz yok" ekranına giden bir yol açmak olurdu.
 */
export const OWN_GAS_FIRM_COLUMNS: DataTableColumn<OwnGasFirmRow>[] = [
  {
    key: 'name',
    label: 'Firma',
    cell: (firm) => firm.name,
  },
  {
    key: 'groupName',
    label: 'Grup Adı',
    cellClassName: 'text-ink-muted',
    // Yetki satırından gelen firmada grup bilgisi YOK; uydurulmuyor, boş
    // değer işaretiyle çiziliyor.
    cell: (firm) => (firm.groupName === null ? <EmptyValue /> : firm.groupName),
  },
]
