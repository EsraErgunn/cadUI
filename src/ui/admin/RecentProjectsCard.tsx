import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DashboardCard } from './DashboardCard'
import { formatDateTime } from './adminFormat'
import { projectDetailPath, projectListPathForStatus } from './adminNavItems'
import { ADMIN_CELL_LINK, ADMIN_FOCUS_RING } from './adminVariants'
import type { ProjectListItem, ProjectStatus } from '../../api/projects'

interface RecentProjectsCardProps {
  title: string
  icon: LucideIcon
  /** Kartın beslendiği sekme; "Tümünü Gör" oraya gider. */
  status: ProjectStatus
  /** `undefined` = yolda, boş dizi = gerçekten kayıt yok. */
  projects: readonly ProjectListItem[] | undefined
  isError: boolean
  emptyMessage: string
}

const LOADING_MESSAGE = 'Yükleniyor…'
const ERROR_MESSAGE = 'Liste yüklenemedi.'

/**
 * Anasayfadaki kısa proje listesi. Tablo DEĞİL: dört sütunlu bir tabloyu karta
 * sıkıştırmak dar ekranda yatay kaydırma doğuruyordu; burada satır başına ad +
 * güncelleme zamanı yetiyor, ayrıntı için satır proje detayına gidiyor.
 *
 * Aynı bileşen her kartı çiziyor: hepsi `GET /api/projects`'in aynı sorgusundan
 * yalnız `status` farkıyla besleniyor. Proje firması anasayfası taslak/onay
 * bekleyen, gaz dağıtım anasayfası onay bekleyen/onaylanan gösteriyor.
 */
export function RecentProjectsCard({
  title,
  icon,
  status,
  projects,
  isError,
  emptyMessage,
}: RecentProjectsCardProps) {
  return (
    <DashboardCard
      title={title}
      icon={icon}
      headerSlot={
        <Link
          to={projectListPathForStatus(status)}
          className={`inline-flex items-center gap-1 rounded-md text-sm font-semibold text-accent-ink hover:underline ${ADMIN_FOCUS_RING}`}
        >
          Tümünü Gör
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      }
    >
      {/* Değişen metin duyurulur: kart yüklenirken ekran okuyucu kullanıcısı
          sonucun geldiğini fark etsin. */}
      <div aria-live="polite" className="min-w-0">
        {isError && <p className="py-6 text-center text-sm text-danger-ink">{ERROR_MESSAGE}</p>}

        {!isError && projects === undefined && (
          <p className="py-6 text-center text-sm text-ink-muted">{LOADING_MESSAGE}</p>
        )}

        {!isError && projects !== undefined && projects.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-muted">{emptyMessage}</p>
        )}

        {!isError && projects !== undefined && projects.length > 0 && (
          <ul className="flex flex-col divide-y divide-edge">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 flex-col">
                  <Link to={projectDetailPath(project.id)} className={ADMIN_CELL_LINK}>
                    {project.name}
                  </Link>
                  <span className="truncate font-mono text-xs tabular-nums text-ink-muted">
                    {project.pId}
                  </span>
                </span>
                {/* `updatedAt` sözleşmede zorunlu (`apiProjectListItemSchema`);
                    boş hücre dalı yok. */}
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  {formatDateTime(project.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  )
}
