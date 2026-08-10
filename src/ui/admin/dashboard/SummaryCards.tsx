import { Building2, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buildCardScopeLabel } from './dashboardFormat'
import type { DashboardSummary } from '../../../api/adminDashboard'
import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import { formatCount } from '../adminFormat'
import { ADMIN_FOCUS_RING, formCardVariants } from '../adminVariants'

interface SummaryCardsProps {
  counts: DashboardSummary['counts']
  region: string | null
}

interface SummaryCardModel {
  key: string
  label: string
  value: number
  icon: LucideIcon
  /** `null` ise kart yönlendirme YAPMAZ, yalnız bilgilendirir. */
  to: string | null
}

/**
 * Kartların yönlendirmesi:
 * - "Proje Firmaları" ve "Proje Firması Kullanıcıları" ilgili listeye gider.
 * - "Gaz Dağıtım Kullanıcıları" bu aşamada yönlendirmez (belge + KK-3).
 *
 * TODO(esra): "Proje Firmaları" ve "Proje Firması Kullanıcıları" ekranları henüz
 * yok; ikisi de geçici olarak proje listesine gidiyor. Ekranlar açılınca hedefler
 * kendi yollarına çevrilecek.
 */
function buildCards(counts: DashboardSummary['counts']): SummaryCardModel[] {
  return [
    {
      key: 'gasDistributionUsers',
      label: 'Gaz Dağıtım Kullanıcıları',
      value: counts.gasDistributionUsers,
      icon: Users,
      to: null,
    },
    {
      key: 'projectFirms',
      label: 'Proje Firmaları',
      value: counts.projectFirms,
      icon: Building2,
      to: PROJECT_LIST_PATH,
    },
    {
      key: 'projectFirmUsers',
      label: 'Proje Firması Kullanıcıları',
      value: counts.projectFirmUsers,
      icon: UserRound,
      to: PROJECT_LIST_PATH,
    },
  ]
}

function CardBody({ card, scopeLabel }: { card: SummaryCardModel; scopeLabel: string }) {
  const Icon = card.icon

  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
        <Icon aria-hidden className="size-5 text-accent-ink" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xl font-semibold tabular-nums text-ink">
          {formatCount(card.value)}
        </span>
        <span className="text-sm text-ink-muted">{card.label}</span>
        <span className="mt-1 text-xs text-ink-muted">{scopeLabel}</span>
      </span>
    </>
  )
}

/** Üç özet kartı: geniş ekranda yan yana, tablette iki, telefonda tek sütun. */
export function SummaryCards({ counts, region }: SummaryCardsProps) {
  const scopeLabel = buildCardScopeLabel(region)

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {buildCards(counts).map((card) =>
        card.to === null ? (
          <div key={card.key} className={formCardVariants({ className: 'flex-row gap-4' })}>
            <CardBody card={card} scopeLabel={scopeLabel} />
          </div>
        ) : (
          <Link
            key={card.key}
            to={card.to}
            className={formCardVariants({
              className: `flex-row gap-4 transition-colors hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`,
            })}
          >
            <CardBody card={card} scopeLabel={scopeLabel} />
          </Link>
        ),
      )}
    </div>
  )
}
