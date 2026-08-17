import { Trash2 } from 'lucide-react'

import type { ProjectFirmAuthorization } from './authorizationDraft'
import { adminIconButtonVariants } from '../adminVariants'

interface AuthorizationListProps {
  authorizations: ProjectFirmAuthorization[]
  onRemove: (gasDistributionFirmId: number) => void
}

/** Sertifika opsiyonel; girilmediğinde tablo hücrelerindeki desenle "-" durur. */
const EMPTY_VALUE = '-'

/**
 * Eklenen yetkilendirme kayıtları (belge madde 20). Liste `role="list"` ile
 * duyuruluyor ve adet `aria-live` ile okunuyor: "Ekle" düğmesi odağı
 * değiştirmediği için, kaydın eklendiğini yalnız görsel değişimden anlamak
 * ekran okuyucu kullanıcısında mümkün olmazdı.
 */
export function AuthorizationList({ authorizations, onRemove }: AuthorizationListProps) {
  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" className="text-xs font-medium text-ink-muted">
        {authorizations.length === 0
          ? 'Henüz yetkilendirme eklenmedi.'
          : `${authorizations.length} yetkilendirme eklendi.`}
      </p>

      {authorizations.length > 0 && (
        <ul className="flex flex-col gap-2">
          {authorizations.map((authorization) => (
            <li
              key={authorization.gasDistributionFirmId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-surface-sunken px-3 py-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-ink">
                  {authorization.gasDistributionFirmName}
                </span>
                <span className="text-xs text-ink-muted">
                  {authorization.groupName} · Yeterlilik No:{' '}
                  {authorization.qualificationNumber} · Sertifika No:{' '}
                  {authorization.certificateNumber ?? EMPTY_VALUE}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(authorization.gasDistributionFirmId)}
                aria-label={`${authorization.gasDistributionFirmName} yetkilendirmesini kaldır`}
                className={adminIconButtonVariants({ surface: 'sunken' })}
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
