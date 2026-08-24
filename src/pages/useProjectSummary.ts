import { useQuery } from '@tanstack/react-query'

import { getProjectDetail } from '../api/projectDetail'

/**
 * Editörün ihtiyaç duyduğu proje künyesi — PDF kapağının veri kaynağı.
 *
 * Alanlar proje DETAY EKRANIYLA birebir aynı: kâğıda yazılan her değerin
 * kaynağı o ekranın gösterdiği kayıttır. PDF katmanı hiçbir değer türetmez.
 *
 * ⚠️ Alanların bir kısmı bugün `ProjectDetail.extras` altında ve o nesne
 * geliştirmede yer tutucu, üretimde `null` (K50/K51) — proje firması ve gaz
 * dağıtım kullanıcı ekranları sunucuya eklenmedi. Bu bir ara durum: uçlar
 * bağlanınca aynı alanlar gerçek değerleri taşıyacak, burada ya da kapakta
 * değişiklik gerekmeyecek. Bu yüzden bağlantı ŞİMDİDEN kurulu tutuluyor —
 * sökülüp sonra yeniden kurulması gereksiz iş olurdu.
 */
export type ProjectSummary = {
  name: string
  /** Serbest biçimli proje numarası (`pId`); kapak ve dosya adı bunu kullanır. */
  number: string
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
  designer: {
    name: string
    registrationNo: string
    competencyNo: string
  }
  firm: {
    title: string
    address: string
    phone: string
    taxOffice: string
    taxNumber: string
  }
  approval: {
    gasFirmName: string
    approverName: string
  }
  /** Vaziyet planındaki sokak/kapı bilgisi. */
  streetName: string
  doorNumber: string
}

const EMPTY_SUMMARY: ProjectSummary = {
  name: '',
  number: '',
  building: {
    city: '',
    district: '',
    neighborhood: '',
    streetDoorNo: '',
    address: '',
    blockLotParcel: '',
    installationNo: '',
    projectType: '',
    heatingType: '',
    floorCount: '',
    residenceCount: '',
    shopCount: '',
    totalAreaSquareMeters: '',
  },
  designer: { name: '', registrationNo: '', competencyNo: '' },
  firm: { title: '', address: '', phone: '', taxOffice: '', taxNumber: '' },
  approval: { gasFirmName: '', approverName: '' },
  streetName: '',
  doorNumber: '',
}

function toText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? String(value) : value.trim()
}

/**
 * "1.YERLİ SOKAK No:66" gibi tek alanı sokak ve kapı numarasına ayırır.
 *
 * Sunucu ikisini AYRI tutmuyor (`streetDoorNo` tek dizge). Ayrıştırma "no"
 * kelimesine bakar; bulamazsa tamamı sokak adı sayılır — kapı numarasını
 * tahmin etmektense boş bırakmak doğru, vaziyet planında yanlış numara
 * yazmaktan iyidir.
 */
export function splitStreetDoorNo(value: string): { streetName: string; doorNumber: string } {
  const match = /^(.*?)[\s,]*no\s*[:.]?\s*(\S+)\s*$/i.exec(value)
  if (!match) return { streetName: value.trim(), doorNumber: '' }

  return { streetName: match[1].trim(), doorNumber: match[2].trim() }
}

/**
 * Künye proje DETAY ucundan çözülüyor (K63 deseni): rota
 * `/projects/:projectId/editor` olduğu için id her zaman elde, yani yer imiyle
 * ya da F5 ile girişte de çalışıyor. Çizim store'u proje adını/numarasını
 * taşımıyor — orada yalnız kaydedilecek JSON var (CLAUDE.md kural 4).
 *
 * Uç yanıt vermezse iş DURMAZ: PDF yine üretilir, proje numarası id'ye düşer.
 * Künye yüzünden dışa aktarmayı engellemek orantısız olurdu.
 */
export function useProjectSummary(projectId: number | undefined): ProjectSummary {
  const { data } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: ({ signal }) => getProjectDetail(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  if (!data) {
    return { ...EMPTY_SUMMARY, number: projectId === undefined ? '' : String(projectId) }
  }

  const { server, extras } = data
  const streetDoorNo = toText(extras?.general.streetDoorNo)
  // Sokak alanı boşsa adres satırına düşülüyor: vaziyet planı en azından bir
  // sokak adı yazabilsin.
  const { streetName, doorNumber } = splitStreetDoorNo(
    streetDoorNo === '' ? toText(server.addressLine) : streetDoorNo,
  )

  return {
    name: server.name,
    number: server.pId,
    building: {
      city: toText(server.cityName),
      district: toText(server.districtName),
      neighborhood: toText(extras?.general.neighborhood),
      streetDoorNo,
      address: toText(server.addressLine),
      blockLotParcel: toText(server.blockLotParcel),
      installationNo: toText(extras?.general.installationNo),
      projectType: toText(extras?.general.projectType),
      heatingType: toText(extras?.general.heatingType),
      floorCount: toText(extras?.specs.floorCount),
      residenceCount: toText(extras?.specs.residenceCount),
      shopCount: toText(extras?.specs.shopCount),
      totalAreaSquareMeters: toText(extras?.specs.totalAreaSquareMeters),
    },
    designer: {
      name: toText(extras?.firm.engineerName),
      registrationNo: toText(extras?.firm.engineerRegistrationNo),
      competencyNo: toText(extras?.firm.competencyNo),
    },
    firm: {
      title: toText(extras?.firm.title),
      address: toText(extras?.firm.address),
      phone: toText(extras?.firm.phone),
      taxOffice: toText(extras?.firm.taxOffice),
      taxNumber: toText(extras?.firm.taxNumber),
    },
    approval: {
      gasFirmName: toText(extras?.general.gasFirmName),
      approverName: toText(extras?.approval.approverName),
    },
    streetName,
    doorNumber,
  }
}
