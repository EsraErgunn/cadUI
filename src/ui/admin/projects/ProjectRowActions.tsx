import { adminButtonVariants } from '../adminVariants'

interface ProjectRowActionsProps {
  projectId: number
  /** İstek sürerken iki düğme de kilitlenir: aynı satıra ikinci istek gitmesin. */
  isPending: boolean
  onDelete: (projectId: number) => void
  onSubmit: (projectId: number) => void
}

/** Yalnız eylemleri yayınlar; API'yi çağıran taraf `useProjectActions`. */
export function ProjectRowActions({
  projectId,
  isPending,
  onDelete,
  onSubmit,
}: ProjectRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onDelete(projectId)}
        disabled={isPending}
        aria-busy={isPending}
        className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
      >
        Sil
      </button>
      <button
        type="button"
        onClick={() => onSubmit(projectId)}
        disabled={isPending}
        aria-busy={isPending}
        className={adminButtonVariants({ tone: 'success', size: 'sm' })}
      >
        Gönder
      </button>
    </div>
  )
}
