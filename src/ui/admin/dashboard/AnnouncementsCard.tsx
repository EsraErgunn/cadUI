import { Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DashboardCard } from './DashboardCard'
import type { Announcement } from '../../../api/adminDashboard'
import { ANNOUNCEMENTS_PATH } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'
import { AnnouncementItem } from '../announcements/AnnouncementItem'

interface AnnouncementsCardProps {
  announcements: Announcement[]
}

export function AnnouncementsCard({ announcements }: AnnouncementsCardProps) {
  return (
    <DashboardCard
      title="Duyurular"
      icon={Megaphone}
      // Duyuru listesi ekranı henüz yok; bağlantı bugün "bu ekran gelecektir"
      // karşılamasına gidiyor (hızlı işlemlerdeki desenin aynısı). Yol nihai
      // olduğu için ekran gelince yalnız route'un element'i değişecek.
      headerSlot={
        <Link to={ANNOUNCEMENTS_PATH} className={`text-xs ${ADMIN_CELL_LINK}`}>
          Tümünü Gör
        </Link>
      }
    >
      {announcements.length === 0 ? (
        <p className="text-sm text-ink-muted">Gösterilecek duyuru yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <AnnouncementItem key={announcement.id} announcement={announcement} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
