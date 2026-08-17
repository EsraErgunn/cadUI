import { Megaphone, Search } from 'lucide-react'

import {
  ADMIN_TOOLBAR_FORM,
  ADMIN_TOOLBAR_ROW,
  ADMIN_TOOLBAR_SEARCH_FIELD,
  ADMIN_TOOLBAR_SEARCH_WRAPPER,
} from '../adminToolbarLayout'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'

const TEXT_QUERY_FIELD = 'announcementQuery'

interface AnnouncementsToolbarProps {
  textQuery: string
  onApplyTextQuery: (value: string) => void
  onPublish: () => void
}

export function AnnouncementsToolbar({
  textQuery,
  onApplyTextQuery,
  onPublish,
}: AnnouncementsToolbarProps) {
  return (
    <div className={ADMIN_TOOLBAR_ROW}>
      {/* key={textQuery}: URL dışarıdan değişince (geri tuşu, çipi kaldırma)
          kutu yeni değerle yeniden kurulur — kopya state tutmaya gerek kalmaz. */}
      <form
        key={textQuery}
        className={ADMIN_TOOLBAR_FORM}
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get(TEXT_QUERY_FIELD)
          onApplyTextQuery(typeof value === 'string' ? value.trim() : '')
        }}
      >
        <div className={ADMIN_TOOLBAR_SEARCH_WRAPPER}>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
          />
          <input
            type="search"
            name={TEXT_QUERY_FIELD}
            defaultValue={textQuery}
            aria-label="Duyuru başlığında ve metninde ara"
            placeholder="Duyurularda ara"
            className={adminFieldVariants({ className: ADMIN_TOOLBAR_SEARCH_FIELD })}
          />
        </div>

        <button type="submit" className={adminButtonVariants({ tone: 'secondary' })}>
          Ara
        </button>
      </form>

      <button
        type="button"
        onClick={onPublish}
        className={adminButtonVariants({ tone: 'primary' })}
      >
        <Megaphone aria-hidden className="size-4" />
        Duyuru Yayınla
      </button>
    </div>
  )
}
