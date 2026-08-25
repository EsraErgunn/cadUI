import type { PlanPoint } from '../../core/coords'

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

/**
 * Bir etiketin kendi payından EN ÇOK ne kadar uzağa itilebileceği (yazı boyu
 * cinsinden). Sınırsız bırakılınca yoğun bir öbekteki etiketler birbirini
 * ite ite çizimden kopuyor, kılavuz çizgileri uzayıp gövdenin üstünden
 * geçiyordu (kullanıcı isteği, 2026-08: "etiketler dağılsın ama çok da
 * değil").
 *
 * ⚠️ Kısıt AYIRMAYI EZMEZ: geri çekmeyle aynı yerde, turun başında uygulanır.
 * Çok sıkışık bir öbekte etiket bu payı aşabilir — çakışmamak, paya sığmaktan
 * önce gelir.
 */
const MAX_PUSH_RATIO = 4

/**
 * Kısıtın uygulandığı tur sayısı — turların YARISI. Son turlar serbest
 * bırakılmazsa sıkışık bir öbek hiç oturmuyor: her tur ayrılan kutular geri
 * çekiliyor ve döngü çakışmalı bir durumda bitiyordu. Erken turlarda sınır
 * dağılmayı toplu tutuyor, son turlar çakışmayı bitiriyor.
 */
const CLAMP_PASSES = RELAX_PASSES / 2

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
  /** Çapaya olan İSTENEN uzaklık; itilme payı bunun üstüne binir. */
  clearanceCm: number
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
 * İzometrik etiket yerleşimi: her etiket KENDİ nesnesinin yanına konur,
 * çakışanlar itilerek ayrılır (K156).
 *
 * ⚠️ EKRAN da KÂĞIT da bunu kullanır (K167). Ekranda önce HALKA yerleşimi
 * vardı; etiket sayısı arttıkça çember büyüyor, çizim ortada küçülüyor ve her
 * etiketten çizimin üstünden bir kesikli kılavuz iniyordu — kullanıcı önce
 * kâğıtta, sonra ekranda bunu kaldırttı ("etiketler daha toplu dursun, üst
 * üste gelmesin"). Halka yerleşimi (`layoutIsometricLabels`) SİLİNDİ, bu adla
 * yeni kod yazma.
 *
 * Kutu ölçüleri ÇAĞIRANDAN gelir: kâğıtta punto sabit, ekranda yazı
 * ekran-sabit boyda (px/zoom) ve iki tarafın karakter genişliği/satır yüksekliği
 * oranları da farklı.
 *
 * Dönen değer çapaya göre KAYMA (cm) — `isometricLabelOffsetCm` ile aynı uzay,
 * böylece kullanıcının elle taşıdığı değer aynı yere yazılabiliyor.
 *
 * ⚠️ Ayırma SINIRLI (`MAX_PUSH_RATIO`): etiket kendi payından en çok birkaç
 * satır boyu uzaklaşır. Sınırsız itmede yoğun öbekler çizimden kopuyordu.
 */
export function layoutLabelsBesideAnchors(
  boxes: readonly LabelBox[],
  sceneCenter: PlanPoint,
  labelSizeCm: number,
): Map<string, PlanPoint> {
  const gapCm = labelSizeCm * ANCHOR_GAP_RATIO
  const paddingCm = labelSizeCm * BOX_PADDING_RATIO
  const maxPushCm = labelSizeCm * MAX_PUSH_RATIO

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
    return { box, center, preferred: { ...center }, clearanceCm }
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

        // İtilme payı SINIRLI (`MAX_PUSH_RATIO`): etiket çizimden kopmasın.
        // Geri çekmeyle AYNI yerde, yani ayırmadan ÖNCE — turun son işlemi
        // kısıtlama olsaydı ayrılan kutuları geri bindirirdi (yukarıdaki
        // uyarının aynısı; sınırlama ilk yazılışında bu hataya düşmüştü ve
        // etiketler üst üste kalıyordu).
        if (pass >= CLAMP_PASSES) continue

        const dx = item.center.x - item.box.anchor.x
        const dy = item.center.y - item.box.anchor.y
        const distanceCm = Math.hypot(dx, dy)
        const maxDistanceCm = item.clearanceCm + maxPushCm
        if (distanceCm <= maxDistanceCm || distanceCm < Number.EPSILON) continue

        const scale = maxDistanceCm / distanceCm
        item.center.x = item.box.anchor.x + dx * scale
        item.center.y = item.box.anchor.y + dy * scale
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
