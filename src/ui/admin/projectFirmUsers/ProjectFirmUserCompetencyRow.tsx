import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Trash2 } from 'lucide-react'

import { withGasFirm, type CompetencyDraft } from './projectFirmUserCompetencies'
import {
  AUTHORITY_TYPES,
  AUTHORITY_TYPE_LABELS,
  parseAuthorityType,
  type FirmReference,
} from '../../../api/projectFirmUserDto'
import { getAuthorizedProjectFirms } from '../../../api/projectFirmUsers'
import { projectFirmUpdatePath } from '../adminNavItems'
import {
  ADMIN_FOCUS_RING,
  adminButtonVariants,
  adminFieldVariants,
} from '../adminVariants'
import { Switch } from '../form/Switch'

const PLACEHOLDER_LABEL = 'Seçiniz'
const EMPTY_VALUE = ''

const CELL_CLASS = 'px-3 py-2 align-top'

interface ProjectFirmUserCompetencyRowProps {
  row: CompetencyDraft
  rowNumber: number
  gasFirms: FirmReference[]
  /** Aynı ikili başka satırda da var (KK-22); satır kırmızı kenarlıkla işaretlenir. */
  isDuplicate: boolean
  onChange: (patch: Partial<CompetencyDraft>) => void
  onRemove: () => void
}

/** Ekran okuyucuda üç satırın aynı adı taşımaması için alan adı satır numarasıyla. */
function fieldLabel(rowNumber: number, field: string): string {
  return `${rowNumber}. yetki satırı — ${field}`
}

export function ProjectFirmUserCompetencyRow({
  row,
  rowNumber,
  gasFirms,
  isDuplicate,
  onChange,
  onRemove,
}: ProjectFirmUserCompetencyRowProps) {
  // Proje firması listesi SEÇİLEN G.D. firmasına bağlı (KK-20); firma yokken
  // istek hiç çıkmaz. Aynı firmayı seçen satırlar aynı önbelleği paylaşır.
  const { data: projectFirms, isPending } = useQuery({
    queryKey: ['authorizedProjectFirms', row.gasFirmId],
    queryFn: ({ signal }) => getAuthorizedProjectFirms(row.gasFirmId ?? 0, signal),
    enabled: row.gasFirmId !== null,
  })

  const hasGasFirm = row.gasFirmId !== null
  const tone = isDuplicate ? 'invalid' : 'plain'

  return (
    <tr className="border-b border-edge last:border-0">
      <td className={CELL_CLASS}>
        <select
          value={row.gasFirmId === null ? EMPTY_VALUE : String(row.gasFirmId)}
          onChange={(event) =>
            onChange(
              withGasFirm(row, event.target.value === EMPTY_VALUE ? null : Number(event.target.value)),
            )
          }
          aria-label={fieldLabel(rowNumber, 'Gaz dağıtım firması')}
          className={adminFieldVariants({ tone, className: 'w-full pr-8' })}
        >
          <option value={EMPTY_VALUE}>{PLACEHOLDER_LABEL}</option>
          {gasFirms.map((firm) => (
            <option key={firm.id} value={firm.id}>
              {firm.name}
            </option>
          ))}
        </select>
      </td>

      <td className={CELL_CLASS}>
        <div className="flex items-center gap-2">
          <select
            value={row.projectFirmId === null ? EMPTY_VALUE : String(row.projectFirmId)}
            onChange={(event) =>
              onChange({
                projectFirmId:
                  event.target.value === EMPTY_VALUE ? null : Number(event.target.value),
              })
            }
            // Firma seçilmeden kutu PASİF (KK-20): seçenekleri neye göre
            // süzeceğini bilmeyen bir liste açmak yanıltıcı olurdu.
            disabled={!hasGasFirm || isPending}
            aria-label={fieldLabel(rowNumber, 'Proje firması')}
            className={adminFieldVariants({ tone, className: 'w-full pr-8' })}
          >
            <option value={EMPTY_VALUE}>{PLACEHOLDER_LABEL}</option>
            {(projectFirms ?? []).map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.name}
              </option>
            ))}
          </select>

          <FirmDetailShortcut projectFirmId={row.projectFirmId} rowNumber={rowNumber} />
        </div>
      </td>

      <td className={CELL_CLASS}>
        <select
          value={row.authorityType ?? EMPTY_VALUE}
          onChange={(event) => onChange({ authorityType: parseAuthorityType(event.target.value) })}
          aria-label={fieldLabel(rowNumber, 'Yetki')}
          className={adminFieldVariants({ tone, className: 'w-full pr-8' })}
        >
          <option value={EMPTY_VALUE}>{PLACEHOLDER_LABEL}</option>
          {AUTHORITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {AUTHORITY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </td>

      <td className={CELL_CLASS}>
        <input
          type="text"
          value={row.gdfRegistrationNumber}
          onChange={(event) => onChange({ gdfRegistrationNumber: event.target.value })}
          placeholder="Kayıt no"
          aria-label={fieldLabel(rowNumber, 'GDF kayıt no')}
          className={adminFieldVariants({ className: 'w-full' })}
        />
      </td>

      <td className={CELL_CLASS}>
        <Switch
          value={row.isActive}
          ariaLabel={fieldLabel(rowNumber, 'Aktif')}
          onChange={(value) => onChange({ isActive: value })}
        />
      </td>

      <td className={CELL_CLASS}>
        <button
          type="button"
          onClick={onRemove}
          className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
        >
          <Trash2 aria-hidden className="size-4" />
          Sil
        </button>
      </td>
    </tr>
  )
}

/**
 * Firma detayını YENİ SEKMEDE açar (KK-21) — form açık kalsın, girilen veri
 * kaybolmasın. Firma seçilmeden pasif; `<a>` etiketi pasifleştirilemediği için
 * o hâlde düğme render ediliyor.
 */
function FirmDetailShortcut({
  projectFirmId,
  rowNumber,
}: {
  projectFirmId: number | null
  rowNumber: number
}) {
  const label = fieldLabel(rowNumber, 'Firma detayını yeni sekmede aç')
  const shortcutClass = `inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-edge text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-disabled ${ADMIN_FOCUS_RING}`

  if (projectFirmId === null) {
    return (
      <button type="button" disabled aria-label={label} className={shortcutClass}>
        <ExternalLink aria-hidden className="size-4" />
      </button>
    )
  }

  return (
    <a
      href={projectFirmUpdatePath(projectFirmId)}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={shortcutClass}
    >
      <ExternalLink aria-hidden className="size-4" />
    </a>
  )
}
