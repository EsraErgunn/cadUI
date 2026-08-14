import type { DocumentRow, DocumentUpload } from './documents'
import type { ProjectSummary } from './projectDetailTypes'
import { getMockProjectSeeds, type MockProjectSeed } from './projectsMock'

/**
 * Evrak listesinin BELLEKTEKİ kaynağı. Sunucu tarafı yazılana kadar tek veri
 * deposu burası: yüklenen evrak listeye gerçekten giriyor ama SAYFA YENİLENİNCE
 * KAYBOLUYOR — kalıcılık için veritabanı gerekiyor.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const MOCK_BUILT_AT = Date.now()

/** Tohumlanan evraklar son bir aya dağılıyor: liste varsayılan tarih aralığıyla
    ("son bir ay") açıldığında boş görünmesin. */
const RECEIVED_DAY_OFFSETS = [0, 1, 2, 3, 5, 8, 11, 14, 17, 20, 23, 26]

/** Projeye kaç evrak yüklenmiş olduğu; her projede aynı sayıda olsaydı liste
    tekdüze görünür, "evraksız proje" hâli hiç denenmezdi. */
const DOCUMENT_COUNTS = [3, 1, 2, 0, 4, 2, 1, 3]

const SEEDED_FILES = [
  { name: 'musteri-sozlesmesi', extension: 'pdf', typeCode: 'musteriSozlesmesi' },
  { name: 'dogalgaz-uygunluk-belgesi', extension: 'pdf', typeCode: 'dogalgazUygunlukBelgesi' },
  { name: 'baca-atis-belgesi', extension: 'jpg', typeCode: 'cihazBacaAtisBelgesi' },
  { name: 'kolon-semasi', extension: 'dwg', typeCode: 'genelEvrak' },
  { name: 'gaz-yeterlilik', extension: 'pdf', typeCode: 'gazYeterlilikBelgesi' },
  { name: 'dask-policesi', extension: 'pdf', typeCode: 'daskPolicesi' },
  { name: 'mahal-uygunluk', extension: 'png', typeCode: 'mahalUygunlukBelgesi' },
  { name: 'ruhsat', extension: 'pdf', typeCode: 'ruhsat' },
  { name: 'cihaz-standart-belgesi', extension: 'pdf', typeCode: 'cihazStandartBelgesi' },
  { name: 'numurataj', extension: 'jpg', typeCode: 'numurataj' },
  { name: 'tesisat-projesi', extension: 'dwg', typeCode: 'genelEvrak' },
  { name: 'baca-raporu', extension: 'pdf', typeCode: 'bacaRaporu' },
]

/** Proje detayındaki birim/cihaz mock'uyla aynı adlandırma (D20, D21…) artı
    belgede geçen ortak birimler. */
const SEEDED_UNIT_SETS = [['Kolon'], ['D20'], ['D20', 'D21'], ['DMUST'], ['Kolon', 'DMUST']]

const SEEDED_UPLOADERS = ['AHMET AKBAYIR', 'FATMA ÇELİK', 'MURAT ŞAHİN', 'ZEYNEP KAYA']

/** Boyutlar 40 KB – 3 MB arasında dolaşsın: hepsi aynı olsaydı proje detayının
    "Boyut" sütunu biçimlendirmeyi hiç sınamazdı. */
const SEEDED_SIZES_KB = [42, 128, 340, 512, 890, 1240, 2048, 3072]
const BYTES_PER_KILOBYTE = 1024

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  dwg: 'application/acad',
  alp: 'application/octet-stream',
}

const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

/**
 * Uzantı → MIME. Bu türetme YALNIZ mock katmanında: gerçek uç `contentType`
 * alanını kendisi döndürecek, bileşen uzantıyı hiç görmüyor (K57).
 */
function contentTypeOf(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[extension] ?? FALLBACK_CONTENT_TYPE
}

function buildSeedRow(project: MockProjectSeed, index: number, id: number): DocumentRow {
  const file = SEEDED_FILES[index % SEEDED_FILES.length]
  const daysAgo = RECEIVED_DAY_OFFSETS[index % RECEIVED_DAY_OFFSETS.length]
  // Aynı güne düşen kayıtlar aynı saati taşımasın: sıralama ve "gün + saat"
  // hücresi tekdüze görünmesin diye kimlikle dakika kaydırılıyor.
  const receivedAt = new Date(MOCK_BUILT_AT - daysAgo * DAY_MS - id * 47 * 60 * 1000)

  return {
    id,
    fileName: `${file.name}-${project.pId}.${file.extension}`,
    docTypeCode: file.typeCode,
    receivedAt: receivedAt.toISOString(),
    unitNames: SEEDED_UNIT_SETS[index % SEEDED_UNIT_SETS.length],
    projectId: project.id,
    projectName: project.name,
    projectPId: project.pId,
    projectFirmId: project.projectFirmId,
    installationNo: project.installationNo,
    firmName: project.firmName,
    gasFirmName: project.gasFirmName,
    sizeBytes: SEEDED_SIZES_KB[index % SEEDED_SIZES_KB.length] * BYTES_PER_KILOBYTE,
    uploadedByName: SEEDED_UPLOADERS[index % SEEDED_UPLOADERS.length],
    contentType: contentTypeOf(`${file.name}.${file.extension}`),
    // Tohumlanan satırın arkasında GERÇEK dosya yok; evrak adı bu yüzden
    // tıklanabilir değil. Sahte bir adres vermek 404'e giden bir bağlantı olurdu.
    url: null,
  }
}

function buildMockDocuments(): DocumentRow[] {
  const documents: DocumentRow[] = []
  let id = 1

  getMockProjectSeeds().forEach((project, projectIndex) => {
    const count = DOCUMENT_COUNTS[projectIndex % DOCUMENT_COUNTS.length]

    for (let offset = 0; offset < count; offset += 1) {
      documents.push(buildSeedRow(project, projectIndex + offset, id))
      id += 1
    }
  })

  return documents
}

/** Tembel kurulum: modül yüklenirken değil ilk istendiğinde. Testler
    `resetMockDocuments` ile temiz bir depoyla başlayabilsin. */
let mockDocuments: DocumentRow[] | null = null

function getStore(): DocumentRow[] {
  mockDocuments ??= buildMockDocuments()
  return mockDocuments
}

export function getMockDocuments(): DocumentRow[] {
  return getStore()
}

/**
 * Testler arasında paylaşılan depo sızmasın; yükleme testi bir öncekinin
 * eklediği satırı görmemeli.
 *
 * Nesne adresleri BURADA bırakılıyor: `URL.createObjectURL` dosyayı belgeye
 * bağlar ve `revokeObjectURL` çağrılmazsa dosya sekme kapanana kadar bellekte
 * kalır. Satır listeden düşerken adres de bırakılmalı — depo yeniden kurulunca
 * o adreslere ulaşan kimse kalmıyor.
 */
export function resetMockDocuments(): void {
  for (const document of mockDocuments ?? []) {
    if (document.url !== null) URL.revokeObjectURL(document.url)
  }
  mockDocuments = null
}

type DocumentFileFields = Pick<DocumentRow, 'fileName' | 'contentType' | 'url' | 'sizeBytes'>

/**
 * Satırın dosya alanları. Yeniden ilişkilendirmede (gereksinim 7) dosya YENİDEN
 * YÜKLENMEZ: kaynak kaydın adı, tipi ve adresi kopyalanır — aynı dosyanın
 * ikinci bir kopyasını üretmek depoda da, kullanıcının gözünde de gereksiz.
 */
function resolveFileFields(
  source: DocumentUpload['source'],
  documents: DocumentRow[],
): DocumentFileFields {
  if (source.kind === 'file') {
    return {
      fileName: source.file.name,
      // Tarayıcı bazı biçimlerde (`.alp`, `.bmp`) `type`'ı boş bırakıyor.
      contentType: source.file.type === '' ? contentTypeOf(source.file.name) : source.file.type,
      sizeBytes: source.file.size,
      // Dosya zaten bellekte: nesne adresi verilince evrak adına tıklamak
      // gerçekten çalışır (oturum boyunca).
      url: URL.createObjectURL(source.file),
    }
  }

  const origin = documents.find((document) => document.id === source.documentId)
  if (origin === undefined) {
    throw new Error('addMockDocuments: yeniden ilişkilendirilen evrak bulunamadı.')
  }

  return {
    fileName: origin.fileName,
    contentType: origin.contentType,
    sizeBytes: origin.sizeBytes,
    url: origin.url,
  }
}

function nextDocumentId(documents: DocumentRow[]): number {
  return documents.reduce((highest, document) => Math.max(highest, document.id), 0) + 1
}

/**
 * "Kaydet" gerçekten listeye yazar: yüklenen evrak hem projenin evraklarında
 * hem genel Evraklar ekranında görünür (gereksinim 12). Kalıcı DEĞİL —
 * depo bellekte, sayfa yenilenince tohum listesine dönülür.
 *
 * Proje künyesi GERÇEK uçtan geliyor (`ProjectSummary`) ve o uç firma/tesisat
 * alanlarını döndürmüyor: satır bu alanları `null` bırakır. Kimliğe denk gelen
 * tohumdan doldurulsaydı gerçek bir projenin evrağı, uydurma bir firmanın adıyla
 * listelenirdi — düzeltilen tuzağın ta kendisi.
 */
export function addMockDocuments(
  project: ProjectSummary,
  uploads: DocumentUpload[],
  uploadedByName: string | null,
): DocumentRow[] {
  const documents = getStore()
  let id = nextDocumentId(documents)
  const receivedAt = new Date().toISOString()

  const rows = uploads.map((upload) => {
    const row: DocumentRow = {
      ...resolveFileFields(upload.source, documents),
      id,
      docTypeCode: upload.docTypeCode,
      receivedAt,
      unitNames: upload.unitNames,
      projectId: project.id,
      projectName: project.name,
      projectPId: project.pId,
      projectFirmId: null,
      installationNo: null,
      firmName: null,
      gasFirmName: null,
      uploadedByName,
    }

    id += 1
    return row
  })

  documents.unshift(...rows)
  return rows
}
