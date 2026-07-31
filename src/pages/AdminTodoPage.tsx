import { Link } from 'react-router-dom'

import { GAS_DISTRIBUTION_FIRMS_PATH } from '../ui/admin/adminNavItems'
import { ADMIN_FOCUS_RING } from '../ui/admin/adminVariants'

/**
 * Henüz yazılmamış yönetici ekranlarının yer tutucusu. Route'u tanımlı olmayan
 * bağlantılar `*` kuralına düşüp kullanıcıyı proje listesine atmasın diye var.
 * ilgili ekran gelince bu route kaldırılacak.
 */
export function AdminTodoPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-160 rounded-xl border border-edge bg-surface px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">Bu ekran kendi issue&apos;sunda gelecek.</p>
      <Link
        to={GAS_DISTRIBUTION_FIRMS_PATH}
        className={`mt-4 inline-block rounded text-sm text-selection hover:underline ${ADMIN_FOCUS_RING}`}
      >
        Gaz Dağıtım Firmaları listesine dön
      </Link>
    </div>
  )
}
