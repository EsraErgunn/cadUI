import { redoProject, undoProject, useCadStore, useCanRedo, useCanUndo } from './cadStore'
import { shouldRedoSketch, shouldUndoSketch } from './sketchHistory'
import { useUiStore } from './uiStore'
import { useCanRedoPlumbing, useCanUndoPlumbing } from '../plumbing/store/plumbingHistory'

/**
 * Geri al/yinele AKTİF GÖRÜNÜMÜN geçmişine gider: mimaride proje geçmişi,
 * tesisat VE İZOMETRİKTE tesisat aynası (plumbingHistory).
 *
 * İzometrik neden tesisat dalında: oradaki her düzenleme (dal ayırma, etiket
 * taşıma, izometrik konumları sıfırlama) `installationLines`/`Elements`
 * üstünde çalışıyor ve `plumbingSlice` üzerinden kaydediliyor. Proje geçmişine
 * bağlansaydı izometrikte Ctrl+Z kullanıcının EN SON ÇİZDİĞİ DUVARI geri
 * alırdı — "izometrikte düzenleme yok" varsayımı Adım 7'de geçersizleşti.
 *
 * Çağıran her yerin (klavye kısayolu, menü, yüzen çubuk) bu dallanmayı kendi
 * içinde yazması bugünkü hatanın kaynağıydı: kısayol dallanıyor, düğmeler
 * dallanmıyordu — tesisat görünümünde düğme mimariyi geri alıyordu. Tek kapı.
 */
const PLUMBING_HISTORY_VIEWS = ['installation', 'isometric']

function isPlumbingHistoryView(): boolean {
  return PLUMBING_HISTORY_VIEWS.includes(useUiStore.getState().activeViewId)
}

export function undoActiveView(): void {
  if (isPlumbingHistoryView()) {
    useCadStore.getState().undoPlumbing()
    return
  }
  // Serbest çizim ÇİZİMDEN ÖNCE sorulur ama yalnız o daha yeniyse (K164):
  // kroki cadStore'da olmadığı için zundo onu hiç görmüyor.
  if (shouldUndoSketch()) {
    useUiStore.getState().undoSketch()
    return
  }
  undoProject()
}

export function redoActiveView(): void {
  if (isPlumbingHistoryView()) {
    useCadStore.getState().redoPlumbing()
    return
  }
  if (shouldRedoSketch()) {
    useUiStore.getState().redoSketch()
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

  // Kroki yığını da düğmeyi AKTİF tutmalı: yalnız kroki çizilmiş bir projede
  // proje geçmişi boş olur ve düğme pasif görünürdü.
  const hasSketchUndo = useUiStore((state) => state.sketchUndoStack.length > 0)

  if (PLUMBING_HISTORY_VIEWS.includes(activeViewId)) return canUndoPlumbing
  return canUndoProject || hasSketchUndo
}

export function useCanRedoActiveView(): boolean {
  const canRedoProject = useCanRedo()
  const canRedoPlumbing = useCanRedoPlumbing()
  const activeViewId = useUiStore((state) => state.activeViewId)

  const hasSketchRedo = useUiStore((state) => state.sketchRedoStack.length > 0)

  if (PLUMBING_HISTORY_VIEWS.includes(activeViewId)) return canRedoPlumbing
  return canRedoProject || hasSketchRedo
}
