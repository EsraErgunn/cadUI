import { Search } from 'lucide-react'

import type { AuthorizationGasFirm } from './authorizationDraft'
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
  /** TEK seçim; `null` = henüz seçilmedi. */
  selectedGasFirmId: number | null
  search: string
  isPending: boolean
  /** Grup seçilmeden liste yüklenmez; boş hâlin metni buna göre değişir. */
  hasSelectedGroup: boolean
  error?: string
  onSearchChange: (search: string) => void
  onSelectGasFirm: (gasDistributionFirmId: number) => void
}

/**
 * Yetkilendirilecek gaz dağıtım firmasının seçimi: iki sütunlu RADYO ızgarası,
 * üstünde arama.
 *
 * Seçim TEKİL (belge madde 17-19'daki çoklu seçimden bilinçli sapma): sertifika
 * numarası tek bir yetkilendirme kaydına ait ve eşsiz olmak zorunda, çoklu
 * seçimde aynı numara N firmaya birden yazılıyordu. "Tümünü Seç" bu yüzden
 * kalktı — tekil seçimde karşılığı yok.
 *
 * Etiket belgeden geldiği gibi "G.D Firması Bölgeleri" kalıyor; kutulardaki
 * kayıtlar coğrafi bölge değil bölge lisanslı FİRMA ve adları "AKSA-ADANA"
 * biçiminde geliyor (bkz. authorizationDraft → formatAuthorizationGasFirmName).
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
  selectedGasFirmId,
  search,
  isPending,
  hasSelectedGroup,
  error,
  onSearchChange,
  onSelectGasFirm,
}: GasDistributionFirmPickerProps) {
  const labelId = `${id}-label`
  const searchId = `${id}-search`

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

        </div>

        {/* Kayıt sayısı fazla olduğunda alan KENDİ İÇİNDE kayar (belge madde 18):
            sayfanın tamamı uzayıp "Ekle" düğmesi ekrandan çıkmasın. */}
        <div
          role="radiogroup"
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
                {/* Radyo: aynı `name` ile tarayıcı tekilliği kendisi uyguluyor,
                    ayrıca ok tuşlarıyla gezinme geliyor. */}
                <input
                  type="radio"
                  name={id}
                  checked={selectedGasFirmId === gasFirm.id}
                  onChange={() => onSelectGasFirm(gasFirm.id)}
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
          {gasFirms.length} bölge listeleniyor,{' '}
          {selectedGasFirmId === null ? 'seçim yapılmadı' : '1 tanesi seçili'}.
        </p>

        {error !== undefined && <FieldError id={errorId(id)}>{error}</FieldError>}
      </div>
    </div>
  )
}
