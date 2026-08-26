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
 *
 * "Sayaç Adedi", "Kullanım Basıncı", "Sayaç Tipi", "Gaz Alanlar" ve "Sipariş
 * Numarası" KALDIRILDI — sunucunun proje gövdesinde karşılıkları yok. Sayaç
 * adedi özellikle başka uçtan (birim/cihaz listesi) TÜRETİLMEZ: o liste sayaç
 * değil birim sayıyor, türetilen değer uydurma olurdu.
 *
 * "Kat Sayısı" ve "Daire Dükkan Sayısı" da KALKTI: ikisi de sunucuda karşılığı
 * olmayan serbest metin desenlerdi ve adet satırları (Kat/Mesken/Dükkan Adedi)
 * aynı bilgiyi gerçek veriyle zaten veriyor.
 */
export function ProjectSpecsCard({ specs }: { specs: ProjectSpecs | null }) {
  return (
    <InfoCard title={CARD_TITLE} icon={Gauge}>
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
        label="Toplam Alan"
        value={formatAreaSquareMeters(specs?.totalAreaSquareMeters ?? null)}
      />
      <InfoRow
        label="Toplam Kapasite"
        value={formatDecimal(specs?.totalCapacity ?? null)}
      />
      <InfoRow label="Tadilat Açıklama" value={specs?.renovationNote ?? null} />
      <InfoRow label="Bağlantı Nesnesi" value={specs?.connectionObject ?? null} />
    </InfoCard>
  )
}
