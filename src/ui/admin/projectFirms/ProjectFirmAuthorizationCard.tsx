import { MapPin, Network, Plus, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AuthorizationList } from './AuthorizationList'
import type { ProjectFirmAuthorization } from './authorizationDraft'
import { useProjectFirmAuthorizationDraft } from './useProjectFirmAuthorizationDraft'
import { adminButtonVariants } from '../adminVariants'
import { DateField } from '../form/DateField'
import { FieldError } from '../form/FieldError'
import { FieldWarning } from '../form/FieldWarning'
import { FormCard } from '../form/FormCard'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

const SECTION_TITLE = 'G.D. Firması & Bölge Yetkilendirme'

const GROUP_FIELD_ID = 'project-firm-authorization-group'
const GAS_FIRM_FIELD_ID = 'project-firm-authorization-gas-firms'
const CERTIFICATE_FIELD_ID = 'project-firm-authorization-certificate'
const VALID_FROM_FIELD_ID = 'project-firm-authorization-valid-from'
const VALID_TO_FIELD_ID = 'project-firm-authorization-valid-to'

interface ProjectFirmAuthorizationCardProps {
  authorizations: ProjectFirmAuthorization[]
  /** Kaydetmeye çalışılırken liste boşsa dolar (belge madde 28). */
  authorizationError: string | null
  onAdd: (added: ProjectFirmAuthorization[]) => void
  onRemove: (gasDistributionFirmId: number) => void
}

/**
 * Ekranın birinci bölümü. Taslak durumu (`useProjectFirmAuthorizationDraft`)
 * BURADA yaşıyor, formun kendisinde değil: yarım kalmış bir taslak "Kaydet"
 * doğrulamasına karışmamalı — kaydetme yalnız EKLENMİŞ kayıtlara bakar.
 *
 * Seçim ÇOĞUL: eklenen her gaz dağıtım firması bir çip ve çiplerin sonundaki
 * "+" yeni bir firma için paneli açıyor. Panel firma başına AYRI sertifika
 * numarası ve geçerlilik aralığı istiyor, çünkü yeterlilik belgesi firma
 * ÇİFTİNE ait — tek numarayı N firmaya yazmak yanlış veri olurdu ve sunucu da
 * kaydı satır satır saklıyor (`POST /api/project-firm-authorizations`).
 *
 * Panel liste BOŞKEN açık başlıyor: ilk kayıt için kullanıcıyı fazladan bir
 * tıklamaya zorlamak, zorunlu bir alanı gizlemek olurdu.
 */
export function ProjectFirmAuthorizationCard({
  authorizations,
  authorizationError,
  onAdd,
  onRemove,
}: ProjectFirmAuthorizationCardProps) {
  const [isDraftOpen, setIsDraftOpen] = useState(authorizations.length === 0)
  const draft = useProjectFirmAuthorizationDraft({
    authorizations,
    onAdd: (added) => {
      onAdd(added)
      // Ekledikten sonra panel KAPANIYOR: çip listesi öne çıksın, aynı
      // alanlar yarım dolu hâlde ekranda kalmasın.
      setIsDraftOpen(false)
    },
  })

  // Seçenek DEĞERİ kimlik: grup adı değişse de seçim bozulmasın.
  const groupOptions = useMemo(
    () => draft.groups.map((group) => ({ value: String(group.id), label: group.name })),
    [draft.groups],
  )

  const gasFirmOptions = useMemo(
    () => draft.gasFirms.map((gasFirm) => ({ value: String(gasFirm.id), label: gasFirm.name })),
    [draft.gasFirms],
  )

  // Kutu boşken SEBEBİNİ söylüyor: grup seçilmeden bölge listesi çekilmiyor.
  const gasFirmPlaceholder = draft.groupId === '' ? 'Önce grup firması seçiniz' : 'Seçiniz'

  return (
    <FormCard title={SECTION_TITLE} icon={MapPin}>
      {/* Çipler ve "+" ÜSTTE: kullanıcı önce ne eklediğini görsün, panel
          onun altında açılsın. */}
      <AuthorizationList
        authorizations={authorizations}
        isDraftOpen={isDraftOpen}
        onToggleDraft={() => setIsDraftOpen((open) => !open)}
        onRemove={onRemove}
      />

      {authorizationError !== null && (
        <FieldError id="project-firm-authorization-error">{authorizationError}</FieldError>
      )}

      {isDraftOpen && (
        <div className="flex flex-col gap-4 rounded-lg border border-edge bg-surface-sunken p-4">
          {/* Etiketler alanların GERÇEK içeriğini söylüyor: bu kutu GRUP
              firmalarını (AKSA, ENERYA), alttaki o grubun gaz dağıtım
              firmalarını (AKSA-GEMLİK) taşıyor. İkisi de "G.D Firması" ile
              başlarken hangisinin ne olduğu okunmuyordu. */}
          <SelectField
            id={GROUP_FIELD_ID}
            label="Grup Firması"
            labelNote={REQUIRED_MARK}
            layout="horizontal"
            leftIcon={Network}
            placeholder="Seçiniz"
            options={groupOptions}
            value={draft.groupId}
            error={draft.errors.group}
            onChange={draft.setGroupId}
          />

        {/* Bildirim seçim kutusunun `aria-describedby`'ına BAĞLANMIYOR: seçim
            değiştiği anda beliriyor ve odak hâlâ kutuda olduğu için `role="status"`
            onu zaten duyuruyor; describedby'a girseydi kutu her odaklanışta
            eski bildirimi tekrar okurdu. */}
        {draft.clearedNotice !== null && (
          <FieldWarning id={`${GROUP_FIELD_ID}-cleared`}>{draft.clearedNotice}</FieldWarning>
        )}

        {/* SEÇİM KUTUSU: bir "Ekle" tek firma bağlıyor, birden fazlası
            çiplerin yanındaki "+" ile ardışık eklemelerle kuruluyor. Uzun radyo
            listesi kartı şişiriyor ve ayrı bir arama kutusu istiyordu; seçim
            kutusu tarayıcının kendi tuşla-bul davranışını getiriyor. */}
        <SelectField
          id={GAS_FIRM_FIELD_ID}
          label="G.D. Firması"
          labelNote={REQUIRED_MARK}
          layout="horizontal"
          leftIcon={MapPin}
          placeholder={gasFirmPlaceholder}
          options={gasFirmOptions}
          value={draft.selectedGasFirmId === null ? '' : String(draft.selectedGasFirmId)}
          isDisabled={draft.groupId === '' || draft.areGasFirmsPending}
          error={draft.errors.gasFirms}
          onChange={(value) => draft.selectGasFirm(Number(value))}
        />

        {/* "Yeterlilik No" KALKTI (K102): kayıtta tek numara kaldı.
            ZORUNLU: uç boş sertifika numarasını reddediyor. */}
        <TextField
          id={CERTIFICATE_FIELD_ID}
          label="Sertifika No"
          layout="horizontal"
          leftIcon={ShieldCheck}
          placeholder="Sertifika numarası"
          value={draft.certificateNumber}
          error={draft.errors.certificateNumber}
          onChange={draft.setCertificateNumber}
        />

        {/* Geçerlilik aralığı: başlangıç uçta ZORUNLU, bitiş boş bırakılabilir
            (süresiz). Bitişin `min`i başlangıca bağlı — geçersiz aralık takvimde
            hiç seçilemesin.

            İki tarih ALT ALTA ve paneldeki öteki alanlarla aynı yatay düzende:
            yan yana iki sütundayken etiketleri üstte kalıyor ve kart içinde
            tek başlarına farklı bir hizada duruyorlardı. */}
        <DateField
          id={VALID_FROM_FIELD_ID}
          label="Geçerlilik Başlangıcı"
          labelNote={REQUIRED_MARK}
          layout="horizontal"
          value={draft.validFrom}
          error={draft.errors.validFrom}
          onChange={draft.setValidFrom}
        />
        <DateField
          id={VALID_TO_FIELD_ID}
          label="Geçerlilik Bitişi"
          labelNote="(isteğe bağlı)"
          layout="horizontal"
          value={draft.validTo}
          min={draft.validFrom === '' ? undefined : draft.validFrom}
          hint="Boş bırakılırsa süresiz sayılır."
          error={draft.errors.validTo}
          onChange={draft.setValidTo}
        />

        {/* Mockup: bölümün sağ alt köşesinde, birincil renkte "+ Ekle".
            `type="button"`: form içinde durduğu için varsayılan `submit` olsaydı
            Enter'a basan kullanıcı yetkilendirme eklemek yerine formu gönderirdi. */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={draft.add}
            className={adminButtonVariants({ tone: 'primary', size: 'sm' })}
          >
            <Plus aria-hidden className="size-4" />
            Ekle
          </button>
          </div>
        </div>
      )}
    </FormCard>
  )
}
