import type {
  Lookup,
  ProjectStatus,
  RawProjectListItem,
  SubmitProjectResult,
} from './projects'

/**
 * Statü döngüsü burada yerel tanımlı: `projects.ts`'ten DEĞER almak döngüsel
 * import yaratıyor (projects → projectsMock → projects) ve mock listesi modül
 * yüklenirken kurulduğu için dizi henüz tanımsız oluyor. `adminFirmsMock` de
 * `adminFirms`'ten yalnız tip alıyor.
 */
const MOCK_STATUS_CYCLE: ProjectStatus[] = [
  'taslak', 'onayBekleyen', 'onaylanan', 'reddedilen',
]

const MOCK_LATENCY_MS = 320

/** Ağ gecikmesi taklidi. `signal` alır: React Query sorguyu iptal ettiğinde
    bekleyen mock da iptal olmalı, yoksa geç gelen cevap taze veriyi ezer. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

export const MOCK_DISTRICTS: Lookup[] = [
  { id: 1, name: 'Çankaya' }, { id: 2, name: 'Keçiören' }, { id: 3, name: 'Mamak' },
  { id: 4, name: 'Etimesgut' }, { id: 5, name: 'Yenimahalle' }, { id: 6, name: 'Sincan' },
]

export const MOCK_PROJECT_FIRMS: Lookup[] = [
  { id: 11, name: 'Anadolu Mühendislik Ltd. Şti.' },
  { id: 12, name: 'Beyaz Tesisat A.Ş.' },
  { id: 13, name: 'Doğuş Isı Sistemleri' },
  { id: 14, name: 'Ege Proje Mühendislik' },
  { id: 15, name: 'Yıldız Doğalgaz Tesisat' },
]

const MOCK_GAS_FIRMS: Lookup[] = [
  { id: 101, name: 'Başkent Doğalgaz Dağıtım A.Ş.' },
  { id: 102, name: 'İzmirgaz Şehiriçi Doğalgaz A.Ş.' },
  { id: 103, name: 'Bursagaz Gaz Dağıtım A.Ş.' },
]

const PROJECT_NAME_PREFIXES = [
  'Yıldız Apartmanı', 'Gül Sitesi B Blok', 'Papatya Konakları', 'Meşe Residence',
  'Zümrüt Apartmanı', 'Lale Sitesi A Blok', 'Çınar Evleri', 'Menekşe Apartmanı',
]

const PROJECT_TYPE_CODES = ['ILAVE', 'ILAVE_TADILAT', 'KOLON', 'KOLON_TADILAT', 'RUHSAT']

/** Bilinmeyen kodun rozeti patlatmadığını görebilmek için bilerek listede olmayan
    bir tip: sunucudaki tip listesi parametrik, arayüz her kodu tanımak zorunda değil. */
const UNKNOWN_PROJECT_TYPE_CODE = 'DONUSUM'

const MISSING_DOCUMENT_NAMES = [
  'Tapu fotokopisi', 'Yapı ruhsatı', 'Zemin etüt raporu',
  'Baca uygunluk belgesi', 'Vekaletname',
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Kayıtlar SABİT tarihle değil, modül yüklenirken "bugüne" göre üretilir:
 * ekranın varsayılan tarih aralığı son bir ay olduğu için sabit tarihli mock
 * ilk açılışta boş liste gösterirdi.
 */
const MOCK_BUILT_AT = Date.now()

/** Güncelleme tarihleri son ~2,5 aya yayılsın; bir kısmı varsayılan aralığın dışında kalsın. */
const UPDATED_DAY_OFFSETS = [0, 1, 2, 4, 6, 9, 12, 15, 19, 23, 28, 34, 41, 49, 58, 68]
/** Kayıt tarihi güncellemeden bu kadar gün önce. */
const CREATED_DAY_GAPS = [30, 45, 60, 90, 120, 160]

/** P_ID serbest biçimli metin; mock bugün düz rakam üretiyor — gerçek biçim
    (önek/sıfır dolgusu) netleşince yalnız burası değişir. */
const FIRST_P_ID = 24_100
const P_ID_GAPS = [1, 2, 1, 3, 1, 1, 4, 2]

/** Her 5. proje bina kodu almamış → tabloda "—" görünür. */
const NO_BUILDING_CODE_EVERY = 5
/** Her 4. proje henüz gaz dağıtım firmasına atanmamış. */
const NO_GAS_FIRM_EVERY = 4
/** Her 3. projede evrak eksik → "Gönder" akışı eksik evrak dalını gösterebilsin. */
const NO_DOCUMENTS_EVERY = 3

interface MockProject extends RawProjectListItem {
  status: ProjectStatus
  districtId: number
  projectFirmId: number
  /** Aramada geçer ama listede sütunu yok — arama proje adı, P_ID ve tesisat no üzerinde. */
  installationNo: string
}

function buildMockProjects(): MockProject[] {
  const projects: MockProject[] = []
  let pId = FIRST_P_ID

  for (let index = 0; index < 48; index += 1) {
    const prefix = PROJECT_NAME_PREFIXES[index % PROJECT_NAME_PREFIXES.length]
    const daysAgo = UPDATED_DAY_OFFSETS[index % UPDATED_DAY_OFFSETS.length]
    const updatedAt = new Date(MOCK_BUILT_AT - daysAgo * DAY_MS - index * 37 * 60 * 1000)
    const createdAt = new Date(
      updatedAt.getTime() - CREATED_DAY_GAPS[index % CREATED_DAY_GAPS.length] * DAY_MS,
    )
    const gasFirm = MOCK_GAS_FIRMS[index % MOCK_GAS_FIRMS.length]
    const hasGasFirm = index % NO_GAS_FIRM_EVERY !== 0

    projects.push({
      id: index + 1,
      pId: String(pId),
      name: `${prefix} ${1 + (index % 9)}. Kat Doğalgaz Tesisatı`,
      firmName: MOCK_PROJECT_FIRMS[index % MOCK_PROJECT_FIRMS.length].name,
      buildingCode:
        index % NO_BUILDING_CODE_EVERY === 0 ? null : `BK-${2000 + index * 7}`,
      projectType:
        index === 7
          ? UNKNOWN_PROJECT_TYPE_CODE
          : PROJECT_TYPE_CODES[index % PROJECT_TYPE_CODES.length],
      heatingType: index % 3 === 0 ? 'merkezi' : 'bireysel',
      updatedAt: updatedAt.toISOString(),
      createdAt: createdAt.toISOString(),
      gasFirmId: hasGasFirm ? gasFirm.id : null,
      gasFirmName: hasGasFirm ? gasFirm.name : null,
      hasDocuments: index % NO_DOCUMENTS_EVERY !== 0,
      status: MOCK_STATUS_CYCLE[index % MOCK_STATUS_CYCLE.length],
      districtId: MOCK_DISTRICTS[index % MOCK_DISTRICTS.length].id,
      projectFirmId: MOCK_PROJECT_FIRMS[index % MOCK_PROJECT_FIRMS.length].id,
      installationNo: `TN${900_000 + index * 13}`,
    })

    pId += P_ID_GAPS[index % P_ID_GAPS.length]
  }

  return projects
}

/**
 * Bu liste ARTIK PROJE LİSTESİ EKRANINI BESLEMİYOR — o ekran gerçek
 * `GET /api/projects`'ten geliyor. Geriye iki işi kaldı: "Onaya Gönder"in
 * (`submitMockProject`) üzerinde çalıştığı kayıtlar ve evrak/poliçe
 * mock'larının ortak proje tohumu (`getMockProjectSeeds`).
 */
const mockProjects = buildMockProjects()

/** Evrak satırlarının bağlanacağı proje künyesi; `MockProject`'in tamamı
    dışarı açılmasın diye dar tutuldu. */
export interface MockProjectSeed {
  id: number
  pId: string
  name: string
  firmName: string
  projectFirmId: number
  gasFirmName: string | null
  installationNo: string
}

/**
 * Evrak mock'u satırlarını BURADAN tohumluyor (`projectFirmUsersMock` deseni):
 * kendi proje listesini uydursaydı evrak tablosundaki "Proje Adı" bağlantısı
 * proje listesinde bulunmayan bir kimliğe giderdi.
 */
export function getMockProjectSeeds(): MockProjectSeed[] {
  return mockProjects.map((project) => ({
    id: project.id,
    pId: project.pId,
    name: project.name,
    firmName: project.firmName,
    projectFirmId: project.projectFirmId,
    gasFirmName: project.gasFirmName ?? null,
    installationNo: project.installationNo,
  }))
}

/** Evrağı eksik proje onaya gönderilemez; hangi evrakların eksik olduğu id'den türetilir. */
export async function submitMockProject(id: number): Promise<SubmitProjectResult> {
  await sleep(MOCK_LATENCY_MS)

  const project = mockProjects.find((candidate) => candidate.id === id)
  if (project === undefined) return { ok: true }

  if (!project.hasDocuments) {
    const firstIndex = id % MISSING_DOCUMENT_NAMES.length
    return {
      ok: false,
      missingDocuments: [
        MISSING_DOCUMENT_NAMES[firstIndex],
        MISSING_DOCUMENT_NAMES[(firstIndex + 1) % MISSING_DOCUMENT_NAMES.length],
      ],
    }
  }

  project.status = 'onayBekleyen'
  project.updatedAt = new Date().toISOString()
  return { ok: true }
}

export async function queryMockDistricts(signal?: AbortSignal): Promise<Lookup[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  return MOCK_DISTRICTS
}

export async function queryMockProjectFirms(signal?: AbortSignal): Promise<Lookup[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  return MOCK_PROJECT_FIRMS
}


