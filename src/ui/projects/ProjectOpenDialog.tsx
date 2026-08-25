import { useNavigate } from 'react-router-dom'

import { ProjectRow } from './ProjectRow'
import { useMyProjects } from './useMyProjects'
import type { Id } from '../../core/model'
import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'
import { DialogShell } from '../controls/DialogShell'
import { dialogActionVariants } from '../controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

type ProjectOpenDialogProps = {
  /** Editörde şu an açık proje; listede tıklanamaz "Açık" satırıyla işaretlenir. */
  currentProjectId: Id | undefined
  onClose: () => void
}

/**
 * Dosya ▸ Aç. Proje listesine dönmeden, editörün İÇİNDEN başka bir projeye
 * geçiş — "projelerim arasında değişim" burada.
 *
 * Seçim NAVİGASYONLA olur (`/projects/:id/editor`): rota deseni aynı olduğu
 * için `EditorPage` yeniden MOUNT OLMAZ, yalnız `:projectId` değişir ve
 * `useProjectPersistence` bunu zaten karşılıyor (proje değişince store
 * sıfırlanıp yeni projenin son sürümü yükleniyor — bkz. oradaki not).
 * Kaydedilmemiş değişiklik varsa router'ın kendi engeli (`useBlocker`, K112)
 * gezinmeyi durdurup her zamanki onay penceresini açar; burada AYRICA
 * sorulmaz — "← Projeler" ile AYNI kapı.
 */
export function ProjectOpenDialog({ currentProjectId, onClose }: ProjectOpenDialogProps) {
  const navigate = useNavigate()
  const { projects, isLoading, error } = useMyProjects(true)

  const handleSelect = (projectId: number) => {
    onClose()
    navigate(`${PROJECT_LIST_PATH}/${projectId}/editor`)
  }

  return (
    <DialogShell title="Proje Aç" onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error !== undefined && (
          <p role="alert" className="px-5 py-4 text-sm text-danger">
            {error}
          </p>
        )}

        {error === undefined && isLoading && (
          <p aria-live="polite" className="px-5 py-4 text-sm text-ink-muted">
            Projeler yükleniyor…
          </p>
        )}

        {error === undefined && !isLoading && projects.length === 0 && (
          <p className="px-5 py-4 text-sm text-ink-muted">Erişebildiğiniz başka proje yok.</p>
        )}

        {error === undefined && !isLoading && projects.length > 0 && (
          <ul className="py-1">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                isCurrent={project.id === currentProjectId}
                onSelect={() => handleSelect(project.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className={`${dialogActionVariants({ tone: 'cancel' })} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
      </div>
    </DialogShell>
  )
}
