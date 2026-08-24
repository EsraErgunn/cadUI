import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { planToThree } from '../../core/coords'
import type { SolidAreaCylinder, SolidBox, SolidPipeSegment, SolidSlab } from '../../core/solidModel'

const DEG_TO_RAD = Math.PI / 180

/** Boru silindirinin çevre bölüntüsü. 8 yeterli: çap en fazla 11 cm, ekranda az piksel. */
const PIPE_RADIAL_SEGMENTS = 8

/** Silindir kendi ekseninde +Y'ye bakar; yön döndürmesi bu vektörden başlar. */
const CYLINDER_AXIS = new Vector3(0, 1, 0)

/** Şaft çevresinin bölüntüsü — plandaki çember sayısıyla aynı ölçekte. */
const SHAFT_RADIAL_SEGMENTS = 24

/**
 * Döşeme duvarın tabanıyla ÇAKIŞMASIN diye bu kadar aşağı iner (cm). Aynı
 * düzlemde kalsalardı z-fighting yapar, yüzey kamera açısına göre titrerdi.
 */
const SLAB_DROP_CM = 0.5

/**
 * Her parça için ayrı `<mesh>` açmak yerine TEK geometride birleştirilir: bir
 * katta yüzlerce duvar parçası oluşuyor (her açıklık duvarı üçe bölüyor) ve
 * parça başına draw call ile kare süresi çizim büyüdükçe çöküyordu.
 *
 * Birleştirilen geometrilerin ömrü çağırana ait: değişince/sökülünce
 * `dispose()` edilmeli (bkz. `useDisposableGeometry`).
 */
function mergeAndDispose(parts: BufferGeometry[]): BufferGeometry | null {
  if (parts.length === 0) return null

  const merged = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  return merged
}

export function createBoxesGeometry(boxes: readonly SolidBox[]): BufferGeometry | null {
  const parts = boxes.map((box) => {
    // Kutunun yerel X'i eksen boyu, Z'si kalınlık: plan açısı three'de Y ekseni
    // etrafında AYNI işaretle dönüyor (ports.ts/SymbolInstance ile aynı yön).
    const geometry = new BoxGeometry(box.lengthCm, box.heightCm, box.widthCm)
    geometry.rotateY(box.angleDeg * DEG_TO_RAD)

    const [x, y, z] = planToThree(box.center, box.baseCm + box.heightCm / 2)
    geometry.translate(x, y, z)
    return geometry
  })

  return mergeAndDispose(parts)
}

/**
 * Baca şaftı / kolon havalandırması: kutu değil DÖNEL kütle. Dolusu da boşu da
 * AYNI yoldan (çember şeklinin çıkarılması) üretiliyor — silindir ilkesi
 * indeksli, çıkarma indekssiz tampon veriyor ve `mergeGeometries` ikisini bir
 * arada birleştiremiyor.
 */
export function createCylindersGeometry(
  cylinders: readonly SolidAreaCylinder[],
): BufferGeometry | null {
  const parts = cylinders.map((cylinder) => {
    const ring = new Shape().absarc(0, 0, cylinder.outerRadiusCm, 0, Math.PI * 2, false)
    if (cylinder.innerRadiusCm > 0) {
      // Delik TERS yönde dolanıyor: aynı yönde olsaydı üçgenleştirme onu delik
      // değil ikinci bir dolu disk sayardı.
      ring.holes.push(new Path().absarc(0, 0, cylinder.innerRadiusCm, 0, Math.PI * 2, true))
    }

    const geometry = new ExtrudeGeometry(ring, {
      depth: cylinder.heightCm,
      bevelEnabled: false,
      curveSegments: SHAFT_RADIAL_SEGMENTS,
    })
    // Çıkarma +Z'ye yapılıyor (şekil XY düzleminde); X'te −90° onu +Y'ye,
    // yani düşeye çeviriyor (zemindeki düzlemle aynı gerekçe).
    geometry.rotateX(-Math.PI / 2)
    const [x, y, z] = planToThree(cylinder.center, cylinder.baseCm)
    geometry.translate(x, y, z)
    return geometry
  })

  return mergeAndDispose(parts)
}

export function createPipesGeometry(
  segments: readonly SolidPipeSegment[],
): BufferGeometry | null {
  const parts: BufferGeometry[] = []

  for (const segment of segments) {
    const from = new Vector3(...planToThree(segment.from, segment.fromElevationCm))
    const to = new Vector3(...planToThree(segment.to, segment.toElevationCm))
    const axis = to.clone().sub(from)
    const lengthCm = axis.length()
    // Sıfır uzunluklu segment yön tanımlamaz (saf dikey bağlantının plan
    // izdüşümü değil, iki ucu da AYNI olan artık); çizilecek bir gövdesi yok.
    if (lengthCm === 0) continue

    const geometry = new CylinderGeometry(
      segment.radiusCm,
      segment.radiusCm,
      lengthCm,
      PIPE_RADIAL_SEGMENTS,
    )
    const quaternion = new Quaternion().setFromUnitVectors(
      CYLINDER_AXIS,
      axis.clone().normalize(),
    )
    const center = from.clone().add(to).multiplyScalar(0.5)
    geometry.applyMatrix4(new Matrix4().compose(center, quaternion, new Vector3(1, 1, 1)))
    parts.push(geometry)
  }

  return mergeAndDispose(parts)
}

/**
 * Döşemeler tek düz yüzey: `core/solidModel.ts` poligonu zaten üçgenlere
 * ayırdı, burada yalnız kota taşınıp tampona yazılıyor.
 */
export function createSlabsGeometry(slabs: readonly SolidSlab[]): BufferGeometry | null {
  const cornerCount = slabs.reduce((total, slab) => total + slab.triangleCorners.length, 0)
  if (cornerCount === 0) return null

  const positions = new Float32Array(cornerCount * 3)
  let offset = 0
  for (const slab of slabs) {
    for (const corner of slab.triangleCorners) {
      positions.set(planToThree(corner, slab.baseCm - SLAB_DROP_CM), offset)
      offset += 3
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  // Normal olmadan ışık yüzeyi hiç aydınlatmaz — düz yatay yüzeyde hepsi ±Y.
  geometry.computeVertexNormals()
  return geometry
}
