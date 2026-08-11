import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'

import { LABEL_OFFSET_PX, LengthText } from './LengthLabels'
import { MEASUREMENT_ELEVATION_CM } from './plumbingLayers'
import { useCameraZoom } from './useCameraZoom'
import type { LineToolSnap, LineToolState } from './useLineTool'
import { planToThree, type PlanPoint } from '../../core/coords'
import { useCadStore } from '../../store/cadStore'
import type { InstallationLine } from '../core/installationModel'
import { formatLengthMeters } from '../core/lengthFormat'
import { getMeasurementAnchor, getSplitLengthsCm } from '../core/lineGeometry'

type SplitSegment = { from: PlanPoint; at: PlanPoint; to: PlanPoint }

/** Yakalanan borunun ayrılacağı parçanın uçları ve ayrım noktası; ayrım yoksa null. */
function resolveSplitSegment(
  lines: readonly InstallationLine[],
  snap: LineToolSnap | null,
): SplitSegment | null {
  // Mevcut bir KÖŞEye yapışıldığında boru ayrılmaz, var olan köşeye bağlanılır
  // (useLineTool → toAttachment) — bölünmeyen borunun ayrım ölçüsü de olmaz.
  if (snap?.kind !== 'line' || snap.line.pointId !== undefined) return null

  const line = lines.find((candidate) => candidate.id === snap.line.lineId)
  // segmentIndex `points[i] → points[i + 1]` parçasını gösterir; lineSnap ile
  // splitLineAtSegment aynı indekslemeyi kullanır.
  const from = line?.points[snap.line.segmentIndex]
  const to = line?.points[snap.line.segmentIndex + 1]
  if (!from || !to) return null

  return { from: from.position, at: snap.position, to: to.position }
}

function ActiveSplitLengthLabels({ snapRef }: Pick<LineToolState, 'snapRef'>) {
  const lines = useCadStore((state) => state.installationLines)
  const fromGroupRef = useRef<Group>(null)
  const toGroupRef = useRef<Group>(null)
  const [labels, setLabels] = useState<readonly [string, string] | null>(null)
  const zoom = useCameraZoom()

  useFrame(() => {
    const fromGroup = fromGroupRef.current
    const toGroup = toGroupRef.current
    if (!fromGroup || !toGroup) return

    const split = resolveSplitSegment(lines, snapRef.current)
    const lengthsCm = split && getSplitLengthsCm(split.from, split.to, split.at)
    if (!split || !lengthsCm) {
      setLabels((current) => (current === null ? current : null))
      return
    }

    // İki yarım aynı yöne baktığı için dikleri de aynı: etiketler borunun AYNI
    // yanında durur, karşılıklı iki tarafa dağılmaz.
    const offsetCm = LABEL_OFFSET_PX / zoom
    fromGroup.position.set(
      ...planToThree(getMeasurementAnchor(split.from, split.at, offsetCm), MEASUREMENT_ELEVATION_CM),
    )
    toGroup.position.set(
      ...planToThree(getMeasurementAnchor(split.at, split.to, offsetCm), MEASUREMENT_ELEVATION_CM),
    )

    const next = [formatLengthMeters(lengthsCm[0]), formatLengthMeters(lengthsCm[1])] as const
    setLabels((current) =>
      current !== null && current[0] === next[0] && current[1] === next[1] ? current : next,
    )
  })

  return (
    <>
      <group ref={fromGroupRef}>
        {labels !== null && <LengthText label={labels[0]} zoom={zoom} />}
      </group>
      <group ref={toGroupRef}>
        {labels !== null && <LengthText label={labels[1]} zoom={zoom} />}
      </group>
    </>
  )
}

/**
 * Çizerken imleç MEVCUT bir borunun üstüne düştüğünde, o borunun ayrılacağı yerin
 * iki yanındaki uzunluklar. Tıklanmadan görünür: kullanıcı boruyu nereden
 * böleceğine sayıya bakarak karar verebilsin.
 *
 * Anlık uzunlukla (DraftLengthLabel) aynı gerekçeyle `Ölçüleri Göster`den
 * BAĞIMSIZ — bu bir çizim geri bildirimi, kalıcı kotalama değil. Ayrılacak
 * bölümün kendi kalıcı etiketi (TAMAMININ boyu) yerinde kalır; iki yarımın
 * yazısı çeyrek noktalarda durduğu için üstüne binmez.
 *
 * Kapı gövdeden ayrı bir bileşen: hat aracı kapalıyken ne store aboneliği ne de
 * useFrame kurulur.
 */
export function SplitLengthLabels({ kind, snapRef }: LineToolState) {
  if (kind === null) return null

  return (
    <group name="split-length-labels">
      <ActiveSplitLengthLabels snapRef={snapRef} />
    </group>
  )
}
