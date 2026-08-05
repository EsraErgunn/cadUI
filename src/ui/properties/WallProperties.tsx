import { PropertyNumberField } from './PropertyNumberField'
import type { Id } from '../../core/model'
import {
  getCommonNumber,
  MIN_WALL_HEIGHT_CM,
  MIN_WALL_THICKNESS_CM,
} from '../../core/propertyFields'
import { getSegmentLength, getWallEnds } from '../../core/wall'
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

  const selectedWalls = walls.filter((wall) => wallIds.includes(wall.id))
  if (selectedWalls.length === 0) return null

  const lengths = selectedWalls.map((wall) => {
    const ends = getWallEnds(wall, points)
    return ends ? Number(getSegmentLength(ends.p1, ends.p2).toFixed(LENGTH_DECIMALS)) : 0
  })

  const targetKey = `walls-${wallIds.join(',')}`

  return (
    <div>
      {/*
       * Uzunluk salt okunur: değiştirmek duvarın p2 köşesini oynatmak demek ve o
       * köşe komşu duvarlarla PAYLAŞILIYOR — tek alandan yazmak komşuyu da
       * sürükler. Düzenlenebilir uzunluk (ve KK-7'deki bölüm aralığı) duvar
       * altyapısı tarafının işi.
       */}
      <PropertyNumberField
        label="Uzunluk (cm)"
        valueCm={getCommonNumber(lengths)}
        targetKey={targetKey}
        isReadOnly
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
