import { useMemo } from 'react'

import { SolidSurface } from './SolidSurface'
import { createBoxesGeometry, createCylindersGeometry, createSlabsGeometry } from './solidGeometry'
import { groupByColorHex } from './solidGrouping'
import { SOLID_AREA_COLORS, SOLID_COLORS, getSolidSlabColor } from './solidTheme'
import type { SolidModel } from '../../core/solidModel'

/**
 * Duvarlar saydamken bu opaklıkta: içerideki boru okunacak kadar geçirgen ama
 * duvarın nerede durduğu hâlâ görünecek kadar dolu.
 */
const TRANSPARENT_WALL_OPACITY = 0.25

type SolidBuildingProps = {
  model: SolidModel
  isWallsTransparent: boolean
  isSlabsVisible: boolean
}

/** Binanın kütlesi: duvar, cam, döşeme, kiriş ve kat boyunca yükselen nesneler. */
export function SolidBuilding({
  model,
  isWallsTransparent,
  isSlabsVisible,
}: SolidBuildingProps) {
  const wallsGeometry = useMemo(() => createBoxesGeometry(model.walls), [model.walls])
  const glazingGeometry = useMemo(() => createBoxesGeometry(model.glazing), [model.glazing])
  const beamsGeometry = useMemo(() => createBoxesGeometry(model.beams), [model.beams])
  // Zemin MAHALE göre renkleniyor, bu yüzden tek tampon değil renk başına bir
  // tampon: malzeme mesh'e ait (bkz. solidGrouping.ts).
  const slabGroups = useMemo(
    () =>
      isSlabsVisible
        ? groupByColorHex(model.slabs, getSolidSlabColor).map((group) => ({
            colorHex: group.colorHex,
            geometry: createSlabsGeometry(group.items),
          }))
        : [],
    [model.slabs, isSlabsVisible],
  )

  const areaBoxGroups = useMemo(
    () =>
      groupByColorHex(model.areaObjects, (box) => SOLID_AREA_COLORS[box.areaType]).map(
        (group) => ({ colorHex: group.colorHex, geometry: createBoxesGeometry(group.items) }),
      ),
    [model.areaObjects],
  )

  // Şaftlar kutu öbeklerinden AYRI: geometrileri dönel, tek bir tamponda
  // birleşmiyorlar (biri indeksli biri değil).
  const areaCylinderGroups = useMemo(
    () =>
      groupByColorHex(
        model.areaCylinders,
        (cylinder) => SOLID_AREA_COLORS[cylinder.areaType],
      ).map((group) => ({
        colorHex: group.colorHex,
        geometry: createCylindersGeometry(group.items),
      })),
    [model.areaCylinders],
  )

  return (
    <group name="solid-building">
      <SolidSurface
        geometry={wallsGeometry}
        colorHex={SOLID_COLORS.wall}
        opacity={isWallsTransparent ? TRANSPARENT_WALL_OPACITY : 1}
        // Saydam duvarın İÇ yüzü de çizilmeli: yalnız ön yüz kalsaydı odanın
        // karşı duvarı yokmuş gibi görünür, kütle okunmazdı.
        isDoubleSided={isWallsTransparent}
      />
      <SolidSurface
        geometry={glazingGeometry}
        colorHex={SOLID_COLORS.glazing}
        opacity={SOLID_COLORS.glazingOpacity}
        isDoubleSided
      />
      {/* Döşeme tek düz yüzey (kalınlığı yok): alttaki kattan bakınca kaybolmasın
          diye iki yüzü de çizilir. */}
      {slabGroups.map((group) => (
        <SolidSurface
          key={group.colorHex}
          geometry={group.geometry}
          colorHex={group.colorHex}
          isDoubleSided
        />
      ))}
      <SolidSurface geometry={beamsGeometry} colorHex={SOLID_COLORS.beam} />
      {areaBoxGroups.map((group) => (
        <SolidSurface key={group.colorHex} geometry={group.geometry} colorHex={group.colorHex} />
      ))}
      {/* Baca şaftının içi BOŞ: deliğin iç yüzeyi de çizilmeli, yoksa tepeden
          bakınca boru dipsiz görünür. */}
      {areaCylinderGroups.map((group) => (
        <SolidSurface
          key={group.colorHex}
          geometry={group.geometry}
          colorHex={group.colorHex}
          isDoubleSided
        />
      ))}
    </group>
  )
}
