/** İki sağ tık bu süre içinde gelirse "çift sağ tık" sayılır. */
export const DOUBLE_CLICK_WINDOW_MS = 300

export type RightClickAction = 'undoPoint' | 'finish'

export type RightClickInput =
  | { kind: 'click'; atMs: number }
  /** Bekleme penceresi doldu — zamanlayıcıyı çağıran kurar, kararı bu fonksiyon verir. */
  | { kind: 'timeout' }

export type RightClickResolution = {
  /** Kararı bekleyen sağ tıkın zamanı; null = bekleyen yok. */
  pendingSinceMs: number | null
  /** null = karar henüz verilmedi. */
  action: RightClickAction | null
  /** Kurulacak zamanlayıcı süresi; null = zamanlayıcı gerekmiyor (varsa iptal edilir). */
  scheduleInMs: number | null
}

/**
 * Tek / çift sağ tık ayrımı SAF fonksiyonda: setTimeout bileşende kalır, karar
 * burada test edilebilir (Risk R6). İlk sağ tık hemen "son noktayı geri al"
 * demez — pencere dolmadan ikinci tık gelirse jest "bitir"e döner.
 */
export function resolveRightClick(
  pendingSinceMs: number | null,
  input: RightClickInput,
): RightClickResolution {
  if (input.kind === 'timeout') {
    // Bekleyen yokken gelen zamanlayıcı etkisizdir: çift tık kararı zaten vermiştir.
    if (pendingSinceMs === null) return { pendingSinceMs: null, action: null, scheduleInMs: null }

    return { pendingSinceMs: null, action: 'undoPoint', scheduleInMs: null }
  }

  if (pendingSinceMs !== null && input.atMs - pendingSinceMs <= DOUBLE_CLICK_WINDOW_MS) {
    return { pendingSinceMs: null, action: 'finish', scheduleInMs: null }
  }

  return { pendingSinceMs: input.atMs, action: null, scheduleInMs: DOUBLE_CLICK_WINDOW_MS }
}
