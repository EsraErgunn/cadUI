import { useEffect, useState } from 'react'

import { validateProject, type ValidationIssue } from '../../core/validate'
import { useCadStore } from '../../store/cadStore'

type ValidationResult = { issues: ValidationIssue[]; revision: number }

export type ProjectValidation = {
  issues: ValidationIssue[]
  /**
   * Sonuç ÇALIŞTIRILDI ve o günden beri çizim değişmedi. Yanlışsa liste
   * boşluğu "hata yok" anlamına GELMEZ — düğme de sayı göstermez (K79).
   */
  isFresh: boolean
  run: () => void
}

function runValidation(): ValidationResult {
  // Alanlar tek tek okunuyor: store'un tamamı `ValidationSource`'a uyuyor ama
  // sözleşme kadarını geçmek, doğrulamanın hangi veriye baktığını sabitliyor.
  const state = useCadStore.getState()
  return {
    revision: state.revision,
    issues: validateProject({
      floors: state.floors,
      points: state.points,
      walls: state.walls,
      openings: state.openings,
      rooms: state.rooms,
      symbols: state.symbols,
      installationElements: state.installationElements,
      installationLines: state.installationLines,
      installationConnections: state.installationConnections,
      floorPipeLinks: state.floorPipeLinks,
    }),
  }
}

/**
 * Hata kontrollerinin sonucu.
 *
 * Denetim çizim her değiştiğinde DEĞİL, liste AÇIKKEN çalışır: tarama kat
 * başına yüz taraması yapıyor ve duvar sürüklenirken bunu her karede
 * tekrarlamanın anlamı yok. Liste açıkken her `revision` değişimi taze sonuç
 * getirdiği için kullanıcı hatayı düzelttiği anda satırın kaybolduğunu görür.
 *
 * Tazeleme bir ABONELİKTEN geliyor, render sırasında hesaplamadan: doğrulamanın
 * girdisi React'in görmediği bir dış kaynak (store anlık görüntüsü), render'da
 * çağrılsaydı derleyici onu girdisiz bir sabit sanıp donduracaktı.
 */
export function useProjectValidation(isOpen: boolean): ProjectValidation {
  const revision = useCadStore((state) => state.revision)
  const [result, setResult] = useState<ValidationResult | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) return undefined

    return useCadStore.subscribe((state, previous) => {
      if (state.revision === previous.revision) return
      setResult(runValidation())
    })
  }, [isOpen])

  return {
    issues: result?.issues ?? [],
    isFresh: result !== undefined && result.revision === revision,
    run: () => setResult(runValidation()),
  }
}
