import { Gauge } from 'lucide-react'

import { InfoCard } from './InfoCard'
import { InfoRow } from './InfoRow'
import {
  formatAreaSquareMeters,
  formatDecimal,
  formatInteger,
  formatPressureMbar,
} from './projectDetailFormat'
import type { ProjectSpecs } from '../../../api/projectDetail'

const CARD_TITLE = 'Detay Bilgileri'

/**
 * Tesisata ait teknik değerler. Tamamı çizim uygulamasından (ZetaCAD/WebCAD)
 * geliyor ve SALT OKUNUR — portalden değiştirilemez, o yüzden hiçbiri girdi
 * değil, düz metin (KK-5).
 */
export function ProjectSpecsCard({ specs }: { specs: ProjectSpecs | null }) {
  const isMock = specs !== null

  return (
    <InfoCard title={CARD_TITLE} icon={Gauge}>
      <InfoRow label="Sayaç Adedi" value={formatInteger(specs?.meterCount ?? null)} isMock={isMock} />
      <InfoRow label="Kat Adedi" value={formatInteger(specs?.floorCount ?? null)} isMock={isMock} />
      <InfoRow
        label="Mesken Adedi"
        value={formatInteger(specs?.residenceCount ?? null)}
        isMock={isMock}
      />
      <InfoRow label="Dükkan Adedi" value={formatInteger(specs?.shopCount ?? null)} isMock={isMock} />
      <InfoRow
        label="Kutu Basıncı"
        value={formatPressureMbar(specs?.boxPressureMbar ?? null)}
        isMock={isMock}
      />
      <InfoRow
        label="Kullanım Basıncı"
        value={formatPressureMbar(specs?.usagePressureMbar ?? null)}
        isMock={isMock}
      />
      <InfoRow label="Sayaç Tipi" value={specs?.meterType ?? null} isMock={isMock} />
      <InfoRow label="Kat Sayısı" value={specs?.floorPattern ?? null} isMock={isMock} />
      <InfoRow
        label="Daire Dükkan Sayısı"
        value={specs?.residenceShopPattern ?? null}
        isMock={isMock}
      />
      <InfoRow
        label="Toplam Alan"
        value={formatAreaSquareMeters(specs?.totalAreaSquareMeters ?? null)}
        isMock={isMock}
      />
      <InfoRow
        label="Toplam Kapasite"
        value={formatDecimal(specs?.totalCapacity ?? null)}
        isMock={isMock}
      />
      <InfoRow label="Gaz Alanlar" value={specs?.gasAreas ?? null} isMock={isMock} />
      <InfoRow label="Tadilat Açıklama" value={specs?.renovationNote ?? null} isMock={isMock} />
      <InfoRow label="Sipariş Numarası" value={specs?.orderNumber ?? null} isMock={isMock} />
      <InfoRow label="Bağlantı Nesnesi" value={specs?.connectionObject ?? null} isMock={isMock} />
    </InfoCard>
  )
}
