import { useQuery } from '@tanstack/react-query'

import {
  getProjectDesignerName,
  getProjectApproverName,
  splitStreetDoorNo,
} from './projectSummaryFields'
import { getProjectDetail, getProjectHistory } from '../api/projectDetail'
import { getProjectFirmAuthorizations } from '../api/projectFirmAuthorizations'
import { getProjectFirm } from '../api/projectFirmForm'

/**
 * Editörün ihtiyaç duyduğu proje künyesi — PDF kapağının veri kaynağı.
 *
 * ⚠️ Kapakta artık MOCK ALAN YOK (K159): her değer ya gerçek bir uçtan ya
 * çizimden geliyor. `ProjectDetail.extras` bu yoldan tümüyle çıktı — detay
 * ekranı onu kullanmaya devam ediyor, kâğıt kullanmıyor.
 *
 * Beş kaynak birleşiyor:
 * - `GET /api/projects/{id}` — ad, numara, adres, tip, adetler
 * - `GET /api/project-firm-authorizations` — projenin firma KİMLİĞİ
 * - `GET /api/projectfirms/{id}` — firma künyesi
 * - `GET /api/gasdistributionfirms/{id}` — onay bloğundaki firma adı
 * - `GET /api/projects/{id}/history` — tasarımcı ve onaylayan
 *
 * ⚠️ Firma kimliği araya bir istek SOKUYOR: canlı `GET /api/projects/{id}`
 * yanıtı `projectFirmId` DÖNDÜRMÜYOR (OpenAPI örneğinde var, telde yok —
 * ölçüldü), yalnız `projectFirmAuthorizationId` veriyor. Zincir bu yüzden üç
 * halkalı: proje → yetki → firma.
 */
export type ProjectSummary = {
  name: string
  /** Serbest biçimli proje numarası (`pId`); kapak ve dosya adı bunu kullanır. */
  number: string
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
   * Projeyi oluşturan kişi; sistem yöneticisi oluşturmuşsa firma yetkilisi
   * (bkz. `getProjectDesignerName`). Kayıt/yeterlilik numaraları YOK — ikisinin
   * de sunucuda karşılığı bulunmadığı için kapaktan kaldırıldılar (K159).
   */
  designer: { name: string }
  firm: {
    title: string
    address: string
    phone: string
    /** Vergi DAİRESİ yok: `GET /api/projectfirms/{id}` yalnız numarayı taşıyor. */
    taxNumber: string
  }
  approval: {
    gasFirmName: string
    /** Projeyi ONAYLAYAN kişi (geçmişteki `projeOnay` satırı); yoksa boş. */
    approverName: string
    /** Dağıtım şirketinin yetkilisi; kaşe kutusu onaylayan yoksa buna düşer. */
    gasFirmContactPerson: string
  }
  /** Vaziyet planındaki sokak/kapı bilgisi; tam adresten ayrıştırılır. */
  streetName: string
  doorNumber: string
}

const EMPTY_SUMMARY: ProjectSummary = {
  name: '',
  number: '',
  building: {
    city: '',
    district: '',
    address: '',
    blockLotParcel: '',
    projectType: '',
    heatingType: '',
    floorCount: '',
    residenceCount: '',
    shopCount: '',
    totalAreaSquareMeters: '',
  },
  designer: { name: '' },
  firm: { title: '', address: '', phone: '', taxNumber: '' },
  approval: { gasFirmName: '', approverName: '', gasFirmContactPerson: '' },
  streetName: '',
  doorNumber: '',
}

function toText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? String(value) : value.trim()
}

/**
 * Künye proje DETAY ucundan çözülüyor (K63 deseni): rota
 * `/projects/:projectId/editor` olduğu için id her zaman elde, yani yer imiyle
 * ya da F5 ile girişte de çalışıyor. Çizim store'u proje adını/numarasını
 * taşımıyor — orada yalnız kaydedilecek JSON var (CLAUDE.md kural 4).
 *
 * Uç yanıt vermezse iş DURMAZ: PDF yine üretilir, proje numarası id'ye düşer.
 * Künye yüzünden dışa aktarmayı engellemek orantısız olurdu. Aynı gerekçe yan
 * sorgular için de geçerli — firma ya da geçmiş gelmezse o satırlar boş kalır,
 * kapak yine basılır.
 */
export function useProjectSummary(projectId: number | undefined): ProjectSummary {
  const { data } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: ({ signal }) => getProjectDetail(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const server = data?.server

  const { data: history } = useQuery({
    queryKey: ['project-summary-history', projectId],
    queryFn: ({ signal }) => getProjectHistory(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const authorizationId = server?.projectFirmAuthorizationId ?? undefined
  const { data: authorizations } = useQuery({
    queryKey: ['project-summary-authorizations'],
    queryFn: ({ signal }) => getProjectFirmAuthorizations({}, signal),
    enabled: authorizationId !== undefined,
  })

  const projectFirmId = authorizations?.find((row) => row.id === authorizationId)?.projectFirmId
  const { data: projectFirm } = useQuery({
    queryKey: ['project-summary-firm', projectFirmId],
    queryFn: ({ signal }) => getProjectFirm(projectFirmId ?? 0, { signal }),
    enabled: projectFirmId !== undefined,
  })

  if (!server) {
    return { ...EMPTY_SUMMARY, number: projectId === undefined ? '' : String(projectId) }
  }

  const { streetName, doorNumber } = splitStreetDoorNo(toText(server.addressLine))
  const historyRows = history ?? []

  return {
    name: server.name,
    number: server.pId,
    building: {
      city: toText(server.cityName),
      district: toText(server.districtName),
      address: toText(server.addressLine),
      blockLotParcel: toText(server.blockLotParcel),
      projectType: toText(server.projectTypeName),
      heatingType: toText(server.heatingTypeName),
      // Kat adedi uçta YOK; boş bırakılıyor ve kapak çizimdeki kat sayısına
      // düşüyor (`buildCoverInfo`) — o da uydurma değil, kullanıcının çizdiği.
      floorCount: '',
      residenceCount: toText(server.apartmentCount),
      shopCount: toText(server.workplaceCount),
      totalAreaSquareMeters: toText(server.areaSquareMeters),
    },
    designer: {
      name: getProjectDesignerName(historyRows, projectFirm?.contactPerson ?? null),
    },
    firm: {
      title: toText(projectFirm?.title),
      address: toText(projectFirm?.address),
      phone: toText(projectFirm?.phone),
      taxNumber: toText(projectFirm?.taxNumber),
    },
    approval: {
      // Ad projenin KENDİ gövdesinden (`ProjectDetailDto.GasDistributionFirmName`):
      // ikinci bir istek gerekmiyor ve `GET /api/gasdistributionfirms/{id}`
      // sunucuda `[Authorize(Roles = Admin)]` olduğu için proje firması
      // kullanıcısında 403 dönüyordu.
      gasFirmName: toText(server.gasDistributionFirmName),
      approverName: getProjectApproverName(historyRows),
      // Dağıtım yetkilisi YALNIZ admin-only tekil uçta var; istek kalktığı için
      // boş bırakılıyor. Kaşe kutusu zaten onaylayanın adına düşüyor
      // (`coverPageFields`) ve o ad artık gerçek geçmişten geliyor.
      gasFirmContactPerson: '',
    },
    streetName,
    doorNumber,
  }
}
