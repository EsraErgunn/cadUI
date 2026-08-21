import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import {
  getElementInputElevationCm,
  SERVICE_BOX_SEED_HEIGHT_CM,
} from '../../core/lineElevation'

/**
 * Servis kutusunun çıkış portunun sabit id'si — `assets/symbols/
 * service-box.meta.json` asset sözleşmesi (K-tesisat-panel). `ui/` `scene/`den
 * (sembol metadata yükleyicisi) import ETMEZ (kural 2), bu yüzden metadata'dan
 * çözmek yerine bu sabit kullanılıyor: servis kutusu TEK tip ve tek portlu.
 */
const SERVICE_BOX_OUTPUT_PORT_ID = 'out'

type ServiceBoxPropertiesProps = {
  elementIds: readonly Id[]
}

/**
 * Servis kutusunun özellikleri. Kot (K102) kutunun KENDİ alanı değil, çıkışına
 * bağlı borunun `pipe.start/endHeightCm`'idir — sayaçtaki (`GasMeterProperties`)
 * çözümün aynısı: kot borularda durur, eleman onu türetir. Boru henüz
 * çizilmemişse alan kutunun varsayılan çıkış kotunu (15 cm) gösterir ve
 * çizim başlayınca boru zaten o kottan doğar.
 */
export function ServiceBoxProperties({ elementIds }: ServiceBoxPropertiesProps) {
  const installationLines = useCadStore((state) => state.installationLines)
  const installationConnections = useCadStore((state) => state.installationConnections)
  const patchLines = useCadStore((state) => state.patchLines)

  const outletLineIds = installationConnections
    .filter(
      (connection) =>
        connection.target.kind === 'port' &&
        connection.target.portId === SERVICE_BOX_OUTPUT_PORT_ID &&
        elementIds.includes(connection.target.elementId),
    )
    .map((connection) => connection.lineId)

  // `getElementInputElevationCm` adı GİRİŞ diyor ama yaptığı iş porta göre
  // bağlı hattın O UCUNDAKİ kotu okumak — tek portlu servis kutusunda çıkış
  // portu için de aynen geçerli, ikinci bir kopya yazılmaz.
  const elevationCm = getCommonNumber(
    elementIds.map((elementId) =>
      outletLineIds.length === 0
        ? SERVICE_BOX_SEED_HEIGHT_CM
        : getElementInputElevationCm(
            elementId,
            SERVICE_BOX_OUTPUT_PORT_ID,
            installationLines,
            installationConnections,
          ),
    ),
  )

  const commitElevation = (value: number) => {
    // Boru yokken yazacak yer de yok: alan eski değerine döner ve kullanıcı
    // uyarılır — sessizce kaybolan bir düzenleme bırakmaktansa.
    if (outletLineIds.length === 0) return false

    // Düz kot: kullanıcı TEK sayı yazıyor, iki ucu ayrı sormuyoruz — eğim
    // sonradan `+`/`-` ile verilir (K102).
    patchLines(outletLineIds, (line) => ({
      pipe: { description: '', ...line.pipe, startHeightCm: value, endHeightCm: value },
    }))
    return true
  }

  return (
    <div className="flex flex-col gap-3">
      <PropertyNumberField
        label="Kot (cm)"
        valueCm={elevationCm}
        targetKey={`serviceBox-elevation-${elementIds.join(',')}`}
        onCommit={commitElevation}
        rejectionMessage="Kot yazmak için kutudan bir boru çıkmalı."
      />
      {/*
        tesisat_eleman.md: "Servis vanası özelliği olsun ama tıklamayın" — SALT
        OKUNUR gösterge. Her servis kutusunda sabit true olduğu için modelde
        SAKLANMAZ (kullanıcı onayı, 2026-08).
      */}
      <PropertyCheckboxField
        label="Servis vanası özelliği"
        checked
        targetKey="serviceBox"
        isReadOnly
      />
    </div>
  )
}
