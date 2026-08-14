import { useUiStore } from '../store/uiStore'

/**
 * Izgara yakalaması bu basış için açık mı?
 *
 * İki kaynak birleşir: floating bar'daki KALICI anahtar
 * (`uiStore.isGridSnapEnabled`) ve Ctrl'ün ANLIK kapatması. Ctrl üstte biner —
 * anahtar açıkken de kullanıcı ara ölçüde tek bir nokta koyabilsin (K54).
 *
 * Tek yerde duruyor çünkü beş araç hook'u aynı soruyu soruyor; her biri kendi
 * `!event.ctrlKey`'ini yazsaydı anahtar eklenirken biri unutulur ve o araçta
 * snap sessizce açık kalırdı.
 *
 * ⚠️ Yalnız IZGARA yakalamasını kapatır. Uç/köşe/duvar yakalaması
 * (`resolveSnap`'in point/wall dalları) etkilenmez: kapansaydı duvarlar köşede
 * birleşmez, oda çevrimi kapanmaz ve mahal tespiti çalışmazdı.
 */
export function isGridSnapActive(event: { ctrlKey: boolean }): boolean {
  return useUiStore.getState().isGridSnapEnabled && !event.ctrlKey
}
