import { Gauge } from 'lucide-react'

import { InfoCard } from './InfoCard'
import { InfoRow } from '../InfoRow'
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
  return (
    <InfoCard title={CARD_TITLE} icon={Gauge}>
      <InfoRow label="Sayaç Adedi" value={formatInteger(specs?.meterCount ?? null)} />
      <InfoRow label="Kat Adedi" value={formatInteger(specs?.floorCount ?? null)} />
      <InfoRow
        label="Mesken Adedi"
        value={formatInteger(specs?.residenceCount ?? null)}
      />
      <InfoRow label="Dükkan Adedi" value={formatInteger(specs?.shopCount ?? null)} />
      <InfoRow
        label="Kutu Basıncı"
        value={formatPressureMbar(specs?.boxPressureMbar ?? null)}
      />
      <InfoRow
        label="Kullanım Basıncı"
        value={formatPressureMbar(specs?.usagePressureMbar ?? null)}
      />
      <InfoRow label="Sayaç Tipi" value={specs?.meterType ?? null} />
      <InfoRow label="Kat Sayısı" value={specs?.floorPattern ?? null} />
      <InfoRow
        label="Daire Dükkan Sayısı"
        value={specs?.residenceShopPattern ?? null}
      />
      <InfoRow
        label="Toplam Alan"
        value={formatAreaSquareMeters(specs?.totalAreaSquareMeters ?? null)}
      />
      <InfoRow
        label="Toplam Kapasite"
        value={formatDecimal(specs?.totalCapacity ?? null)}
      />
      <InfoRow label="Gaz Alanlar" value={specs?.gasAreas ?? null} />
      <InfoRow label="Tadilat Açıklama" value={specs?.renovationNote ?? null} />
      <InfoRow label="Sipariş Numarası" value={specs?.orderNumber ?? null} />
      <InfoRow label="Bağlantı Nesnesi" value={specs?.connectionObject ?? null} />
    </InfoCard>
  )
}
