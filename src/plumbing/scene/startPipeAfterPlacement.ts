import { getSymbolMetadata } from './symbolLoader'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { INSTALLATION_PIPE_TOOL_ID } from '../core/installationTools'
import { startChain } from '../core/lineChain'
import { resolveSeedElevationCm } from '../core/lineElevation'
import { getSeedPort } from '../core/lineSeed'
import { getPortWorldPosition } from '../core/ports'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Sayaç ya da servis kutusu konunca boru çizimi KENDİLİĞİNDEN başlar: araç
 * boruya geçer ve taslak elemanın çıkış portundan açılır (gaz yönü eleman →
 * tüketim). Kullanıcı elemanı koyup paletten boruyu ayrıca seçmek zorunda
 * kalmaz.
 */
export function startPipeFromElement(elementId: Id | null): void {
  const cad = useCadStore.getState()
  const element = cad.installationElements.find((candidate) => candidate.id === elementId)
  if (!element) return

  const metadata = getSymbolMetadata(element.type)
  const outputPort = getSeedPort(metadata)
  if (outputPort) {
    // Tohum kotu `useLineTool.startDraft` ile AYNI yerden gelir: sayaç
    // girişindeki borunun kotunu, servis kutusu ise kendi varsayılan çıkış
    // kotunu (15 cm) alır. Burada ayrı bir hesap durduğu sürece iki yol
    // ayrışıyordu — paletten konan servis kutusunda çizim 0'dan, porttan elle
    // başlatıldığında 15'ten başlıyordu (kullanıcı bulgusu, 2026-08).
    const elevationCm = resolveSeedElevationCm(
      { kind: 'port', elementId: element.id, portId: outputPort.id },
      cad.installationElements,
      cad.installationLines,
      cad.installationConnections,
    )

    usePlumbingUiStore.getState().setDraftLine({
      kind: 'pipe',
      ...startChain(
        getPortWorldPosition(element, outputPort, metadata),
        { kind: 'port', elementId: element.id, portId: outputPort.id },
        elevationCm,
      ),
    })
  }
  useUiStore.getState().setActiveTool(INSTALLATION_PIPE_TOOL_ID)
}
