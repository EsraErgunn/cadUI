import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { BoilerProperties } from './properties/BoilerProperties'
import { BranchPropertiesPanel } from './properties/BranchPropertiesPanel'
import { ChimneyPropertiesPanel } from './properties/ChimneyPropertiesPanel'
import { CombiBoilerProperties } from './properties/CombiBoilerProperties'
import { FilterKitProperties } from './properties/FilterKitProperties'
import { GasMeterProperties } from './properties/GasMeterProperties'
import { InsulationProperties } from './properties/InsulationProperties'
import { OtherApplianceProperties } from './properties/OtherApplianceProperties'
import { PipePropertiesPanel } from './properties/PipePropertiesPanel'
import { RegulatorProperties } from './properties/RegulatorProperties'
import { ServiceBoxProperties } from './properties/ServiceBoxProperties'
import { SolenoidValveProperties } from './properties/SolenoidValveProperties'
import { SpaceHeaterProperties } from './properties/SpaceHeaterProperties'
import { StoveProperties } from './properties/StoveProperties'
import { StrainerMeterProperties } from './properties/StrainerMeterProperties'
import { ValveProperties } from './properties/ValveProperties'
import { VentilationDuctPropertiesPanel } from './properties/VentilationDuctPropertiesPanel'
import { WaterHeaterProperties } from './properties/WaterHeaterProperties'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getPlumbingPropertyPanelTitle, getPlumbingSelectionKind } from '../core/propertyFields'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Tesisat seçiminin özellik paneli — `src/ui/PropertyPanel.tsx` ile AYNI
 * iskelet (K37: çizim alanının üstüne biner, sağdan kayar, DOM'da kalır ama
 * seçim yokken aria-hidden+inert). Ayrı bir bileşen: tesisatın kendi seçim
 * store'u (`usePlumbingUiStore`) mimarininkinden (`useArchitectureUiStore`)
 * TAMAMEN ayrı, ikisini tek panelde karıştırmak K37/KK-12'nin çözdüğü
 * sorunları geri getirir (bkz. .claude/knowledge/property-panel.md).
 */
export function PlumbingPropertyPanel() {
  const selectedElementIds = usePlumbingUiStore((state) => state.selectedElementIds)
  const selectedLineIds = usePlumbingUiStore((state) => state.selectedLineIds)
  const clearSelection = usePlumbingUiStore((state) => state.clearSelection)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationLines = useCadStore((state) => state.installationLines)
  const removeSelection = useCadStore((state) => state.removeSelection)
  const activeViewId = useUiStore((state) => state.activeViewId)

  // Görünüm değişince panel KAPANIR — mimarideki K53 kuralı burada da geçerli
  // (property-panel.md: "Tesisatta ayrı bir panel YOK, eklenirse aynı kural
  // oraya da yazılmalı"). Önceki görünüm ref'te: yalnız bağımlılık dizisine
  // güvenmek MOUNT anında da seçimi silerdi.
  const previousViewIdRef = useRef(activeViewId)
  useEffect(() => {
    if (previousViewIdRef.current === activeViewId) return
    previousViewIdRef.current = activeViewId
    clearSelection()
  }, [activeViewId, clearSelection])

  const kind = getPlumbingSelectionKind(
    selectedElementIds,
    selectedLineIds,
    installationElements,
    installationLines,
  )
  const isOpen = kind.scope !== 'none'

  const handleDelete = () => {
    removeSelection(selectedElementIds, selectedLineIds)
    clearSelection()
  }

  return (
    <aside
      aria-label="Tesisat özellikleri"
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      className={`absolute inset-y-0 right-0 z-10 flex w-64 shrink-0 flex-col border-l border-edge bg-surface shadow-lg transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      }`}
    >
      <h2 className="shrink-0 border-b border-edge px-3 py-2 text-sm font-semibold text-ink">
        {getPlumbingPropertyPanelTitle(kind, selectedElementIds.length, selectedLineIds.length)}
      </h2>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {kind.scope === 'element' && kind.elementType === 'serviceBox' && <ServiceBoxProperties />}
        {kind.scope === 'element' && kind.elementType === 'regulator' && (
          <RegulatorProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'insulation' && (
          <InsulationProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'gasMeter' && (
          <GasMeterProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'filterKit' && (
          <FilterKitProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'valve' && (
          <ValveProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'strainerMeter' && (
          <StrainerMeterProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'solenoidValve' && (
          <SolenoidValveProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'stove' && (
          <StoveProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'spaceHeater' && (
          <SpaceHeaterProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'combiBoiler' && (
          <CombiBoilerProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'waterHeater' && (
          <WaterHeaterProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'boiler' && (
          <BoilerProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'element' && kind.elementType === 'otherAppliance' && (
          <OtherApplianceProperties elementIds={selectedElementIds} />
        )}
        {kind.scope === 'line' && kind.lineKind === 'pipe' && (
          <PipePropertiesPanel lineIds={selectedLineIds} />
        )}
        {kind.scope === 'line' && kind.lineKind === 'chimney' && (
          <ChimneyPropertiesPanel lineIds={selectedLineIds} />
        )}
        {kind.scope === 'line' && kind.lineKind === 'branch' && (
          <BranchPropertiesPanel lineIds={selectedLineIds} />
        )}
        {kind.scope === 'line' && kind.lineKind === 'ventilationDuct' && (
          <VentilationDuctPropertiesPanel lineIds={selectedLineIds} />
        )}
        {/* Manometrenin özellik alanı BOŞ (tesisat_eleman.md) — 'element' kind'i
            başlığı zaten açıyor, ayrı bir case/placeholder gerekmez. */}
        {/* Tüm INSTALLATION_ELEMENT_TYPES + seçilebilir InstallationLineKind
            (applianceStub hariç — o hiç seçilebilir bir araç değil, bkz.
            elementLabels.ts) artık kapsandı. */}
        {kind.scope === 'mixed' && (
          <p className="py-1 text-xs text-ink-muted">
            Farklı türde nesneler seçili; ortak düzenlenebilir alan yok.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-edge px-3 py-2">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-sm text-danger hover:bg-danger/10"
        >
          <Trash2 size={16} strokeWidth={1.8} aria-hidden />
          Sil
        </button>
      </div>
    </aside>
  )
}
