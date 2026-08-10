import { Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../ui/admin/PageHeader'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { adminButtonVariants, formCardVariants } from '../ui/admin/adminVariants'

const MESSAGE = 'Bu ekran gelecektir.'
const DETAIL =
  'Ekran henüz hazırlanmadı. Hazır olduğunda buradaki bağlantı doğrudan onu açacak, ' +
  'adres değişmeyecek.'

interface ComingSoonPageProps {
  /** Kısayolun/menü maddesinin etiketiyle AYNI olmalı: kullanıcı geldiği yeri tanısın. */
  title: string
  /** Konum izinde başlıktan önce görünen ara başlık ("Firmalar", "Kullanıcılar"). */
  section?: string
}

/**
 * Hedef ekranı yazılmamış bağlantıların karşılama sayfası. Kısayolu PASİF
 * bırakmak yerine gerçek bir rotaya bağlamak bilinçli: kullanıcı tıkladığında
 * ne olduğunu okuyor, geri dönebiliyor ve adres şimdiden doğru — ekran gelince
 * yalnız route'un element'i değişecek (router.tsx), bağlantılar aynı kalacak.
 */
export function ComingSoonPage({ title, section }: ComingSoonPageProps) {
  const breadcrumb = [
    { label: 'Anasayfa', to: ADMIN_HOME_PATH },
    ...(section === undefined ? [] : [{ label: section }]),
    { label: title },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader breadcrumb={breadcrumb} title={title} />

      <section className={formCardVariants({ className: 'items-center py-12 text-center' })}>
        <Construction aria-hidden className="size-10 text-ink-disabled" />
        {/* Durum bilgisi odak taşınmadan geldiği için duyurulmalı. */}
        <p role="status" className="text-base font-semibold text-ink">
          {MESSAGE}
        </p>
        <p className="max-w-prose text-sm text-ink-muted">{DETAIL}</p>

        <Link to={ADMIN_HOME_PATH} className={adminButtonVariants({ tone: 'secondary' })}>
          Anasayfaya dön
        </Link>
      </section>
    </div>
  )
}
