import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { adminButtonVariants } from '../ui/admin/adminVariants'

/**
 * Geçici karşılama ekranı: gerçek gösterge paneli (KPI kartları, grafikler) kendi
 * issue'sunda gelecek. O gelene kadar Anasayfa boş durmasın, kullanıcıyı tek
 * tıkla proje listesine götürsün diye buradan yönlendiriliyor.
 */
export function AdminHomePage() {
  return (
    <div className="mx-auto max-w-160 rounded-xl border border-edge bg-surface px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold text-ink">StarCAD Yönetici Paneli</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Doğal gaz tesisat projelerinizi buradan yönetirsiniz. Başlamak için proje listesine geçin.
      </p>
      <Link to={PROJECT_LIST_PATH} className={`mt-6 ${adminButtonVariants({ tone: 'primary' })}`}>
        Projelere Geç
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  )
}
