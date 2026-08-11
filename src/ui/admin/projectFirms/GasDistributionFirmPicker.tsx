import { Search } from 'lucide-react'

import type { AuthorizationGasFirm } from './projectFirmAuthorizations'
import {
  ADMIN_CHECKBOX,
  adminFieldVariants,
  fieldControlVariants,
  fieldFrameVariants,
  fieldLabelVariants,
  fieldLeadingIconVariants,
  fieldIconPadding,
} from '../adminVariants'
import { FieldError } from '../form/FieldError'
import { errorId } from '../form/fieldAria'

interface GasDistributionFirmPickerProps {
  id: string
  label: string
  labelNote?: string
  gasFirms: AuthorizationGasFirm[]
  checkedGasFirmIds: number[]
  search: string
  isPending: boolean
  /** Grup seçilmeden liste yüklenmez; boş hâlin metni buna göre değişir. */
  hasSelectedGroup: boolean
  error?: string
  onSearchChange: (search: string) => void
  onToggleGasFirm: (gasDistributionFirmId: number) => void
  onToggleAll: (isChecked: boolean) => void
}

/**
 * Yetkilendirilecek gaz dağıtım firmalarının seçimi: iki sütunlu onay kutusu
 * ızgarası, üstünde arama ve "Tümünü Seç" (belge madde 17-19).
 *
 * Etiket belgeden geldiği gibi "G.D Firması Bölgeleri" kalıyor; kutulardaki
 * kayıtlar coğrafi bölge değil bölge lisanslı FİRMA ve adları "AKSA-ADANA"
 * biçiminde geliyor (bkz. projectFirmAuthorizations → formatAuthorizationGasFirmName).
 *
 * `FieldFrame` KULLANILMIYOR: onun etiketi `htmlFor` ile TEK bir girdiye bağlanır,
 * burada ise bir kutu kümesi var. Etiket bunun yerine `role="group"` kabına
 * `aria-labelledby` ile bağlanıyor — yerleşim sınıfları yine aynı varyantlardan
 * geliyor ki alan diğerleriyle aynı hizada dursun.
 */
export function GasDistributionFirmPicker({
  id,
  label,
  labelNote,
  gasFirms,
  checkedGasFirmIds,
  search,
  isPending,
  hasSelectedGroup,
  error,
  onSearchChange,
  onToggleGasFirm,
  onToggleAll,
}: GasDistributionFirmPickerProps) {
  const labelId = `${id}-label`
  const searchId = `${id}-search`
  const selectAllId = `${id}-select-all`
  const areAllChecked =
    gasFirms.length > 0 && gasFirms.every((gasFirm) => checkedGasFirmIds.includes(gasFirm.id))

  return (
    <div className={fieldFrameVariants({ layout: 'horizontal' })}>
      <span id={labelId} className={fieldLabelVariants({ layout: 'horizontal' })}>
        {label}
        {labelNote !== undefined && ' '}
        {labelNote !== undefined && (
          <span className="text-xs font-normal text-ink-muted">{labelNote}</span>
        )}
      </span>

      <div className={fieldControlVariants({ layout: 'horizontal' })}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex min-w-48 flex-1 flex-col">
            <Search aria-hidden className={fieldLeadingIconVariants()} />
            <input
              id={searchId}
              type="search"
              value={search}
              aria-label="Bölge ara"
              placeholder="Bölge ara"
              disabled={!hasSelectedGroup}
              onChange={(event) => onSearchChange(event.target.value)}
              className={adminFieldVariants({ className: fieldIconPadding(true) })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id={selectAllId}
              type="checkbox"
              checked={areAllChecked}
              disabled={gasFirms.length === 0}
              onChange={(event) => onToggleAll(event.target.checked)}
              className={ADMIN_CHECKBOX}
            />
            <label htmlFor={selectAllId} className="text-sm text-ink">
              Tümünü Seç
            </label>
          </div>
        </div>

        {/* Kayıt sayısı fazla olduğunda alan KENDİ İÇİNDE kayar (belge madde 18):
            sayfanın tamamı uzayıp "Ekle" düğmesi ekrandan çıkmasın. */}
        <div
          role="group"
          aria-labelledby={labelId}
          className="max-h-64 overflow-y-auto rounded-lg border border-edge bg-surface p-3"
        >
          {isPending && <p className="text-sm text-ink-muted">Bölgeler yükleniyor…</p>}

          {!isPending && gasFirms.length === 0 && (
            <p className="text-sm text-ink-muted">
              {hasSelectedGroup
                ? 'Bu grup firmasına bağlı bölge bulunamadı.'
                : 'Bölgeleri görmek için önce grup firmasını seçin.'}
            </p>
          )}

          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {gasFirms.map((gasFirm) => (
              <label key={gasFirm.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={checkedGasFirmIds.includes(gasFirm.id)}
                  onChange={() => onToggleGasFirm(gasFirm.id)}
                  className={ADMIN_CHECKBOX}
                />
                {gasFirm.name}
              </label>
            ))}
          </div>
        </div>

        {/* Sayı arama sonucuyla değişiyor: duyurulmazsa ekran okuyucu kullanıcısı
            süzmenin çalıştığını göremez. */}
        <p aria-live="polite" className="text-xs text-ink-muted">
          {gasFirms.length} bölge listeleniyor, {checkedGasFirmIds.length} tanesi işaretli.
        </p>

        {error !== undefined && <FieldError id={errorId(id)}>{error}</FieldError>}
      </div>
    </div>
  )
}
