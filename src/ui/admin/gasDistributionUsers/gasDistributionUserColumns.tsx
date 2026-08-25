import type { GasDistributionUserRow } from '../../../api/gasDistributionUsers'
import { formatPhone, toNormalizedPhoneDigits } from '../../../core/phone'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'

export const GAS_DISTRIBUTION_USER_TABLE_CAPTION =
  'Gaz dağıtım firması kullanıcıları listesi.'

/** Altı sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kayar. */
export const GAS_DISTRIBUTION_USER_TABLE_MIN_WIDTH = 'min-w-240'

/**
 * Hücre çiziciler bilerek BİLEŞEN değil, düz fonksiyon: dosya sütun dizisini de
 * dışa aktardığı için bileşen tanımı fast refresh'i bozuyor
 * (react-refresh/only-export-components). Proje firması kullanıcıları
 * ekranındaki desenin aynısı.
 */
function renderText(value: string | null | undefined) {
  return value === null || value === undefined || value === '' ? <EmptyValue /> : value
}

/**
 * Telefon "0xxx xxx xx xx" biçimine indirgenir; hiçbir kalıba uymayan kayıt
 * (dahili hat, bozuk veri) HAM hâliyle kalır — uydurma bir biçim dayatmak
 * kullanıcıya yanlış numara göstermek olurdu.
 */
function renderPhone(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') return <EmptyValue />

  const digits = toNormalizedPhoneDigits(value)
  return <span>{digits === null ? value : formatPhone(digits)}</span>
}

/**
 * Sütunlar istenen sıradan birebir. Sıralanabilir başlık YOK: uç henüz yok,
 * `SortBy`/`SortDir` sözleşmesi yazılmadan başlığa tıklamak boşa istek olurdu.
 *
 * "GDF Kayıt No" sütunu KALDIRILDI: sunucunun kullanıcı gövdesinde karşılığı
 * yoktu ve her satırda boş hücre işareti çiziyordu. Alan (`gdfRegistrationNumber`)
 * şemada opsiyonel olarak duruyor — uç bir gün doldurursa sütun geri gelebilir.
 */
export const GAS_DISTRIBUTION_USER_COLUMNS: DataTableColumn<GasDistributionUserRow>[] = [
  {
    key: 'username',
    label: 'Kullanıcı Adı',
    cell: (row) => row.username,
  },
  {
    key: 'fullName',
    label: 'Adı Soyadı',
    cell: (row) => row.fullName,
  },
  {
    key: 'email',
    label: 'E-mail',
    cellClassName: 'text-ink-muted',
    cell: (row) => renderText(row.email),
  },
  {
    key: 'phone',
    label: 'Telefon',
    cellClassName: 'tabular-nums text-ink-muted',
    cell: (row) => renderPhone(row.phone),
  },
]
