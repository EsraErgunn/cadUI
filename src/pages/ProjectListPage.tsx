import { Link } from 'react-router-dom'

const DEMO_PROJECT_ID = 1

/** Yer tutucu: çizim ekranından çıkışın (KK-10) varış noktası. */
export function ProjectListPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold text-ink">Projeler</h1>
      <p className="text-sm text-ink-muted">
        Proje listesi kendi issue&apos;sunda gelecek.
      </p>
      <Link
        to={`/projects/${DEMO_PROJECT_ID}`}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-ink"
      >
        Çizim ekranını aç
      </Link>
    </div>
  )
}
