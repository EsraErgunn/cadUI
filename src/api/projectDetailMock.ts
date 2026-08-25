import { getMockPolicies } from './policiesMock'
import type {
  ProjectApprovalInfo,
  ProjectDetailExtras,
  ProjectDetailStatus,
  ProjectFirmInfo,
  ProjectPolicyRow,
  ProjectSpecs,
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
 * Projenin poliçeleri. Kaynak, Poliçe Oluşturma ekranının BELLEKTEKİ deposuyla
 * AYNI (`policiesMock`): oluşturulan poliçe bu sekmede listeleniyor (KK-21) ve
 * bu ancak tek depo varsa doğru olur. Depo boş başlıyor — tohumlanmış poliçe
 * YOK, o yüzden hiç poliçe açılmamış projede sekme dürüstçe boş kalır.
 *
 * `unitNumber` ekranda toplanmıyor (sihirbaz birim sormuyor), boş bırakılıyor —
 * uydurulmuyor. Ödeme alanı YOK: sistemde ödeme akışı olmadığı için poliçe
 * oluşturulduğu anda onaylı sayılıyor, tablo durumu sabit gösteriyor.
 */
export function buildMockProjectPolicies(projectId: number): ProjectPolicyRow[] {
  return getMockPolicies()
    .filter((policy) => policy.projectId === projectId)
    .map((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      insuranceCompanyName: policy.insuranceCompanyName,
      projectUnitId: null,
      unitNumber: null,
      isUnitDeleted: false,
      amount: policy.amount,
      startDate: policy.startDate,
      endDate: policy.endDate,
    }))
}
