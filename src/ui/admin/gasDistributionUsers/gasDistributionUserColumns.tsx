import { Link } from 'react-router-dom'

import type { GasDistributionUserRow } from '../../../api/gasDistributionUsers'
import { formatPhone, toNormalizedPhoneDigits } from '../../../core/phone'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { gasDistributionUserUpdatePath } from '../adminNavItems'
import { ADMIN_CELL_LINK, adminButtonVariants } from '../adminVariants'

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
  // Kullanıcı adı ve ad soyad güncelleme ekranına GÖTÜRÜR — proje firması
  // kullanıcıları tablosundaki desen: satırın kimliğini taşıyan iki hücre
  // düzenlemenin girişi, ayrı bir "Düzenle" sütunu açılmıyor.
  {
    key: 'username',
    label: 'Kullanıcı Adı',
    cell: (row) => (
      <Link to={gasDistributionUserUpdatePath(row.id)} className={ADMIN_CELL_LINK}>
        {row.username}
      </Link>
    ),
  },
  {
    key: 'fullName',
    label: 'Adı Soyadı',
    cell: (row) => (
      <Link to={gasDistributionUserUpdatePath(row.id)} className={ADMIN_CELL_LINK}>
        {row.fullName}
      </Link>
    ),
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

/** Eylem sütunu içeriği kadar dursun (liste ekranlarıyla aynı gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

export interface GasDistributionUserColumnsOptions {
  /**
   * Satır silinebilir mi. Yalnız GÖRÜNÜRLÜK; yetkisizde sütun HİÇ üretilmez —
   * boş bir "Aksiyonlar" başlığı eylem varmış gibi görünürdü.
   */
  canDelete: boolean
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingUserId: number | null
  onDelete: (userId: number) => void
}

export function buildGasDistributionUserColumns({
  canDelete,
  pendingUserId,
  onDelete,
}: GasDistributionUserColumnsOptions): DataTableColumn<GasDistributionUserRow>[] {
  if (!canDelete) return GAS_DISTRIBUTION_USER_COLUMNS

  return [
    ...GAS_DISTRIBUTION_USER_COLUMNS,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (row) => (
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          disabled={pendingUserId === row.id}
          aria-busy={pendingUserId === row.id}
          className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
        >
          Sil
        </button>
      ),
    },
  ]
}
