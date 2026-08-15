import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import type { BranchLineProperties } from '../../core/lineProperties'

type BranchPropertiesPanelProps = {
  lineIds: readonly Id[]
}

export function BranchPropertiesPanel({ lineIds }: BranchPropertiesPanelProps) {
  const installationLines = useCadStore((state) => state.installationLines)
  const patchLines = useCadStore((state) => state.patchLines)

  const selected = installationLines.filter((line) => lineIds.includes(line.id))
  if (selected.length === 0) return null

  const targetKey = `branch-${lineIds.join(',')}`

  const commitElevationCm = (value: number) => {
    const patch: BranchLineProperties = { elevationCm: value }
    patchLines(lineIds, () => ({ branch: patch }))
    return true
  }

  return (
    <div>
      <PropertyNumberField
        label="Yükselti (cm)"
        valueCm={getCommonNumber(selected.map((line) => line.branch?.elevationCm ?? 0))}
        targetKey={targetKey}
        onCommit={commitElevationCm}
      />
    </div>
  )
}
