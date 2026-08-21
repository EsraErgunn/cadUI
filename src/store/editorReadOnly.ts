import { useUiStore } from './uiStore'

/**
 * Salt görüntüleme kipinin React DIŞI okuma kapısı.
 *
 * Kipin kendisi `uiStore`'da (editörün çalışma kipi, `isPanModeActive` ile aynı
 * kategori). Bu ince sarmalayıcı, kipi okuyan üç ayrı katmanın —
 * `scene/` olay dinleyicileri, cadStore'un merkezî kapısı ve klavye
 * kısayolları — hepsinin AYNI ifadeyi yazmasını sağlıyor; `getState()` zinciri
 * yerlere dağılınca biri gün gelip yanlış anahtarı okur.
 *
 * Abonelik YOK: çağrıldığı anki değeri döndürür. Olay dinleyicileri zaten olay
 * anında soruyor, render'a bağlı değiller.
 */
export function isEditorReadOnly(): boolean {
  return useUiStore.getState().isEditorReadOnly
}
