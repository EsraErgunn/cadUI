import type { PdfScaleId } from './paper'

/**
 * Kapağın gösterdiği künye.
 *
 * ⚠️ HER ALANIN BİR REFERANSI VAR: değeri ya proje DETAYINDAN (`ProjectDetail`)
 * ya da ÇİZİMDEN geliyor. Kapak katmanı hiçbir değer türetmiyor, varsaymıyor,
 * sabit yazmıyor — buraya "şuraya bir şey yazalım" diye alan eklenmez.
 *
 * Detay alanlarının bir kısmı bugün `ProjectDetail.extras` altında ve o nesne
 * geliştirmede yer tutucu, üretimde `null` (K50/K51). Bu bir sorun DEĞİL, bir
 * ara durum: proje firması ve gaz dağıtım kullanıcı ekranları sunucuya
 * eklenince aynı tesisat gerçek değerleri taşıyacak. Kapak tarafında
 * değişiklik gerekmiyor — bağlantı zaten kurulu.
 */
export type CoverPageInfo = {
  /** Logo görseli yüklenemezse kutuya yazılacak yedek metin. */
  appName: string
  projectName: string
  projectNumber: string
  /** Kullanıcının dışa aktarma penceresinde seçtiği ölçek. */
  scale: PdfScaleId
  /** Baskı tarihi; çağıran verir ki test saate bağlı olmasın. */
  printedAt: Date
  /**
   * Tesisat özeti — ÇİZİMDEN hesaplanıyor (`installationSummary.ts`):
   * kullanıcının koyduğu sayaç, bağladığı cihaz, girdiği debi ve basınç.
   */
  installation: {
    meterCount: string
    deviceCount: string
    totalFlowCubicMeterPerHour: string
    usagePressure: string
  }
  building: {
    city: string
    district: string
    neighborhood: string
    streetDoorNo: string
    address: string
    blockLotParcel: string
    installationNo: string
    projectType: string
    heatingType: string
    floorCount: string
    residenceCount: string
    shopCount: string
    totalAreaSquareMeters: string
  }
  /** Projeyi çizen kişi; kaşe kutusunun altına adı ve firmasının ünvanı yazılır. */
  designer: {
    name: string
    /** Mühendisin gaz dağıtım firmasındaki kayıt numarası. */
    registrationNo: string
    /** Yeter No — yeterlilik belgesi numarası. */
    competencyNo: string
  }
  firm: {
    title: string
    address: string
    phone: string
    taxOffice: string
    taxNumber: string
  }
  /** Dağıtım şirketi onayı; onayın KENDİSİ değil, kutuya yazılan künye. */
  approval: {
    gasFirmName: string
    approverName: string
  }
}

/** Boş olanları eleyerek kaşe kutusunun alt satırlarını kurar. */
function toStampLines(...values: readonly string[]): string[] {
  return values.filter((value) => value !== '')
}

/** Detay ekranındaki "Vergi D. / Vergi No" satırının aynısı. */
function joinTax(office: string, number: string): string {
  if (office === '' && number === '') return ''
  return `${office === '' ? '—' : office} / ${number === '' ? '—' : number}`
}

/**
 * Kapak tablosunun İÇERİĞİ: hangi etiketin altına künyenin hangi alanı yazılıyor.
 *
 * Yerleşimden (`coverPage.ts`) ayrı duruyor çünkü ikisi ayrı sebeplerle
 * değişiyor: buraya alan eklenir/çıkarılır, oraya kâğıt ve bant düzeni yazılır.
 * Etiketler proje DETAY EKRANINDAKİ adların aynısı — kâğıtla ekran arasında
 * kullanıcıyı ikinci bir sözlük öğrenmeye zorlamamak için.
 */
export function getCoverFields(info: CoverPageInfo) {
  const { installation, building, designer, firm, approval } = info

  return {
    // Tesisat satırı kaşe kutularının HEMEN ALTINDA ve başlıksız: tek satır,
    // kendi bölümünü açacak kadar dolu değil. Dördü de ÇİZİMDEN geliyor.
    installationFields: [
      [
        { label: 'SAYAÇ ADEDİ', value: installation.meterCount },
        { label: 'CİHAZ ADEDİ', value: installation.deviceCount },
        { label: 'TOPLAM DEBİ (m³/h)', value: installation.totalFlowCubicMeterPerHour },
        { label: 'KULLANIM BASINCI', value: installation.usagePressure },
      ],
    ],
    buildingFields: [
      [
        { label: 'İLİ', value: building.city },
        { label: 'İLÇESİ', value: building.district },
        { label: 'MAHALLESİ', value: building.neighborhood },
        { label: 'ADA-PAFTA-PARSEL', value: building.blockLotParcel },
      ],
      [
        { label: 'SOKAK / KAPI NO', value: building.streetDoorNo },
        { label: 'TESİSAT NO', value: building.installationNo },
        { label: 'PROJE TİPİ', value: building.projectType },
        { label: 'ISINMA TİPİ', value: building.heatingType },
      ],
      // Adres tek başına bir satır: bölünürse okunmuyor.
      [{ label: 'ADRESİ', value: building.address }],
      [
        { label: 'KAT ADEDİ', value: building.floorCount },
        { label: 'MESKEN ADEDİ', value: building.residenceCount },
        { label: 'DÜKKAN ADEDİ', value: building.shopCount },
        { label: 'TOPLAM ALAN (m²)', value: building.totalAreaSquareMeters },
      ],
    ],
    designerFields: [
      [
        { label: 'ADI SOYADI', value: designer.name },
        { label: 'MÜH. GDF KAYIT NO', value: designer.registrationNo },
      ],
      [
        // İmza ELLE atılır: kutu bilerek boş, adı soyadının hemen altında.
        { label: 'İMZA', value: '' },
        { label: 'YETER NO', value: designer.competencyNo },
      ],
    ],
    firmFields: [
      [
        { label: 'ÜNVANI', value: firm.title },
        { label: 'VERGİ D. / VERGİ NO', value: joinTax(firm.taxOffice, firm.taxNumber) },
      ],
      [
        { label: 'ADRESİ', value: firm.address },
        { label: 'TELEFON', value: firm.phone },
      ],
    ],
    /** Kaşe kutusunun sağ altı: projeyi çizen kişi ve firması. */
    designerStampLines: toStampLines(designer.name, firm.title),
    /** Onay kutusunun sağ altı: dağıtım şirketi ve onaylayan mühendis. */
    gasFirmStampLines: toStampLines(approval.gasFirmName, approval.approverName),
  }
}
