import { MOCK_REGIONS } from './adminFirmsMock'
import type {
  CreatedProject,
  CreateProjectPayload,
  GasFirmsForProjectFirmQuery,
  Lookup,
  ProjectListQuery,
  ProjectStatus,
  ProjectStatusCountsQuery,
  RawFirmEngineer,
  RawParametricOption,
  RawProjectListItem,
  SubmitProjectResult,
} from './projects'
import { includesTr } from './turkishText'

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

/** Üst bardaki bölge seçimi firma listesinin bölgelerini gösteriyor; iki mock aynı
    değer kümesini kullanmazsa bölge filtresi tarayıcıda hiçbir projeyi eşleştiremez. */
const MOCK_PROJECT_REGIONS = MOCK_REGIONS.slice(0, 4)

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
  region: string
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
      region: MOCK_PROJECT_REGIONS[index % MOCK_PROJECT_REGIONS.length],
      installationNo: `TN${900_000 + index * 13}`,
    })

    pId += P_ID_GAPS[index % P_ID_GAPS.length]
  }

  return projects
}

/** Sil/Gönder gerçekten listeyi değiştirsin diye değişebilir tutulur. */
let mockProjects = buildMockProjects()

/** ISO damgasının yalnız tarih parçası; aralık karşılaştırması gün bazlı. */
function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10)
}

function matchesFilters(project: MockProject, query: ProjectStatusCountsQuery): boolean {
  const updatedDate = toIsoDate(project.updatedAt)
  if (query.dateFrom !== null && updatedDate < query.dateFrom) return false
  if (query.dateTo !== null && updatedDate > query.dateTo) return false
  if (query.districtId !== null && project.districtId !== query.districtId) return false
  if (query.projectFirmId !== null && project.projectFirmId !== query.projectFirmId) return false
  if (query.region !== null && project.region !== query.region) return false

  if (query.search !== '') {
    const matchesSearch =
      includesTr(project.name, query.search) ||
      includesTr(project.pId, query.search) ||
      includesTr(project.installationNo, query.search)
    if (!matchesSearch) return false
  }

  return true
}

function compareProjects(
  left: MockProject,
  right: MockProject,
  query: ProjectListQuery,
): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortBy === 'name') return left.name.localeCompare(right.name, 'tr') * direction

  const leftValue = query.sortBy === 'createdAt' ? left.createdAt : left.updatedAt
  const rightValue = query.sortBy === 'createdAt' ? right.createdAt : right.updatedAt
  return leftValue.localeCompare(rightValue) * direction
}

/**
 * Sunucunun yapacağı işi taklit eder: filtre → sırala → SADECE istenen sayfayı
 * dilimle. Gerçek endpoint geldiğinde çağıran taraf değişmez, yalnız bu dosya silinir.
 */
export async function queryMockProjects(
  query: ProjectListQuery,
  signal?: AbortSignal,
): Promise<{ items: RawProjectListItem[]; totalCount: number }> {
  await sleep(MOCK_LATENCY_MS, signal)

  const matched = mockProjects.filter(
    (project) => project.status === query.status && matchesFilters(project, query),
  )
  const sorted = [...matched].sort((left, right) => compareProjects(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
  }
}

export async function queryMockProjectStatusCounts(
  query: ProjectStatusCountsQuery,
  signal?: AbortSignal,
): Promise<Record<ProjectStatus, number>> {
  await sleep(MOCK_LATENCY_MS, signal)

  const counts: Record<ProjectStatus, number> = {
    taslak: 0,
    onayBekleyen: 0,
    onaylanan: 0,
    reddedilen: 0,
  }
  for (const project of mockProjects) {
    if (matchesFilters(project, query)) counts[project.status] += 1
  }

  return counts
}

export async function deleteMockProject(id: number): Promise<void> {
  await sleep(MOCK_LATENCY_MS)
  mockProjects = mockProjects.filter((project) => project.id !== id)
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

export async function queryMockProjectFirms(
  region: string | null,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  if (region === null) return MOCK_PROJECT_FIRMS

  return MOCK_PROJECT_FIRMS.filter((firm) => MOCK_PROJECT_FIRM_REGIONS.get(firm.id) === region)
}

/** Proje firmasının bölgesi. Değerler MOCK_PROJECT_REGIONS'tan türetiliyor:
    elle yazılsaydı üst bardaki bölge listesinde karşılığı olmayan bir ad
    firmaları görünmez yapardı. */
const MOCK_PROJECT_FIRM_REGIONS = new Map<number, string>(
  MOCK_PROJECT_FIRMS.map((firm, index) => [
    firm.id,
    MOCK_PROJECT_REGIONS[index % MOCK_PROJECT_REGIONS.length],
  ]),
)

/** Proje firması → çalıştığı GD firmaları. Bir proje firması birden fazla GD
    firmasıyla çalışabilir, o yüzden dizi. */
const MOCK_GAS_FIRM_LINKS = new Map<number, number[]>([
  [11, [101, 102]],
  [12, [101]],
  [13, [102, 103]],
  [14, [103]],
  [15, [101, 103]],
])

/** GD firmasının bölgeleri, bağlı olduğu proje firmalarından türetilir: elle
    yazılsaydı "firma seçili ama bölgede GD firması yok" gibi çıkmaz bir kombinasyon
    üretilebilirdi. */
function gasFirmRegions(gasFirmId: number): string[] {
  const regions: string[] = []

  for (const [projectFirmId, gasFirmIds] of MOCK_GAS_FIRM_LINKS) {
    if (!gasFirmIds.includes(gasFirmId)) continue

    const region = MOCK_PROJECT_FIRM_REGIONS.get(projectFirmId)
    if (region !== undefined && !regions.includes(region)) regions.push(region)
  }

  return regions
}

export async function queryMockGasFirmsForProjectFirm(
  query: GasFirmsForProjectFirmQuery,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  const linkedIds = MOCK_GAS_FIRM_LINKS.get(query.projectFirmId) ?? []

  return MOCK_GAS_FIRMS.filter(
    (firm) =>
      linkedIds.includes(firm.id) &&
      (query.region === null || gasFirmRegions(firm.id).includes(query.region)),
  )
}

const MOCK_ENGINEER_NAMES: [string, string][] = [
  ['Ayşe', 'Yıldırım'], ['Mehmet', 'Kaya'], ['Elif', 'Demir'], ['Burak', 'Şahin'],
  ['Zeynep', 'Aydın'], ['Onur', 'Çelik'], ['Deniz', 'Arslan'], ['Selin', 'Koç'],
]

/** Her firmada bu kadar mühendis var ve SONUNCUSU pasif: pasif kullanıcının
    listeye girmediği tarayıcıda da görülebilsin. */
const ENGINEERS_PER_FIRM = 3
const FIRST_ENGINEER_ID = 501

interface MockEngineer extends RawFirmEngineer {
  projectFirmId: number
}

function buildMockEngineers(): MockEngineer[] {
  const engineers: MockEngineer[] = []

  MOCK_PROJECT_FIRMS.forEach((firm, firmIndex) => {
    for (let slot = 0; slot < ENGINEERS_PER_FIRM; slot += 1) {
      const nameIndex = (firmIndex * ENGINEERS_PER_FIRM + slot) % MOCK_ENGINEER_NAMES.length
      const [firstName, lastName] = MOCK_ENGINEER_NAMES[nameIndex]

      engineers.push({
        id: FIRST_ENGINEER_ID + engineers.length,
        firstName,
        lastName,
        isActive: slot < ENGINEERS_PER_FIRM - 1,
        projectFirmId: firm.id,
      })
    }
  })

  return engineers
}

const MOCK_ENGINEERS = buildMockEngineers()

/**
 * Kimliksiz mühendis sorgusu = proje firması kullanıcısı; gerçek uçta firma
 * token'dan türetilir, mock sabit bir firmayı oturumun firması sayar.
 * TODO(esra): gerçek uç bağlanınca bu sabit silinecek.
 */
const MOCK_TOKEN_PROJECT_FIRM_ID = 11

export async function queryMockFirmEngineers(
  projectFirmId?: number,
  signal?: AbortSignal,
): Promise<RawFirmEngineer[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  const firmId = projectFirmId ?? MOCK_TOKEN_PROJECT_FIRM_ID

  return MOCK_ENGINEERS.filter((engineer) => engineer.projectFirmId === firmId)
}

/** Etiketler `projects.ts`'teki PROJECT_TYPE_LABELS ile aynı ama oradan DEĞER
    alınamıyor (dosya başındaki döngüsel import notu). */
const MOCK_PROJECT_TYPE_OPTIONS: RawParametricOption[] = [
  { code: 'ILAVE', label: 'İlave' },
  { code: 'ILAVE_TADILAT', label: 'İlave Tadilat' },
  { code: 'KOLON', label: 'Kolon' },
  { code: 'KOLON_TADILAT', label: 'Kolon Tadilat' },
  { code: 'RUHSAT', label: 'Ruhsat' },
  // Ayarlar'dan sonradan eklenmiş tip: liste sunucudan geldiği için arayüz
  // yeniden yayınlanmadan görünür (kabul kriteri 6).
  { code: UNKNOWN_PROJECT_TYPE_CODE, label: 'Dönüşüm' },
]

const MOCK_HEATING_TYPE_OPTIONS: RawParametricOption[] = [
  { code: 'bireysel', label: 'Bireysel' },
  { code: 'merkezi', label: 'Merkezi' },
]

export async function queryMockProjectTypes(
  signal?: AbortSignal,
): Promise<RawParametricOption[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  return MOCK_PROJECT_TYPE_OPTIONS
}

export async function queryMockHeatingTypes(
  signal?: AbortSignal,
): Promise<RawParametricOption[]> {
  await sleep(MOCK_LATENCY_MS, signal)
  return MOCK_HEATING_TYPE_OPTIONS
}

/** Yeni projenin ilçesi formda sorulmuyor (adres serbest metin); kayıt ilçe
    filtresinde de görünsün diye ilk ilçe atanıyor. */
const CREATED_PROJECT_DISTRICT_ID = MOCK_DISTRICTS[0].id

/**
 * P_ID SUNUCUDA üretilir — istemci göndermez (kabul kriteri 7). Mock burada
 * sunucunun yerine geçtiği için numarayı o üretiyor.
 */
function nextMockPId(): string {
  const highest = mockProjects.reduce(
    (max, project) => Math.max(max, Number(project.pId) || 0),
    FIRST_P_ID,
  )
  return String(highest + 1)
}

export async function createMockProject(payload: CreateProjectPayload): Promise<CreatedProject> {
  await sleep(MOCK_LATENCY_MS)

  // Firma kimliği gelmediyse kullanıcı proje firması kullanıcısıdır; gerçek uçta
  // sunucu bunu token'dan türetir, mock oturumun firmasını sabit sayar.
  const projectFirmId = payload.projectFirmId ?? MOCK_TOKEN_PROJECT_FIRM_ID
  const projectFirm = MOCK_PROJECT_FIRMS.find((firm) => firm.id === projectFirmId)
  const gasFirm =
    MOCK_GAS_FIRMS.find((firm) => firm.id === payload.gasDistributionFirmId) ?? null
  const id = mockProjects.reduce((max, project) => Math.max(max, project.id), 0) + 1
  const pId = nextMockPId()
  const now = new Date().toISOString()

  // Yeni kayıt listenin başına: varsayılan sıralama son güncellenen üstte.
  mockProjects = [
    {
      id,
      pId,
      name: payload.name,
      firmName: projectFirm?.name ?? '',
      buildingCode: null,
      projectType: payload.projectType,
      heatingType: payload.heatingType,
      updatedAt: now,
      createdAt: now,
      gasFirmId: gasFirm?.id ?? null,
      gasFirmName: gasFirm?.name ?? null,
      hasDocuments: false,
      status: 'taslak',
      districtId: CREATED_PROJECT_DISTRICT_ID,
      projectFirmId,
      region: MOCK_PROJECT_FIRM_REGIONS.get(projectFirmId) ?? MOCK_PROJECT_REGIONS[0],
      installationNo: `TN${900_000 + id * 13}`,
    },
    ...mockProjects,
  ]

  return { id, pId, status: 'taslak' }
}
