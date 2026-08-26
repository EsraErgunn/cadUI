import { Plus, X } from 'lucide-react'

import type { ProjectFirmAuthorization } from './authorizationDraft'
import { formatShortDate } from '../adminFormat'
import { ADMIN_FOCUS_RING, adminButtonVariants } from '../adminVariants'

interface AuthorizationListProps {
  authorizations: ProjectFirmAuthorization[]
  /** Taslak paneli açık mı; "+" düğmesi bunu çeviriyor. */
  isDraftOpen: boolean
  onToggleDraft: () => void
  onRemove: (gasDistributionFirmId: number) => void
}

/**
 * Çipin ALTINDAKİ ayrıntı: grup, sertifika numarası ve geçerlilik aralığı.
 * Çipin görünen yüzü yalnız firma adı — üç bilgi de etikete sığmıyor — ama
 * `title` ve `aria-label` üzerinden hem fare hem ekran okuyucu için duruyor.
 */
function buildChipDetail(authorization: ProjectFirmAuthorization): string {
  const range =
    authorization.validTo === null
      ? `${formatShortDate(authorization.validFrom)} – süresiz`
      : `${formatShortDate(authorization.validFrom)} – ${formatShortDate(authorization.validTo)}`

  return `${authorization.groupName} · Sertifika No: ${authorization.certificateNumber} · ${range}`
}

/**
 * Eklenen yetkilendirmeler (belge madde 20) ÇOKLU SEÇİM çipleri olarak.
 *
 * Bir proje firması birden fazla gaz dağıtım firmasına bağlanabiliyor ve
 * sunucu bunu satır satır saklıyor (`POST /api/project-firm-authorizations`,
 * kayıt başına bir istek). Seçim bu yüzden çoğul: her çip bir yetki KAYDI,
 * yani kendi sertifika numarası ve geçerlilik aralığıyla birlikte duruyor —
 * sertifika firma çiftine ait, ortak bir numara N firmaya yazılamaz.
 *
 * Çiplerin sonundaki "+" yeni firma panelini açıyor. Liste `role="list"` ile
 * duyuruluyor ve adet `aria-live` ile okunuyor: "Ekle" odağı değiştirmediği
 * için, kaydın eklendiğini yalnız görsel değişimden anlamak ekran okuyucu
 * kullanıcısında mümkün olmazdı.
 */
export function AuthorizationList({
  authorizations,
  isDraftOpen,
  onToggleDraft,
  onRemove,
}: AuthorizationListProps) {
  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" className="text-xs font-medium text-ink-muted">
        {authorizations.length === 0
          ? 'Henüz yetkilendirme eklenmedi.'
          : `${authorizations.length} yetkilendirme eklendi.`}
      </p>

      <ul className="flex flex-wrap items-center gap-2">
        {authorizations.map((authorization) => {
          const detail = buildChipDetail(authorization)

          return (
            <li
              key={authorization.gasDistributionFirmId}
              title={detail}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-edge
                         bg-surface-sunken py-1 pl-3 pr-1.5 text-sm text-ink"
            >
              <span className="min-w-0 truncate">{authorization.gasDistributionFirmName}</span>
              {/* Ayrıntı ekran okuyucuya çipin İÇİNDEN okunuyor; `title`
                  tek başına güvenilir biçimde duyurulmuyor. */}
              <span className="sr-only">{` — ${detail}`}</span>

              <button
                type="button"
                onClick={() => onRemove(authorization.gasDistributionFirmId)}
                aria-label={`${authorization.gasDistributionFirmName} yetkilendirmesini kaldır`}
                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full
                            text-ink-muted transition-colors hover:bg-surface hover:text-ink
                            ${ADMIN_FOCUS_RING}`}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          )
        })}

        <li>
          {/* `type="button"`: form içinde durduğu için varsayılan `submit`
              olsaydı Enter'a basan kullanıcı firmayı kaydederdi. */}
          <button
            type="button"
            onClick={onToggleDraft}
            aria-expanded={isDraftOpen}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            <Plus aria-hidden className="size-4" />
            {isDraftOpen ? 'Kapat' : 'G.D. Firması Ekle'}
          </button>
        </li>
      </ul>
    </div>
  )
}
