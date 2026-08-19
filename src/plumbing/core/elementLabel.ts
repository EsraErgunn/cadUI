import { getElementWorldCorners, type SymbolMetadataLookup } from './elementPicking'
import type { InstallationElement } from './installationModel'
import type { InstallationElementType, SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import { isPointInRect, type PlanRect } from '../../core/selection'

/** Etiket yazısı ekran-sabit boyda (ölçü etiketiyle aynı gerekçe, bkz. LengthLabels). */
export const ELEMENT_LABEL_SIZE_PX = 12
/** Varsayılan etiket, sembol kutusunun bu kadar üstünde durur (ekran pikseli). */
const LABEL_MARGIN_PX = 16
/** Roboto ~0.6em ortalama karakter genişliği — tutma kutusu kabaca yazı kadar. */
const LABEL_CHAR_WIDTH_PX = 7.2
/** Tutma kutusuna eklenen pay: yazının tam sınırına nişan almak gerekmesin. */
const LABEL_HIT_PADDING_PX = 3
/** Troika'nın varsayılan satır yüksekliği ~1.15em — tutma kutusu bunu izler. */
const LABEL_LINE_HEIGHT_RATIO = 1.2

/**
 * Marka/model/açıklama alanları TÜRE göre değişir (elementProperties.ts) —
 * ortak bir "detay" tipi yok, her tür kendi opsiyonel alt kümesini taşır.
 * Etiket metni bu üç alanı, hangileri DOLUYSA, isme ekler.
 */
type ElementLabelDetails = { brand?: string; model?: string; description?: string }

function getElementLabelDetails(element: InstallationElement): ElementLabelDetails {
  switch (element.type) {
    case 'regulator':
      return element.regulator ?? {}
    case 'filterKit':
      return element.filterKit ?? {}
    case 'solenoidValve':
      return element.solenoidValve ?? {}
    case 'strainerMeter':
      return element.strainerMeter ?? {}
    case 'insulation':
      return element.insulation ?? {}
    case 'stove':
      return element.stove ?? {}
    case 'spaceHeater':
      return element.spaceHeater ?? {}
    case 'combiBoiler':
      return element.combiBoiler ?? {}
    case 'waterHeater':
      return element.waterHeater ?? {}
    case 'boiler':
      return element.boiler ?? {}
    case 'otherAppliance':
      return element.otherAppliance ?? {}
    case 'valve':
    case 'gasMeter':
    case 'manometer':
    case 'serviceBox':
      return {}
  }
}

/**
 * Etiket metni: isim + (girildiyse) marka + model + açıklama, alt alta. Boş
 * bırakılan alan satır olarak HİÇ gözükmez — sondaki `\n\n` gibi boşluklar
 * doğmasın diye `trim()`den sonra süzülür (kullanıcı isteği, 2026-08).
 */
export function getElementLabelText(
  element: InstallationElement,
  metadata: SymbolMetadata,
): string {
  const details = getElementLabelDetails(element)
  return [metadata.label, details.brand, details.model, details.description]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\n')
}

/**
 * Etiketi GÖSTERİLMEYEN türler. Vana hemen her sayaç/cihazla otomatik geldiği
 * için etiketi çizimi kalabalıklaştırıyor. Çizim de tutma sınavı da bu tek
 * kuraldan okur — ayrışsalar görünmez bir etiket tutulabilir olurdu.
 */
const UNLABELED_ELEMENT_TYPES: readonly InstallationElementType[] = ['valve']

export function hasElementNameLabel(type: InstallationElementType): boolean {
  return !UNLABELED_ELEMENT_TYPES.includes(type)
}

/**
 * Elemanın dönmüş/ölçeklenmiş dünya kutusu — etiket varsayılanı ve kılavuz
 * çizgisinin başlangıcı bu kutudan türer. Sembol dönse de etiket dik kalır,
 * bu yüzden yerel değil DÜNYA kutusu kullanılır.
 */
export function getElementWorldBoundsCm(
  element: InstallationElement,
  metadata: SymbolMetadata,
): PlanRect {
  const corners = getElementWorldCorners(element, metadata)
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  }
}

export function getElementWorldCenterCm(
  element: InstallationElement,
  metadata: SymbolMetadata,
): PlanPoint {
  const bounds = getElementWorldBoundsCm(element, metadata)
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

/**
 * Etiketin eleman konumuna göre etkin kayması: kullanıcı taşıdıysa saklanan
 * değer, taşımadıysa sembol kutusunun üstü. Varsayılan pay ekran pikselinden
 * çevrilir (px/zoom) — yazı ekran-sabit boyda olduğu için pay da öyle olmalı,
 * yoksa uzak zoom'da büyüyen yazı sembolün üstüne binerdi.
 */
export function getElementLabelOffsetCm(
  element: InstallationElement,
  metadata: SymbolMetadata,
  zoom: number,
): PlanPoint {
  if (element.labelOffsetCm) return element.labelOffsetCm

  const bounds = getElementWorldBoundsCm(element, metadata)
  return {
    x: (bounds.minX + bounds.maxX) / 2 - element.position.x,
    y: bounds.maxY + (LABEL_MARGIN_PX + ELEMENT_LABEL_SIZE_PX / 2) / zoom - element.position.y,
  }
}

/** Etiket yazısının merkezi (plan cm). */
export function getElementLabelAnchorCm(
  element: InstallationElement,
  metadata: SymbolMetadata,
  zoom: number,
): PlanPoint {
  const offset = getElementLabelOffsetCm(element, metadata, zoom)
  return { x: element.position.x + offset.x, y: element.position.y + offset.y }
}

/**
 * Etiketin tutma kutusu. Troika yazıyı ölçmeden kaba karakter genişliğiyle
 * kestirilir — tutma sınavı saf kalsın diye render'dan ölçü sızdırılmaz;
 * birkaç piksellik sapma pay ile kapanır.
 */
export function getElementLabelRectCm(anchor: PlanPoint, label: string, zoom: number): PlanRect {
  const lines = label.split('\n')
  const widestLineLength = Math.max(...lines.map((line) => line.length))
  const halfWidthCm =
    (Math.max(widestLineLength * LABEL_CHAR_WIDTH_PX, ELEMENT_LABEL_SIZE_PX) / 2 +
      LABEL_HIT_PADDING_PX) /
    zoom
  const halfHeightCm =
    ((lines.length * ELEMENT_LABEL_SIZE_PX * LABEL_LINE_HEIGHT_RATIO) / 2 + LABEL_HIT_PADDING_PX) /
    zoom
  return {
    minX: anchor.x - halfWidthCm,
    minY: anchor.y - halfHeightCm,
    maxX: anchor.x + halfWidthCm,
    maxY: anchor.y + halfHeightCm,
  }
}

/**
 * İmlecin altındaki etiketin elemanı. Üst üste binenlerde SONUNCU kazanır
 * (pickElementAt ile aynı kural: dizinin sonu en üstte çizilen).
 */
export function pickElementLabelAt(
  point: PlanPoint,
  elements: readonly InstallationElement[],
  getMetadata: SymbolMetadataLookup,
  zoom: number,
): InstallationElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]
    if (!hasElementNameLabel(element.type)) continue
    const metadata = getMetadata(element.type)
    const anchor = getElementLabelAnchorCm(element, metadata, zoom)
    const label = getElementLabelText(element, metadata)
    if (isPointInRect(point, getElementLabelRectCm(anchor, label, zoom))) {
      return element
    }
  }
  return null
}

// Kılavuz kırpması `core/labelLeader.ts`'e TAŞINDI: mimari alan nesnesinin ad
// etiketi de aynı hesabı istiyor ve fay sınırı yüzünden buradan import edemezdi.
// Çağıranların yolu değişmesin diye buradan yeniden dışa aktarılıyor
// (`plumbing/scene/useCameraZoom.ts` ile aynı desen).
export { clipLeaderEndToRectCm } from '../../core/labelLeader'
