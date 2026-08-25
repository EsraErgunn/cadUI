import { describe, expect, it } from 'vitest'

import { planToThree, type PlanPoint, type ThreePosition } from '../../../core/coords'
import { getObliqueProjection, ISOMETRIC_ANGLES_DEFAULT } from '../isometricProjection'

/**
 * PAFTANIN eksen sözleşmesi (K155). Kullanıcının elindeki gerçek gaz paftası ve
 * ona ait kat planları ölçülerek belirlendi; iki belge de aynı şeyi söylüyor:
 *
 *                     +Z (kot)
 *                      |
 *                      |
 *  +X (plan x) ────────●
 *                     /
 *                    /  30°
 *                  +Y (plan y)
 *
 * ⚠️ Bu bir izometri DEĞİL, oblik izdüşüm. İzometride üç eksen eşit kısalır ve
 * kot dikeyken bu, kalan iki ekseni ±30°'ye zorlar — yani hiçbir eksen yatay
 * OLAMAZ. Referans paftada yatay segmentler var; kâğıt referansa uyuyor.
 *
 * ⚠️ +X SOLA bakar (K165). Eskiden sağa bakıyordu ve pafta plana göre
 * aynalanmış çıkıyordu: soldaki servis kutusu kâğıtta solda kalıp borusunu
 * sağa uzatıyordu. Doğrusu kutunun sağda, borunun sola gelmesi.
 */
const projection = getObliqueProjection()
const STEP_CM = 100

const project = (position: ThreePosition): PlanPoint => projection.project(position)

/** Bir yönün ÇİZİM açısı (derece, y YUKARI, sağ = 0°). */
function screenAngleDeg(from: PlanPoint, to: PlanPoint): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

function screenLength(from: PlanPoint, to: PlanPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

const end = (dxCm: number, dyCm: number, dzCm: number): PlanPoint =>
  project(planToThree({ x: dxCm, y: dyCm }, dzCm))

const origin = project(planToThree({ x: 0, y: 0 }, 0))

describe('kâğıt oblik izdüşümü: eksen yönleri', () => {
  // Kullanıcının saydığı 12 durum. Her biri iki ucun MATEMATİKSEL izdüşümünden
  // çıkıyor; kodda "xPipe/yPipe" gibi bir sınıflandırma yok, olmamalı da.
  const cases: ReadonlyArray<[name: string, d: readonly [number, number, number], deg: number]> = [
    ['+X', [STEP_CM, 0, 0], 180],
    ['-X', [-STEP_CM, 0, 0], 0],
    ['+Y', [0, STEP_CM, 0], -150],
    ['-Y', [0, -STEP_CM, 0], 30],
    ['+Z', [0, 0, STEP_CM], 90],
    ['-Z', [0, 0, -STEP_CM], -90],
  ]

  for (const [name, [dx, dy, dz], expectedDeg] of cases) {
    it(`${name} → ${expectedDeg}°`, () => {
      expect(screenAngleDeg(origin, end(dx, dy, dz))).toBeCloseTo(expectedDeg, 6)
    })
  }

  it('eğik eksen yatayla tam 30° yapar', () => {
    // Referans paftadaki uzun bağlantı ölçüldü: 30,1°.
    const y = end(0, STEP_CM, 0)
    expect(Math.abs(Math.atan2(y.y, y.x) * (180 / Math.PI)) - 180).toBeCloseTo(-30, 6)
  })

  it('yatay eksen KISALMAZ: oblik izdüşümün tanımı', () => {
    // İzometride üçü de kısalırdı; burada plan x gerçek boyunda kalıyor ve
    // "izometri değil" farkı ölçülebilir hâle geliyor.
    expect(screenLength(origin, end(STEP_CM, 0, 0))).toBeCloseTo(STEP_CM, 6)
    expect(screenLength(origin, end(0, 0, STEP_CM))).toBeCloseTo(STEP_CM, 6)
  })
})

describe('kâğıt oblik izdüşümü: yönelim plana uyar (K165)', () => {
  it('plan ayak izinin determinantı POZİTİF: pafta aynalanmış değil', () => {
    // Yönelimi söyleyen sayı bu. Kat planı paftasında +1 (plan x sağa, plan y
    // yukarı); oblikte işaret AYNI kalmalı, yoksa iki pafta ters ele oturur.
    // Eski izdüşümde −0,5 idi ve hata tam olarak buydu.
    const ex = end(STEP_CM, 0, 0)
    const ey = end(0, STEP_CM, 0)
    const determinant = (ex.x * ey.y - ex.y * ey.x) / (STEP_CM * STEP_CM)

    expect(determinant).toBeGreaterThan(0)
    expect(determinant).toBeCloseTo(0.5, 6)
  })

  it('planda SOLDAKİ servis kutusu kâğıtta SAĞDA kalır', () => {
    // Kullanıcının tarif ettiği durum: kutu solda, borusu sağa gidiyorsa
    // izdüşüm yanlış. Kâğıtta kutu sağda olmalı, boru sola gelmeli.
    const serviceBox = end(0, 0, 0)
    const pipeEndRightInPlan = end(STEP_CM, 0, 0)

    expect(pipeEndRightInPlan.x).toBeLessThan(serviceBox.x)
  })
})

describe('kâğıt oblik izdüşümü: bileşik yönler', () => {
  // Kullanıcının 7–10. durumları. Açı ELLE seçilmiyor, iki ucun izdüşümünden
  // kendiliğinden çıkıyor — bu yüzden beklenen değer de türetiliyor.
  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = 0.5

  const expected = (dx: number, dy: number, dz: number) =>
    (Math.atan2(dz + -dy * sin30, -dx + -dy * cos30) * 180) / Math.PI

  const cases: ReadonlyArray<[string, readonly [number, number, number]]> = [
    ['+X +Y', [STEP_CM, STEP_CM, 0]],
    ['-X +Y', [-STEP_CM, STEP_CM, 0]],
    ['+X -Y', [STEP_CM, -STEP_CM, 0]],
    ['-X -Y', [-STEP_CM, -STEP_CM, 0]],
    ['X/Y ilerlerken +Z', [STEP_CM, STEP_CM, STEP_CM]],
    ['X/Y ilerlerken -Z', [STEP_CM, STEP_CM, -STEP_CM]],
  ]

  for (const [name, [dx, dy, dz]] of cases) {
    it(`${name} iki ucun izdüşümünden doğal açıda çıkar`, () => {
      expect(screenAngleDeg(origin, end(dx, dy, dz))).toBeCloseTo(expected(dx, dy, dz), 6)
    })
  }

  it('X/Y ilerlerken +Z ile -Z yatay eksende AYNA', () => {
    const flat = end(STEP_CM, STEP_CM, 0)
    const up = end(STEP_CM, STEP_CM, STEP_CM)
    const down = end(STEP_CM, STEP_CM, -STEP_CM)

    expect(up.x).toBeCloseTo(flat.x, 6)
    expect(down.x).toBeCloseTo(flat.x, 6)
    expect(up.y - flat.y).toBeCloseTo(flat.y - down.y, 6)
  })
})

describe('kâğıt oblik izdüşümü: ölçü ve doğrusallık', () => {
  it('boru boyları ORANINI korur: şema yalnız yön diyagramı değil', () => {
    const short = screenLength(origin, end(0, STEP_CM, 0))
    const long = screenLength(origin, end(0, 3 * STEP_CM, 0))

    expect(long / short).toBeCloseTo(3, 6)
  })

  it('üç bileşeni de değişen boru TEK doğru olarak çıkar', () => {
    const from = end(0, 0, 0)
    const to = end(300, 200, 150)
    const middle = end(150, 100, 75)

    const cross =
      (to.x - from.x) * (middle.y - from.y) - (to.y - from.y) * (middle.x - from.x)
    expect(cross).toBeCloseTo(0, 6)
  })

  it('ÖTELEME izdüşümü kaydırır ama yönü ve boyu değiştirmez', () => {
    const shifted = (dx: number, dy: number, dz: number) =>
      project(planToThree({ x: 500 + dx, y: 700 + dy }, 250 + dz))

    const base = shifted(0, 0, 0)
    expect(screenAngleDeg(base, shifted(STEP_CM, 0, 0))).toBeCloseTo(180, 6)
    expect(screenLength(base, shifted(0, STEP_CM, 0))).toBeCloseTo(
      screenLength(origin, end(0, STEP_CM, 0)),
      6,
    )
  })
})

describe('kaydırma sözleşmesi', () => {
  it('project(offsetToWorld(o)) === o: elle ayrılmış binmeler kaymaz', () => {
    // Kullanıcının sürükleyerek ayırdığı etiket/dal kaymaları 2B saklanıp
    // sahnede 3B uygulanıyor; bu eşitlik bozulursa kâğıtta yerlerinden oynarlar.
    for (const offset of [
      { x: 0, y: 0 },
      { x: 120, y: -45 },
      { x: -33.5, y: 210 },
    ]) {
      const world = projection.offsetToWorld(offset)
      const back = projection.project(world)
      expect(back.x).toBeCloseTo(offset.x, 9)
      expect(back.y).toBeCloseTo(offset.y, 9)
    }
  })
})

describe('kâğıt ekrandan bağımsız', () => {
  it('oblik hiçbir KAMERA açısıyla elde edilemez', () => {
    // Sözleşme testi: biri "ekranla aynı olsun" diye kâğıdı kamera izdüşümüne
    // geri bağlarsa burası kırılır. Ekran izometri gösteriyor (yatay eksen
    // KISALIR), kâğıt oblik (kısalmaz) — ikisi bilerek ayrı.
    const cameraX = ISOMETRIC_ANGLES_DEFAULT
    expect(cameraX.alphaDeg).toBeGreaterThan(0)
    expect(screenLength(origin, end(STEP_CM, 0, 0))).toBeCloseTo(STEP_CM, 6)
  })
})
