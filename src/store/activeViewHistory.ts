import { redoProject, undoProject, useCadStore, useCanRedo, useCanUndo } from './cadStore'
import { useUiStore } from './uiStore'
import { useCanRedoPlumbing, useCanUndoPlumbing } from '../plumbing/store/plumbingHistory'

/**
 * Geri al/yinele AKTİF GÖRÜNÜMÜN geçmişine gider: tesisat görünümünde tesisat
 * aynası (plumbingHistory), mimaride proje geçmişi. İzometrikte düzenleme yok,
 * proje geçmişi varsayılan olarak kalır.
 *
 * Çağıran her yerin (klavye kısayolu, menü, yüzen çubuk) bu dallanmayı kendi
 * içinde yazması bugünkü hatanın kaynağıydı: kısayol dallanıyor, düğmeler
 * dallanmıyordu — tesisat görünümünde düğme mimariyi geri alıyordu. Tek kapı.
 */
function isInstallationView(): boolean {
  return useUiStore.getState().activeViewId === 'installation'
}

export function undoActiveView(): void {
  if (isInstallationView()) {
    useCadStore.getState().undoPlumbing()
    return
  }
  undoProject()
}

export function redoActiveView(): void {
  if (isInstallationView()) {
    useCadStore.getState().redoPlumbing()
    return
  }
  redoProject()
}

/**
 * Aktifliği de aynı dala bağlamak ZORUNLU: proje geçmişine bakan bir düğme
 * tesisat görünümünde geri alınacak adım varken pasif, yokken aktif görünürdü.
 * İki hook'a da koşulsuz abone olunuyor — React hook sırası dallanamaz.
 */
export function useCanUndoActiveView(): boolean {
  const canUndoProject = useCanUndo()
  const canUndoPlumbing = useCanUndoPlumbing()
  const activeViewId = useUiStore((state) => state.activeViewId)

  return activeViewId === 'installation' ? canUndoPlumbing : canUndoProject
}

export function useCanRedoActiveView(): boolean {
  const canRedoProject = useCanRedo()
  const canRedoPlumbing = useCanRedoPlumbing()
  const activeViewId = useUiStore((state) => state.activeViewId)

  return activeViewId === 'installation' ? canRedoPlumbing : canRedoProject
}
