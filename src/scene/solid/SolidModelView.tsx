import { SolidBuilding } from './SolidBuilding'
import { SolidCamera } from './SolidCamera'
import { SolidInstallation } from './SolidInstallation'
import { SOLID_COLORS } from './solidTheme'
import { useSolidModel } from './useSolidModel'
import { planToThree } from '../../core/coords'
import type { SolidModel } from '../../core/solidModel'
import { useUiStore } from '../../store/uiStore'

/** Zemin binadan bu kadar taşar (cm) — bina boşlukta asılı durmasın. */
const GROUND_MARGIN_CM = 400

/** Zemin, en alt kat tabanının bu kadar altında: döşemeyle z-fighting yapmasın. */
const GROUND_DROP_CM = 2

/**
 * Yönlü ışığın uzaklığı. Gölge yok, yani yalnız YÖN önemli — büyük bir değer
 * ışığı bina büyüdükçe yeniden ayarlamaktan kurtarıyor.
 */
const LIGHT_DISTANCE_CM = 100_000

function SolidGround({ model }: { model: SolidModel }) {
  const bounds = model.bounds
  if (!bounds) return null

  const widthCm = bounds.maxXCm - bounds.minXCm + GROUND_MARGIN_CM * 2
  const depthCm = bounds.maxYCm - bounds.minYCm + GROUND_MARGIN_CM * 2
  const lowestCm = Math.min(...model.levels.map((level) => level.baseCm))
  const center = {
    x: (bounds.minXCm + bounds.maxXCm) / 2,
    y: (bounds.minYCm + bounds.maxYCm) / 2,
  }

  return (
    // Düzlem varsayılan olarak XY'de duruyor; yatırmak için X ekseninde −90°
    // (Cameras.tsx'teki tepeden bakış döndürmesiyle aynı gerekçe).
    <mesh
      position={planToThree(center, lowestCm - GROUND_DROP_CM)}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[widthCm, depthCm]} />
      <meshStandardMaterial color={SOLID_COLORS.ground} roughness={1} />
    </mesh>
  )
}

/**
 * Katı model görünümü: 2B çizimin kat yüksekliklerine, duvar kalınlıklarına ve
 * boru kotlarına göre türetilmiş 3B hâli. Salt OKUMA — burada çizim aracı,
 * seçim ve tutamak yok, bu yüzden `DrawSurface` da mount edilmez.
 */
export function SolidModelView() {
  const model = useSolidModel()
  const isSolidWallsTransparent = useUiStore((state) => state.isSolidWallsTransparent)
  const isSolidSlabsVisible = useUiStore((state) => state.isSolidSlabsVisible)
  const isSolidInstallationVisible = useUiStore((state) => state.isSolidInstallationVisible)

  return (
    <>
      <SolidCamera model={model} />
      {/* Işık üçlüsü: gökyüzü/zemin ayrımı için hemisphere, yüzeyleri birbirinden
          ayıran yön için directional, gölgede kalan yüzler kararmasın diye
          düşük bir ambient. Malzeme `meshStandard`, yani ışıksız hiçbir şey
          görünmez — 2B'nin `meshBasic` düzlüğünden ayrıldığımız yer burası. */}
      <hemisphereLight args={['#ffffff', '#b8c2cf', 1]} />
      <directionalLight
        position={[LIGHT_DISTANCE_CM, LIGHT_DISTANCE_CM * 1.6, LIGHT_DISTANCE_CM * 0.8]}
        intensity={1.4}
      />
      <ambientLight intensity={0.3} />

      <SolidGround model={model} />
      <SolidBuilding
        model={model}
        isWallsTransparent={isSolidWallsTransparent}
        isSlabsVisible={isSolidSlabsVisible}
      />
      {isSolidInstallationVisible && <SolidInstallation model={model} />}
    </>
  )
}
