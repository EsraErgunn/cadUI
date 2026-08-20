import { PIPE_TYPES } from '../../plumbing/core/pipeTypes'
import type { IsometricLineGeometry } from '../core/isometricModel'

/**
 * İzometrik tuvalin renkleri. `styles/index.css`'teki `@theme` token'larına
 * GİRMEZ: bunlar DOM değil WebGL renkleri (`sceneTheme.ts` /
 * `plumbingTheme.ts` ile aynı gerekçe). İki temada da AYNI kalır — çizim
 * yüzeyi tema değiştirmez, üstünde yüzen cam paneller değiştirir.
 */
export const ISOMETRIC_COLORS = {
  /**
   * Çok açık nötr gri. Beyaz DEĞİL (kullanıcı kararı): izometriğe girildiği
   * anında belli olsun ve DN kırmızısı/yeşili üstünde daha az yorsun.
   */
  background: '#f2f3f5',
  /** Katlar arası düşey bağlantı — hangi boruyu bağladığından bağımsız tek renk. */
  floorLink: '#7c3aed',
  /** Yakıcı cihaz kolu; plan görünümüyle aynı kırmızı (plumbingTheme). */
  applianceStub: '#ef4444',
  branchStub: '#1d4ed8',
  chimney: '#4b5563',
  ventilationDuct: '#0f766e',
  /**
   * Sürükleme tutamacı. Seçim mavisi (`sceneTheme.selection`) ile AYNI değer:
   * "tutulabilir" işareti tüm görünümlerde aynı renkten okunuyor.
   */
  handle: '#2d7ff9',
  label: '#1f2937',
  labelLeader: '#9aa3b0',
} as const

/**
 * Vurgulanmayan hatların opaklığı. Tam saydam DEĞİL: bağlam kaybolursa
 * kullanıcı vurgulanan hattın binanın neresinde olduğunu göremez.
 */
export const ISOMETRIC_DIMMED_OPACITY = 0.18

/**
 * Baca ve havalandırma kanallarının saydamlığı. En kalın gaz borusundan (DN100,
 * 11 cm) iki-üç kat kalınlar; opak çizilince arkalarındaki tesisatı tamamen
 * örtüyorlardı. Yarı saydamlıkta "içinden geçilen şaft" gibi okunuyorlar.
 */
export const ISOMETRIC_DISCHARGE_OPACITY = 0.42

/** Işık: gövde yuvarlaklığı okunsun diye yumuşak ortam + tek yönlü. */
export const ISOMETRIC_AMBIENT_INTENSITY = 0.85
export const ISOMETRIC_DIRECTIONAL_INTENSITY = 0.55

/**
 * Boruların metalik/pürüz değerleri: tam mat gövdede silindirler düz şerit gibi
 * görünüp üst üste binen hatlar ayırt edilemiyordu.
 */
export const ISOMETRIC_PIPE_METALNESS = 0.15
export const ISOMETRIC_PIPE_ROUGHNESS = 0.65

/**
 * Hattın rengi: gaz taşıyan boruda ÇAPTAN (K27), kol ve deşarj hatlarında
 * türden. Plan görünümüyle aynı renkler kullanılıyor — aynı hat iki görünümde
 * farklı renkte olsaydı kullanıcı ikisini eşleştiremezdi.
 */
export function getIsometricLineColor(geometry: IsometricLineGeometry): string {
  if (geometry.kind === 'applianceStub') return ISOMETRIC_COLORS.applianceStub
  if (geometry.kind === 'branchStub') return ISOMETRIC_COLORS.branchStub
  if (geometry.kind === 'chimney') return ISOMETRIC_COLORS.chimney
  if (geometry.kind === 'ventilationDuct') return ISOMETRIC_COLORS.ventilationDuct
  return PIPE_TYPES[geometry.pipeTypeName].colorHex
}
