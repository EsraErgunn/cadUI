import { Link } from 'react-router-dom'

import type { ProjectFirmUserRow } from '../../../api/projectFirmUserDto'
import { formatPhone, toNormalizedPhoneDigits } from '../../../core/phone'
import type { DataTableColumn } from '../DataTable'
import {
  projectFirmUpdatePath,
  projectFirmUserUpdatePath,
} from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

export const PROJECT_FIRM_USER_TABLE_CAPTION =
  'Proje firması kullanıcıları listesi. Bir kullanıcının her yetkisi ayrı satırdır.'

/** Sekiz sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kayar. */
export const PROJECT_FIRM_USER_TABLE_MIN_WIDTH = 'min-w-280'

/** Belge KK-9: değeri olmayan alan boş bırakılmaz. */
const MISSING_VALUE_LABEL = '—'

/**
 * Hücre çiziciler bilerek BİLEŞEN değil, düz fonksiyon: dosya sütun dizisini de
 * dışa aktardığı için bileşen tanımı fast refresh'i bozuyor
 * (react-refresh/only-export-components). Çıktı aynı.
 */
function renderMissingValue() {
  return <span className="text-ink-disabled">{MISSING_VALUE_LABEL}</span>
}

/**
 * Telefon KK-9'a göre "0xxx xxx xx xx" biçimine indirgenir. Hiçbir kalıba
 * uymayan kayıt (dahili hat, bozuk veri) HAM hâliyle kalır: uydurma bir biçim
 * dayatmak, kullanıcıya yanlış numara göstermek olurdu.
 */
function renderPhone(value: string | null) {
  if (value === null || value === '') return renderMissingValue()

  const digits = toNormalizedPhoneDigits(value)
  return <span>{digits === null ? value : formatPhone(digits)}</span>
}

/**
 * Sütun sırası belge madde 6 / KK-8'den. "Kullanıcı Tipi", "G.D. Firması" ve
 * "Gdf Kayıt No" ÇIKARILDI: sunucudaki `User` kullanıcı başına tek proje
 * firması tutuyor, yetki satırı kavramı (eski KK-11) şemada yok ve o üç alanın
 * karşılığı hiç bulunmuyor. Satır artık kullanıcı başına tek.
 *
 * Sıralanabilir başlık YOK: gereksinim sıralamadan söz etmiyor.
 */
export const PROJECT_FIRM_USER_COLUMNS: DataTableColumn<ProjectFirmUserRow>[] = [
  {
    key: 'username',
    label: 'Kullanıcı Adı',
    cell: (row) => (
      <Link to={projectFirmUserUpdatePath(row.id)} className={ADMIN_CELL_LINK}>
        {row.username}
      </Link>
    ),
  },
  {
    key: 'fullName',
    label: 'Adı Soyadı',
    cell: (row) => (
      <Link to={projectFirmUserUpdatePath(row.id)} className={ADMIN_CELL_LINK}>
        {row.fullName}
      </Link>
    ),
  },
  {
    key: 'email',
    label: 'E-mail',
    // Taslakta ve belgede tıklanabilir DEĞİL (KK-10 dört sütun sayıyor):
    // `mailto:` bağlantısı proje firmaları ekranındaki desen olsa da buraya
    // taşınmadı, gereksinimin dışına çıkmamak için soluk metin kalıyor.
    cellClassName: 'text-ink-muted',
    cell: (row) => (row.email === '' ? renderMissingValue() : row.email),
  },
  {
    key: 'phone',
    label: 'Telefon',
    cellClassName: 'tabular-nums text-ink-muted',
    cell: (row) => renderPhone(row.phone),
  },
  {
    key: 'projectFirm',
    label: 'Proje Firması',
    // Firma bağı opsiyonel: kimliksiz kayıtta bağlantı kurulmaz, boş işareti çizilir.
    cell: (row) =>
      row.projectFirm === null ? (
        renderMissingValue()
      ) : (
        <Link to={projectFirmUpdatePath(row.projectFirm.id)} className={ADMIN_CELL_LINK}>
          {row.projectFirm.name}
        </Link>
      ),
  },
]
