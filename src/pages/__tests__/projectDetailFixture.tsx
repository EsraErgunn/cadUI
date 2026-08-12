import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { Sourced } from '../../api/mockGate'
import type {
  ProjectApprovalInfo,
  ProjectDetail,
  ProjectDetailExtras,
  ProjectFirmInfo,
  ProjectHistoryRow,
  ProjectServerFields,
  ProjectSpecs,
  ProjectUnitRow,
} from '../../api/projectDetail'
import { ComingSoonPage } from '../ComingSoonPage'
import { ProjectDetailPage } from '../ProjectDetailPage'

export const PROJECT_ID = 42
export const DETAIL_PATH = `/projects/${PROJECT_ID}`

export function buildServerFields(
  overrides: Partial<ProjectServerFields> = {},
): ProjectServerFields {
  return {
    id: PROJECT_ID,
    pId: '30006185',
    name: 'İlave',
    description: null,
    cityName: 'Kütahya',
    districtName: 'Merkez',
    addressLine: 'Altunizade Mahallesi',
    blockLotParcel: null,
    createdAt: '2026-07-03T08:00:00.000Z',
    updatedAt: '2026-07-10T11:36:53.000Z',
    ...overrides,
  }
}

export function buildFirmInfo(overrides: Partial<ProjectFirmInfo> = {}): ProjectFirmInfo {
  return {
    engineerName: 'AHMET AKBAYIR',
    engineerRegistrationNo: '880',
    title: 'Kütahya Test Firması',
    address: 'Altunizade Mahir İz Suat Sümer İş Merkezi',
    phone: '2164021000',
    competencyNo: '118',
    taxOffice: '30 Ağustos',
    taxNumber: '2222222222',
    ...overrides,
  }
}

/** Varsayılan: proje ONAYLANMAMIŞ — onay alanlarının tamamı boş (KK-5). */
export function buildApprovalInfo(
  overrides: Partial<ProjectApprovalInfo> = {},
): ProjectApprovalInfo {
  return {
    approvedAt: null,
    approverName: null,
    approvalCode: null,
    note: null,
    ...overrides,
  }
}

export function buildSpecs(overrides: Partial<ProjectSpecs> = {}): ProjectSpecs {
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
    totalAreaSquareMeters: 2015,
    totalCapacity: 53.2,
    gasAreas: 'D20',
    renovationNote: null,
    orderNumber: null,
    connectionObject: null,
    ...overrides,
  }
}

export function buildExtras(overrides: Partial<ProjectDetailExtras> = {}): ProjectDetailExtras {
  return {
    general: {
      zpdFileName: '30006185.zpd',
      status: 'onayBekleyen',
      gasFirmName: 'TOROSGAZ-KÜTAHYA',
      installationNo: '115736',
      neighborhood: null,
      streetDoorNo: null,
      projectType: 'İLAVE',
      heatingType: 'Bireysel',
      isDetached: false,
      hasLicense: null,
    },
    firm: buildFirmInfo(),
    approval: buildApprovalInfo(),
    specs: buildSpecs(),
    ...overrides,
  }
}

export function buildDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return { server: buildServerFields(), extras: buildExtras(), ...overrides }
}

/** İlk birimde İKİ cihaz: KK-6'nın "alt satırlar boş kalır" kuralı için şart. */
export function buildUnits(): ProjectUnitRow[] {
  return [
    {
      id: 1,
      unitNumber: 'D20',
      subscriberName: 'FATMA ÇELİK',
      subscriberNo: '10208728',
      meterSerial: 'G4',
      flowCubicMeterPerHour: 3.5,
      pressureMbar: 21,
      areaSquareMeters: 64,
      pipeType: 'Fleks Boru (GFS)',
      devices: [
        {
          id: 11,
          name: 'Ocak',
          capacityKcalPerHour: 13200,
          flowCubicMeterPerHour: 1.6,
          brand: null,
          model: null,
          flueType: 'AÇIK',
        },
        {
          id: 12,
          name: 'Kombi',
          capacityKcalPerHour: 20640,
          flowCubicMeterPerHour: 2.5,
          brand: 'BOSCH',
          model: 'Condens 1200 W',
          flueType: 'HERMETİK',
        },
      ],
    },
  ]
}

/** Bilerek ESKİ kayıt önce: sıralamayı ekranın yaptığı görülsün (KK-8). */
export function buildHistory(): ProjectHistoryRow[] {
  return [
    {
      id: 1,
      fileType: 'zpd',
      createdAt: '2026-07-10T11:28:28.000Z',
      userName: 'AHMET AKBAYIR',
      roleSnapshot: 'Zetacad USER',
      operation: 'projeKayit',
      description: 'Proje Adı: TEST PROJESİ 2',
    },
    {
      id: 2,
      fileType: 'pdf',
      createdAt: '2026-07-10T11:36:53.000Z',
      userName: 'AHMET AKBAYIR',
      roleSnapshot: 'Zetacad USER',
      operation: 'projeGuncelleme',
      description: null,
    },
  ]
}

export function asMock<T>(data: T): Sourced<T> {
  return { source: 'mock', data }
}

export function asUnavailable<T>(): Sourced<T> {
  return { source: 'unavailable', data: null }
}

/**
 * Detay ekranını GERÇEK rotasıyla kurar. "Evrak Ekle" / "Poliçelendir"
 * hedefleri de bağlı: yönlendirmenin gerçekten çalıştığı ancak böyle
 * doğrulanabiliyor (KK-9).
 */
export function renderDetail(route: string = DETAIL_PATH) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="/admin/documents/new"
            element={<ComingSoonPage title="Evrak Ekle" section="Evraklar" />}
          />
          <Route
            path="/admin/policies/new"
            element={<ComingSoonPage title="Poliçe Oluşturma" section="Poliçeler" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
