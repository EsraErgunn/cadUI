import { useMemo } from 'react'

import { SolidSurface } from './SolidSurface'
import { createBoxesGeometry, createPipesGeometry } from './solidGeometry'
import { groupByColorHex } from './solidGrouping'
import { getSolidElementColor, getSolidPipeColor } from './solidTheme'
import type { SolidModel } from '../../core/solidModel'

type SolidInstallationProps = { model: SolidModel }

/**
 * Tesisat katmanının katı hâli: borular gerçek çaplarında birer silindir,
 * elemanlar sembolün ayak izi kadar birer kütle. Renkler 2B ile aynı tablodan
 * (`solidTheme.ts`) geliyor — plandaki hat katı modelde de aynı renkte.
 */
export function SolidInstallation({ model }: SolidInstallationProps) {
  const pipeGroups = useMemo(
    () =>
      groupByColorHex(model.pipes, getSolidPipeColor).map((group) => ({
        colorHex: group.colorHex,
        geometry: createPipesGeometry(group.items),
      })),
    [model.pipes],
  )

  const elementGroups = useMemo(
    () =>
      groupByColorHex(model.elements, (box) => getSolidElementColor(box.elementType)).map(
        (group) => ({ colorHex: group.colorHex, geometry: createBoxesGeometry(group.items) }),
      ),
    [model.elements],
  )

  return (
    <group name="solid-installation">
      {pipeGroups.map((group) => (
        <SolidSurface key={`pipe-${group.colorHex}`} geometry={group.geometry} colorHex={group.colorHex} />
      ))}
      {elementGroups.map((group) => (
        <SolidSurface
          key={`element-${group.colorHex}`}
          geometry={group.geometry}
          colorHex={group.colorHex}
        />
      ))}
    </group>
  )
}
