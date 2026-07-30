// TODO(tesisat): mimari veri modeli store/scene tarafında çalışır hâle gelince bu
// bayrak true yapılacak ve isPlumbingViewAvailable'a gerçek "mimari çizim var mı?"
// sonucu verilecek (plan Bölüm 6/18).
export const REQUIRE_ARCHITECTURE_BEFORE_PLUMBING = false

/** Bayrak parametreli saf çekirdek: sabiti değiştirmeden test edilebilsin diye ayrı. */
export function isPlumbingViewAvailableWith(
  isArchitectureRequired: boolean,
  hasArchitectureDrawing: boolean,
): boolean {
  return !isArchitectureRequired || hasArchitectureDrawing
}

/** Tek okuma noktası: ui/menu/ViewSwitcher.tsx. Başka yerden çağrılmaz. */
export function isPlumbingViewAvailable(hasArchitectureDrawing: boolean): boolean {
  return isPlumbingViewAvailableWith(REQUIRE_ARCHITECTURE_BEFORE_PLUMBING, hasArchitectureDrawing)
}
