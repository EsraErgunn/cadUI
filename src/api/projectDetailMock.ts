import type {
  ProjectApprovalInfo,
  ProjectDetailExtras,
  ProjectDetailStatus,
  ProjectDocumentRow,
  ProjectFirmInfo,
  ProjectHistoryRow,
  ProjectPolicyRow,
  ProjectSpecs,
  ProjectUnitRow,
} from './projectDetail'

/**
 * Mock gövdeler. Alan adları ve tipleri cadapi'deki entity'lerden alındı
 * (`Project`, `ProjectUnit`, `Device`, `OperationHistory`, `Doc`, `Policy`):
 * bu tablolar veritabanında VAR, eksik olan yalnız controller. Şemayı taklit
 * etmek, uç açıldığında değişecek yeri `src/api/` içinde tutuyor (K46).
 *
 * Değerler tasarım mockup'ından alındı ki ekran gerçek bir kaydın oranlarıyla
 * görünsün. Kayıt kimliğine göre TÜRETİLİYOR — sabit olsaydı iki farklı proje
 * aynı tesisat numarasını gösterir ve mock olduğu ilk bakışta anlaşılmazdı.
 */

/** Kimlikten sapma üretir; rastgelelik yok, test çalıştırmaları arası kararlı. */
function seedOf(projectId: number): number {
  return projectId % 100
}

const MOCK_GAS_FIRMS = ['TOROSGAZ-KÜTAHYA', 'AKSA-BALIKESİR', 'ENERYA-KARAMAN']

const MOCK_ENGINEERS = ['AHMET AKBAYIR', 'FATMA ÇELİK', 'MEHMET YILMAZ']

function buildGeneralExtras(projectId: number, status: ProjectDetailStatus) {
  const seed = seedOf(projectId)

  return {
    zpdFileName: `${projectId}.zpd`,
    status,
    gasFirmName: MOCK_GAS_FIRMS[seed % MOCK_GAS_FIRMS.length],
    installationNo: String(115_000 + seed * 7),
    neighborhood: null,
    streetDoorNo: null,
    projectType: 'İLAVE',
    heatingType: 'Bireysel',
    isDetached: false,
    hasLicense: null,
  }
}

function buildFirmInfo(projectId: number): ProjectFirmInfo {
  const seed = seedOf(projectId)

  return {
    engineerName: MOCK_ENGINEERS[seed % MOCK_ENGINEERS.length],
    engineerRegistrationNo: String(870 + seed),
    title: 'Kütahya Test Firması',
    address: 'Altunizade Mahir İz Suat Sümer İş Merkezi',
    phone: '2164021000',
    competencyNo: String(110 + seed),
    taxOffice: '30 Ağustos',
    taxNumber: '2222222222',
    note: null,
  }
}

/**
 * Onaylanmamış projede alanların TAMAMI boş döner (KK-5). Kısmen dolu bir onay
 * kartı, onay akışının yarıda kaldığı izlenimi verirdi.
 */
function buildApprovalInfo(
  projectId: number,
  status: ProjectDetailStatus,
): ProjectApprovalInfo {
  if (status !== 'onaylanan') {
    return { approvedAt: null, approverName: null, approvalCode: null, note: null }
  }

  return {
    approvedAt: '2026-07-14T09:12:00.000Z',
    approverName: 'KONTROL MÜHENDİSİ',
    approvalCode: `ONY-${projectId}`,
    note: 'Proje uygundur.',
  }
}

function buildSpecs(projectId: number): ProjectSpecs {
  const seed = seedOf(projectId)

  return {
    meterCount: 1,
    floorCount: 7,
    residenceCount: 0,
    shopCount: 0,
    boxPressureMbar: 21,
    usagePressureMbar: 21,
    meterType: 'G4',
    floorPattern: '1+1+5',
    residenceShopPattern: '0 + 0',
    totalAreaSquareMeters: 2015 + seed,
    totalCapacity: 53.2,
    gasAreas: 'D20',
    renovationNote: null,
    orderNumber: null,
    connectionObject: null,
    workStartDate: '2026-01-17',
    workEndDate: '2026-04-17',
  }
}

export function buildMockProjectExtras(
  projectId: number,
  status: ProjectDetailStatus,
): ProjectDetailExtras {
  return {
    general: buildGeneralExtras(projectId, status),
    firm: buildFirmInfo(projectId),
    approval: buildApprovalInfo(projectId, status),
    specs: buildSpecs(projectId),
  }
}

/**
 * İlk birimde İKİ cihaz var: "çok cihazlı birimde birim bilgisi yalnız ilk
 * satırda" kuralı (KK-6) ancak böyle bir kayıtla görülebilir.
 */
export function buildMockProjectUnits(projectId: number): ProjectUnitRow[] {
  const seed = seedOf(projectId)

  return [
    {
      id: 1,
      unitNumber: 'D20',
      subscriberName: 'FATMA ÇELİK',
      subscriberNo: String(10_208_728 + seed),
      meterSerial: 'G4',
      flowCubicMeterPerHour: 3.5,
      pressureMbar: 21,
      areaSquareMeters: 64,
      pipeType: 'Fleks Boru (GFS)',
      devices: [
        {
          id: 11,
          name: 'Ocak',
          capacityKcalPerHour: 13_200,
          flowCubicMeterPerHour: 1.6,
          brand: null,
          model: null,
          flueType: 'AÇIK',
        },
        {
          id: 12,
          name: 'Kombi',
          capacityKcalPerHour: 20_640,
          flowCubicMeterPerHour: 2.5,
          brand: 'BOSCH',
          model: 'Condens 1200 W GC1200W 24 C 23.24 kW',
          flueType: 'HERMETİK',
        },
      ],
    },
    {
      id: 2,
      unitNumber: 'D21',
      subscriberName: 'HASAN DEMİR',
      subscriberNo: String(10_208_800 + seed),
      meterSerial: 'G4',
      flowCubicMeterPerHour: 2.5,
      pressureMbar: 21,
      areaSquareMeters: 58,
      pipeType: 'Fleks Boru (GFS)',
      devices: [
        {
          id: 21,
          name: 'Kombi',
          capacityKcalPerHour: 20_640,
          flowCubicMeterPerHour: 2.5,
          brand: 'VAILLANT',
          model: 'ecoTEC plus',
          flueType: 'HERMETİK',
        },
      ],
    },
  ]
}

/** En yeniden eskiye sıralı (KK-8); sıralama mock'ta değil, veri sırasında. */
export function buildMockProjectHistory(projectId: number): ProjectHistoryRow[] {
  const engineer = MOCK_ENGINEERS[seedOf(projectId) % MOCK_ENGINEERS.length]

  return [
    {
      id: 2,
      fileType: 'pdf',
      createdAt: '2026-07-10T11:36:53.000Z',
      userName: engineer,
      roleSnapshot: 'Zetacad USER',
      operation: 'projeGuncelleme',
      description: null,
    },
    {
      id: 1,
      fileType: 'zpd',
      createdAt: '2026-07-10T11:28:28.000Z',
      userName: engineer,
      roleSnapshot: 'Zetacad USER',
      operation: 'projeKayit',
      description: 'Proje Adı: TEST PROJESİ 2',
    },
  ]
}

/**
 * Evrak ve poliçe listeleri BOŞ dönüyor: mockup'ta da boş durum gösteriliyor ve
 * KK-9'un asıl istediği bilgilendirme kutusu. Dolu bir liste uydurmak, olmayan
 * bir evrakın indirilebilir sanılmasına yol açardı.
 */
export function buildMockProjectDocuments(): ProjectDocumentRow[] {
  return []
}

export function buildMockProjectPolicies(): ProjectPolicyRow[] {
  return []
}
