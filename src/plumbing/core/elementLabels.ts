import type { InstallationLineKind } from './installationModel'
import type { InstallationElementType } from './symbolMetadata'

/**
 * Panel başlığında kullanılan Türkçe adlar. INSTALLATION_TOOLS'taki etiketlerden
 * TÜRETİLMEDİ: oradaki "Servis Kutusu Ekle" gibi fiil ekleri panel başlığına
 * ("Servis Kutusu Özellikleri") uymuyor, elle tutulan ayrı bir liste daha az
 * sürpriz çıkarıyor.
 */
export const INSTALLATION_ELEMENT_TYPE_LABELS: Record<InstallationElementType, string> = {
  serviceBox: 'Servis Kutusu',
  regulator: 'Regülatör',
  gasMeter: 'Sayaç',
  strainerMeter: 'Süzme Sayaç',
  manometer: 'Manometre',
  filterKit: 'Filtre',
  valve: 'Vana',
  solenoidValve: 'Solenoid Vana',
  stove: 'Ocak',
  spaceHeater: 'Soba',
  waterHeater: 'Şofben',
  combiBoiler: 'Kombi',
  boiler: 'Kazan',
  otherAppliance: 'Diğer Yakıcı Cihaz',
  insulation: 'İzolasyon',
}

/**
 * `applianceStub` (cihaz kolu) araç paletinde YOK — yerleştirme sırasında
 * otomatik doğan bir bağlantı parçası, kullanıcının bilerek seçtiği bir tür
 * değil. Yine de Record TAM tutulur (Partial değil): stub bir hat olarak
 * seçilebiliyorsa (bkz. plumbingSelection.md) başlık üretimi undefined'a
 * düşüp kırılmasın — kendi özellik formu bu adımda YOK, yalnız başlık var.
 */
export const INSTALLATION_LINE_KIND_LABELS: Record<InstallationLineKind, string> = {
  pipe: 'Boru',
  branch: 'Branşman',
  chimney: 'Baca',
  ventilationDuct: 'Havalandırma Kanalı',
  applianceStub: 'Cihaz Kolu',
}
