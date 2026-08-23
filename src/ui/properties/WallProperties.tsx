import { PropertyNumberField } from './PropertyNumberField'
import type { Id } from '../../core/model'
import {
  getCommonNumber,
  MIN_WALL_HEIGHT_CM,
  MIN_WALL_THICKNESS_CM,
} from '../../core/propertyFields'
import {
  getSegmentEndAtLength,
  getSegmentLength,
  getWallEnds,
  MIN_WALL_LENGTH_CM,
} from '../../core/wall'
import { useCadStore } from '../../store/cadStore'

const THICKNESS_STEP_CM = 5
const HEIGHT_STEP_CM = 10
/** Uzunluk türetilmiş bir değer; ondalık kuyruğu panelde okunmaz olmasın. */
const LENGTH_DECIMALS = 1

type WallPropertiesProps = {
  wallIds: readonly Id[]
}

export function WallProperties({ wallIds }: WallPropertiesProps) {
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const setWallsThickness = useCadStore((state) => state.setWallsThickness)
  const setWallsHeight = useCadStore((state) => state.setWallsHeight)
  const movePoint = useCadStore((state) => state.movePoint)

  const selectedWalls = walls.filter((wall) => wallIds.includes(wall.id))
  if (selectedWalls.length === 0) return null

  const lengths = selectedWalls.map((wall) => {
    const ends = getWallEnds(wall, points)
    return ends ? Number(getSegmentLength(ends.p1, ends.p2).toFixed(LENGTH_DECIMALS)) : 0
  })

  const targetKey = `walls-${wallIds.join(',')}`
  const [sole] = selectedWalls
  const isSingle = selectedWalls.length === 1

  /**
   * Uzunluğu yazmak = p2 köşesini doğrultu üzerinde taşımak. Hedef konum
   * `core`dan geliyor; panel trigonometri yapmıyor.
   */
  const commitLength = (lengthCm: number): boolean => {
    const ends = getWallEnds(sole, points)
    if (!ends) return false

    const next = getSegmentEndAtLength(ends.p1, ends.p2, lengthCm)
    if (!next) return false

    movePoint(sole.p2Id, next)
    return true
  }

  return (
    <div>
      {/*
       * Uzunluk YAZILABİLİR (kullanıcı isteği). Kural: p1 ucu SABİT kalır, p2
       * mevcut doğrultu üzerinde kaydırılır — yani köşeyi fareyle sürüklemenin
       * klavye karşılığı, `movePoint` de aynı eylem.
       *
       * ⚠️ p2 komşu duvarlarla PAYLAŞILIYOR olabilir; o zaman komşular esneyerek
       * bağlı kalır. Bu modelin doğrudan sonucu (duvar kendi koordinatını
       * taşımıyor) ve sürüklemede de aynısı oluyor — burada gizlenmesi
       * kullanıcıyı iki farklı davranışla karşılaştırırdı.
       *
       * ⚠️ Yalnız TEK duvar seçiliyken: iki duvar köşe paylaşıyorsa toplu yazım
       * aynı köşeyi iki kez oynatır ve sonuç yazım SIRASINA bağlı olurdu.
       */}
      <PropertyNumberField
        label="Uzunluk (cm)"
        valueCm={getCommonNumber(lengths)}
        targetKey={targetKey}
        minCm={MIN_WALL_LENGTH_CM}
        isReadOnly={!isSingle}
        onCommit={isSingle ? commitLength : undefined}
        rejectionMessage="Uzunluk yazılamadı: duvarın yönü yok."
      />
      <PropertyNumberField
        label="Kalınlık (cm)"
        valueCm={getCommonNumber(selectedWalls.map((wall) => wall.thickness))}
        targetKey={targetKey}
        minCm={MIN_WALL_THICKNESS_CM}
        stepCm={THICKNESS_STEP_CM}
        onCommit={(thicknessCm) => setWallsThickness(wallIds, thicknessCm)}
        rejectionMessage="Geçersiz kalınlık."
      />
      <PropertyNumberField
        label="Yükseklik (cm)"
        valueCm={getCommonNumber(selectedWalls.map((wall) => wall.height))}
        targetKey={targetKey}
        minCm={MIN_WALL_HEIGHT_CM}
        stepCm={HEIGHT_STEP_CM}
        onCommit={(heightCm) => setWallsHeight(wallIds, heightCm)}
        rejectionMessage="Geçersiz yükseklik."
      />
    </div>
  )
}
