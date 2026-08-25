import { FilePlus2, FolderOpen, Sparkles, UserPlus, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import { DashboardCard } from '../DashboardCard'
import {
  GAS_FIRM_CREATE_PATH,
  PROJECT_FIRM_CREATE_PATH,
  PROJECT_FIRM_USER_CREATE_PATH,
} from '../adminNavItems'
import { ADMIN_FOCUS_RING } from '../adminVariants'
import { useIsAdmin } from '../useIsAdmin'

interface QuickAction {
  key: string
  label: string
  icon: LucideIcon
  /**
   * `false` ise herkese görünür — proje listesi sol menüden zaten korumasız (K28).
   * `true` olanların üçünün de sunucudaki karşılığı `[Authorize(Roles = Admin)]`
   * (`POST /api/gasdistributionfirms`, `POST /api/projectfirms`,
   * `POST /api/auth/register`); burada gizlenen kısayol sunucuda da reddedilirdi.
   */
  isAdminOnly: boolean
  to: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'createGasFirm',
    label: 'Gaz Dağıtım Firması Ekle',
    icon: FilePlus2,
    isAdminOnly: true,
    to: GAS_FIRM_CREATE_PATH,
  },
  {
    key: 'createProjectFirm',
    label: 'Proje Firması Ekle',
    icon: FilePlus2,
    isAdminOnly: true,
    to: PROJECT_FIRM_CREATE_PATH,
  },
  {
    key: 'createUser',
    label: 'Kullanıcı Oluştur',
    icon: UserPlus,
    isAdminOnly: true,
    to: PROJECT_FIRM_USER_CREATE_PATH,
  },
  {
    key: 'viewProjects',
    label: 'Projeleri Görüntüle',
    icon: FolderOpen,
    isAdminOnly: false,
    to: PROJECT_LIST_PATH,
  },
]

const ACTION_TILE = 'flex items-center gap-2 rounded-lg border border-edge px-3 py-3 text-sm'

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

/**
 * Dört kısayol İKİ SÜTUNLU (KK-7). `grid-cols-2` kırılımlarda değişmiyor: kartın
 * kendisi dar ekranda tek sütuna iner ama İÇERİĞİ 2×2 kalır, yoksa kabul kriteri
 * ihlal olurdu. Yetkisi olmayan kullanıcının kısayolu listede HİÇ yer almaz.
 *
 * Yükleniyor iskeleti KALKTI: rol, login yanıtındaki `roleCode`'dan senkron
 * okunuyor (`useIsAdmin`), yani "izin listesi henüz gelmedi" diye bir an yok.
 * İskelet, silinen izin listesi ucunun ağ isteğini bekliyordu.
 */
export function QuickActionsCard() {
  const isAdmin = useIsAdmin()
  const actions = QUICK_ACTIONS.filter((action) => !action.isAdminOnly || isAdmin)

  return (
    <DashboardCard title="Hızlı İşlemler" icon={Sparkles}>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <ActionTile key={action.key} action={action} />
        ))}
      </div>
    </DashboardCard>
  )
}
