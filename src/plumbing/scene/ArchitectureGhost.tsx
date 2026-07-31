// TODO(tesisat): mimari model store/scene tarafında çalışır olunca (core/model.ts
// Point/Wall tipleri hazır, cadStore slice'ı ve scene/Wall.tsx henüz yok) duvarlar
// buradan soluk okunacak. Desen hazır:
//   renk: PLUMBING_COLORS.architectureGhost, elevation: ARCHITECTURE_GHOST_ELEVATION_CM,
//   renderOrder: RENDER_ORDER.architectureGhost, depthWrite: false,
//   her mesh'e raycast={() => null} → mimari tesisat görünümünde seçilemez.
export function ArchitectureGhost() {
  return null
}
