import type { PlanPoint } from '../coords'

/**
 * Etiketin çapasına bırakılan boşluk, yazı boyu cinsinden. Yazıya değmeyecek
 * kadar, "bu etikete ait" okunuşunu bozmayacak kadar küçük.
 */
const ANCHOR_GAP_RATIO = 1.2

/** Çakışma çözümünde komşu kutular arasında bırakılan pay (yazı boyu cinsinden). */
const BOX_PADDING_RATIO = 0.5

/**
 * Çakışma çözümü tur sayısı. Her tur her çifti bir kez ayırıyor; ayırma
 * ötekini yeni bir çakışmaya sokabildiği için tekrar gerekiyor. Ölçüldü:
 * yoğun paftada 12 turda oturuyor, sonrası değişmiyor.
 */
const RELAX_PASSES = 24

/**
 * Ayırma turunda her kutunun çapasına geri çekilme oranı. Yalnız iterek
 * ayırmak etiketleri çizimden uzağa savuruyordu; her turda az miktarda geri
 * çekmek onları nesnelerinin YANINDA tutuyor.
 */
const ANCHOR_PULL = 0.08

export type LabelBox = {
  key: string
  /** Etiketin bağlı olduğu nesnenin çizim koordinatı (cm, y YUKARI). */
  anchor: PlanPoint
  widthCm: number
  heightCm: number
}

type Placed = {
  box: LabelBox
  /** Yazının merkezi (çapa değil). */
  center: PlanPoint
  preferred: PlanPoint
}

function isOverlapping(a: Placed, b: Placed, paddingCm: number): boolean {
  return (
    Math.abs(a.center.x - b.center.x) < (a.box.widthCm + b.box.widthCm) / 2 + paddingCm &&
    Math.abs(a.center.y - b.center.y) < (a.box.heightCm + b.box.heightCm) / 2 + paddingCm
  )
}

/**
 * Çapadan dışarı bakan birim yön. Sahne merkezinden uzaklaşan taraf seçiliyor:
 * etiket böylece gövdenin İÇİNE değil dışına doğru açılıyor ve boruların
 * üstüne binme olasılığı düşüyor. Çapa tam merkezdeyse yön belirsiz kalır,
 * sağa alınır.
 */
function getOutwardDirection(anchor: PlanPoint, center: PlanPoint): PlanPoint {
  const dx = anchor.x - center.x
  const dy = anchor.y - center.y
  const length = Math.hypot(dx, dy)
  if (length < Number.EPSILON) return { x: 1, y: 0 }
  return { x: dx / length, y: dy / length }
}

/**
 * Kâğıdın etiket yerleşimi: her etiket KENDİ nesnesinin yanına konur, çakışanlar
 * itilerek ayrılır (K156).
 *
 * ⚠️ Ekrandaki HALKA yerleşiminin (`layoutIsometricLabels`) yerine geçmez, onun
 * YANINDA durur — ekran dokunulmadan kaldı. Halka ekranda mantıklı: yazı
 * ekran-sabit boyutta, kullanıcı etiketi sürükleyebiliyor ve çizimden uzakta
 * durması gezinmeyi kolaylaştırıyor. Kâğıtta ise etiket sayısı arttıkça halka
 * büyüyor, çizim ortada küçülüyor ve her etiketten çizimin üstünden geçen bir
 * kesikli kılavuz iniyordu — kullanıcının şikâyet ettiği kalabalık buydu.
 * Referans paftada etiketler nesnelerinin yanında ve kılavuz yok.
 *
 * Dönen değer çapaya göre KAYMA (cm) — `isometricLabelOffsetCm` ile aynı uzay,
 * böylece kullanıcının elle taşıdığı değer aynı yere yazılabiliyor.
 */
export function layoutLabelsBesideAnchors(
  boxes: readonly LabelBox[],
  sceneCenter: PlanPoint,
  labelSizeCm: number,
): Map<string, PlanPoint> {
  const gapCm = labelSizeCm * ANCHOR_GAP_RATIO
  const paddingCm = labelSizeCm * BOX_PADDING_RATIO

  const placed: Placed[] = boxes.map((box) => {
    const direction = getOutwardDirection(box.anchor, sceneCenter)
    // Kutunun KENARI çapadan `gapCm` uzakta dursun: yarı genişlik/yükseklik
    // yönün kendi bileşenleri kadar katılıyor, yoksa geniş bir künye köşeye
    // yaklaşırken çapanın üstüne oturuyordu.
    const clearanceCm =
      gapCm +
      Math.abs(direction.x) * (box.widthCm / 2) +
      Math.abs(direction.y) * (box.heightCm / 2)
    const center = {
      x: box.anchor.x + direction.x * clearanceCm,
      y: box.anchor.y + direction.y * clearanceCm,
    }
    return { box, center, preferred: { ...center } }
  })

  for (let pass = 0; pass < RELAX_PASSES; pass += 1) {
    // ⚠️ Geri çekme AYIRMADAN ÖNCE. Tersi denendi ve sıkışık bir öbekte
    // (birbirine 40 cm'de beş künye) turun SON işlemi çekme olduğu için ayrılan
    // kutuları geri bindiriyordu — testte yakalandı. Bu sırayla döngüden her
    // çıkışta en son yapılan şey ayırma oluyor.
    if (pass > 0) {
      for (const item of placed) {
        item.center.x += (item.preferred.x - item.center.x) * ANCHOR_PULL
        item.center.y += (item.preferred.y - item.center.y) * ANCHOR_PULL
      }
    }

    let isSettled = true

    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i]
        const b = placed[j]
        if (!isOverlapping(a, b, paddingCm)) continue

        isSettled = false

        // EN AZ örtüşen eksende ayır: kutuları en kısa yoldan kurtarır, böylece
        // ikisi de kendi çapasına en yakın konumda kalır.
        const overlapX =
          (a.box.widthCm + b.box.widthCm) / 2 + paddingCm - Math.abs(a.center.x - b.center.x)
        const overlapY =
          (a.box.heightCm + b.box.heightCm) / 2 + paddingCm - Math.abs(a.center.y - b.center.y)

        if (overlapX < overlapY) {
          // Eşitlikte yön kararsız kalmasın diye anahtara göre sabit bir yön.
          const sign = a.center.x < b.center.x || (a.center.x === b.center.x && a.box.key < b.box.key) ? -1 : 1
          a.center.x += (sign * overlapX) / 2
          b.center.x -= (sign * overlapX) / 2
        } else {
          const sign = a.center.y < b.center.y || (a.center.y === b.center.y && a.box.key < b.box.key) ? -1 : 1
          a.center.y += (sign * overlapY) / 2
          b.center.y -= (sign * overlapY) / 2
        }
      }
    }

    if (isSettled) break
  }

  const offsets = new Map<string, PlanPoint>()
  for (const item of placed) {
    offsets.set(item.box.key, {
      x: item.center.x - item.box.anchor.x,
      y: item.center.y - item.box.anchor.y,
    })
  }
  return offsets
}
