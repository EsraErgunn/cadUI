import { DrawPreview } from './DrawPreview'
import { SymbolInstance } from './SymbolInstance'
import { usePlacementTool } from './usePlacementTool'
import { usePlumbingShortcuts } from './usePlumbingShortcuts'
import { useCadStore } from '../../store/cadStore'

/** Aktif kattaki elemanlar. Store dizisine olduğu gibi abone olunur — türetilmiş
 *  dizi döndüren bir selector her store değişiminde yeni referans üretirdi. */
function InstallationElements() {
  const elements = useCadStore((state) => state.installationElements)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return (
    <>
      {elements
        .filter((element) => element.floorId === activeFloorId)
        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        .map((element) => (
          <SymbolInstance key={element.id} element={element} />
        ))}
    </>
  )
}

/**
 * Tesisat sahnesinin kökü; SceneRoot yalnız tesisat görünümünde mount eder.
 * Karşı katmanın hayaleti buraya GİRMEZ: iki hayalet de SceneRoot'ta, görünüm
 * anahtarının yanında durur (ikisi de aktif katı kendi okur).
 */
export function PlumbingLayer() {
  const preview = usePlacementTool()
  usePlumbingShortcuts()

  return (
    <group name="plumbing-root">
      <InstallationElements />
      <DrawPreview elementType={preview.elementType} positionRef={preview.positionRef} />
    </group>
  )
}
