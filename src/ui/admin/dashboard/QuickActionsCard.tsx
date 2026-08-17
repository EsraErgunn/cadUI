import { FilePlus2, FolderOpen, Sparkles, UserPlus, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DashboardCard } from './DashboardCard'
import type { Permission } from '../../../api/permissions'
import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import {
  GAS_FIRM_CREATE_PATH,
  PROJECT_FIRM_CREATE_PATH,
  PROJECT_FIRM_USER_CREATE_PATH,
} from '../adminNavItems'
import { ADMIN_FOCUS_RING } from '../adminVariants'
import { useArePermissionsLoading, usePermission } from '../usePermission'

interface QuickAction {
  key: string
  label: string
  icon: LucideIcon
  /** `null` ise izin aranmaz — proje listesi sol menüden zaten korumasız (K28). */
  permission: Permission | null
  to: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'createGasFirm',
    label: 'Gaz Dağıtım Firması Ekle',
    icon: FilePlus2,
    permission: 'firm.create',
    to: GAS_FIRM_CREATE_PATH,
  },
  {
    key: 'createProjectFirm',
    label: 'Proje Firması Ekle',
    icon: FilePlus2,
    permission: 'projectFirm.create',
    to: PROJECT_FIRM_CREATE_PATH,
  },
  {
    key: 'createUser',
    label: 'Kullanıcı Oluştur',
    icon: UserPlus,
    permission: 'user.create',
    to: PROJECT_FIRM_USER_CREATE_PATH,
  },
  {
    key: 'viewProjects',
    label: 'Projeleri Görüntüle',
    icon: FolderOpen,
    permission: null,
    to: PROJECT_LIST_PATH,
  },
]

const ACTION_TILE = 'flex items-center gap-2 rounded-lg border border-edge px-3 py-3 text-sm'

/** İzin listesi gelene kadar ızgara boş kalmasın; kart yüksekliği sabit durur. */
function ActionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden>
      {QUICK_ACTIONS.map((action) => (
        <div key={action.key} className={`${ACTION_TILE} animate-pulse text-transparent`}>
          <span className="size-4 shrink-0 rounded bg-surface-sunken" />
          <span className="h-4 flex-1 rounded bg-surface-sunken" />
        </div>
      ))}
    </div>
  )
}

interface ActionTileProps {
  action: QuickAction
}

/**
 * Her kısayol GERÇEK bir bağlantı. Ekranı olmayanlar da rotaya bağlı: hedefte
 * "bu ekran gelecektir" karşılaması var (ComingSoonPage). Pasif düğme yerine
 * bunun seçilmesi bilinçli — kullanıcı tıklayınca ne olduğunu okuyor, geri
 * dönebiliyor; ekran gelince yalnız route'un element'i değişiyor.
 */
function ActionTile({ action }: ActionTileProps) {
  const Icon = action.icon

  return (
    <Link
      to={action.to}
      className={`${ACTION_TILE} text-ink transition-colors hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-accent-ink" />
      <span className="min-w-0 flex-1">{action.label}</span>
    </Link>
  )
}

function useVisibleActions(): QuickAction[] {
  const canCreateFirm = usePermission('firm.create')
  const canCreateProjectFirm = usePermission('projectFirm.create')
  const canCreateUser = usePermission('user.create')

  const granted: Record<Permission, boolean> = {
    'firm.create': canCreateFirm,
    'projectFirm.create': canCreateProjectFirm,
    'user.create': canCreateUser,
  }

  return QUICK_ACTIONS.filter(
    (action) => action.permission === null || granted[action.permission],
  )
}

/**
 * Dört kısayol İKİ SÜTUNLU (KK-7). `grid-cols-2` kırılımlarda değişmiyor: kartın
 * kendisi dar ekranda tek sütuna iner ama İÇERİĞİ 2×2 kalır, yoksa kabul kriteri
 * ihlal olurdu. Yetkisi olmayan kullanıcının kısayolu listede HİÇ yer almaz.
 */
export function QuickActionsCard() {
  const isLoading = useArePermissionsLoading()
  const actions = useVisibleActions()

  return (
    <DashboardCard title="Hızlı İşlemler" icon={Sparkles}>
      {isLoading ? (
        <ActionSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <ActionTile key={action.key} action={action} />
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
