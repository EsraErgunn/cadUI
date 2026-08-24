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
    address: string
    blockLotParcel: string
    projectType: string
    heatingType: string
    floorCount: string
    residenceCount: string
    shopCount: string
    totalAreaSquareMeters: string
  }
  /**
   * Projeyi oluşturan kişi; kaşe kutusunun altına adı ve firmasının ünvanı
   * yazılır. Kayıt/yeterlilik numaraları KALKTI (K159): ikisinin de sunucuda
   * karşılığı yok — yeter no uçtan kaldırılmış, GDF kayıt no ise projeye değil
   * kullanıcının yetki kaydına bağlı.
   */
  designer: {
    name: string
  }
  firm: {
    title: string
    address: string
    phone: string
    /** Vergi DAİRESİ yok: `GET /api/projectfirms/{id}` yalnız numarayı taşıyor. */
    taxNumber: string
  }
  /** Dağıtım şirketi onayı; onayın KENDİSİ değil, kutuya yazılan künye. */
  approval: {
    gasFirmName: string
    /** Projeyi ONAYLAYAN kişi; onaylanmamış projede boş. */
    approverName: string
    /**
     * Dağıtım şirketinin YETKİLİSİ. Onaylayandan ayrı tutuluyor: kaşe kutusu bir
     * imza yeri, "ONAYLAYAN" satırı ise gerçekleşmiş bir işlem. Yetkiliyi
     * onaylayan diye yazmak, onaylanmamış projede olmayan bir onayı ima ederdi.
     */
    gasFirmContactPerson: string
  }
}

/** Boş olanları eleyerek kaşe kutusunun alt satırlarını kurar. */
function toStampLines(...values: readonly string[]): string[] {
  return values.filter((value) => value !== '')
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
      // MAHALLESİ, SOKAK/KAPI NO ve TESİSAT NO satırları KALKTI (K159):
      // üçünün de sunucuda karşılığı yoktu. Adresin tamamı ADRESİ satırında,
      // il/ilçe zaten ayrı.
      [
        { label: 'İLİ', value: building.city },
        { label: 'İLÇESİ', value: building.district },
        { label: 'ADA-PAFTA-PARSEL', value: building.blockLotParcel },
      ],
      [
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
      [{ label: 'PROJE TASARIMCISI', value: designer.name }],
      // İmza ELLE atılır: kutu bilerek boş, adın hemen altında.
      [{ label: 'İMZA', value: '' }],
    ],
    firmFields: [
      [
        { label: 'ÜNVANI', value: firm.title },
        { label: 'VERGİ NO', value: firm.taxNumber },
      ],
      [
        { label: 'ADRESİ', value: firm.address },
        { label: 'TELEFON', value: firm.phone },
      ],
    ],
    /** Kaşe kutusunun sağ altı: projeyi çizen kişi ve firması. */
    designerStampLines: toStampLines(designer.name, firm.title),
    /**
     * Onay kutusunun sağ altı: dağıtım şirketi ve kaşeyi imzalayacak kişi.
     * Onaylanmışsa ONAYLAYAN, değilse şirketin YETKİLİSİ — kutu her hâlükârda
     * kimin imzalayacağını göstersin (kullanıcı isteği, K159).
     */
    gasFirmStampLines: toStampLines(
      approval.gasFirmName,
      approval.approverName === '' ? approval.gasFirmContactPerson : approval.approverName,
    ),
  }
}
