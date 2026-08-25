import { ProjectDocumentUnitDialog } from './ProjectDocumentUnitDialog'
import type { ProjectDocumentUnitOption } from './ProjectDocumentUnitDialog'
import type { ProjectDocumentActions } from './ProjectDocumentsTab'
import { ConfirmDialog } from '../ConfirmDialog'

const DELETE_DIALOG = {
  title: 'Evrak silinsin mi?',
  description: 'Evrak projeden kaldırılacak ve bu işlem geri alınamaz.',
  confirmLabel: 'Sil',
} as const

interface ProjectDocumentActionDialogsProps {
  units: ProjectDocumentUnitOption[]
  actions: ProjectDocumentActions
}

/**
 * Evrak silme ve birim değiştirme diyalogları. İKİ ekran çiziyor: proje
 * detayının evrak sekmesi ve Evrak Ekle ekranının "Proje Evrakları" sekmesi.
 *
 * Ayrı bir bileşen çünkü ikisi de aynı `useProjectDocumentActions` durumunu
 * kullanıyor; diyalogları her ekranda tekrar yazmak, onay metnini bir yerde
 * güncelleyip ötekini unutmanın yoluydu.
 */
export function ProjectDocumentActionDialogs({
  units,
  actions,
}: ProjectDocumentActionDialogsProps) {
  return (
    <>
      {actions.deleteTargetId !== null && (
        <ConfirmDialog
          title={DELETE_DIALOG.title}
          description={DELETE_DIALOG.description}
          confirmLabel={DELETE_DIALOG.confirmLabel}
          confirmTone="danger"
          isPending={actions.pendingDocumentId !== null}
          onConfirm={actions.confirmDelete}
          onCancel={actions.cancelDelete}
        />
      )}

      {actions.unitTarget !== null && (
        <ProjectDocumentUnitDialog
          document={actions.unitTarget}
          units={units}
          isSaving={actions.pendingDocumentId !== null}
          error={actions.unitError}
          onDismissError={actions.dismissUnitError}
          onSave={actions.confirmUnitChange}
          onClose={actions.cancelUnitChange}
        />
      )}
    </>
  )
}
