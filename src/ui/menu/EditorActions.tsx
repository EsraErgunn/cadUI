import { Check, Save, Send } from 'lucide-react'

import { editorBarButtonVariants, editorBarPrimaryVariants } from './editorBarVariants'
import type { EditorSubmit, EditorSubmitKind } from '../../pages/useEditorSubmit'
import { selectIsProjectDirty, useCadStore } from '../../store/cadStore'
import { ValidationMenu } from '../validation/ValidationMenu'
import { VersionHistoryMenu, type VersionHistorySource } from '../versions/VersionHistoryMenu'

const SUBMIT_LABELS: Record<EditorSubmitKind, string> = {
  submit: 'Gönder',
  approve: 'Onayla',
}

const SUBMIT_TITLES: Record<EditorSubmitKind, string> = {
  submit: 'Projeyi onaya gönder',
  approve: 'Projeyi onayla',
}

const SUBMIT_ICONS: Record<EditorSubmitKind, typeof Send> = {
  submit: Send,
  approve: Check,
}

type EditorActionsProps = {
  onSave: () => void
  isSaving: boolean
  /**
   * Salt görüntüleme: "Kaydet" HİÇ çizilmez. Sunucu da bu rolü reddederdi
   * (`POST /api/projects/{id}/newversion` → Admin, ProjectFirmUser); düğmeyi
   * bırakmak kullanıcıyı anlamsız bir 403'e götürürdü.
   *
   * "Gönder"/"Onayla", "Hata Kontrolleri" ve "Kayıt Geçmişi" KALIR: ilki bu
   * rolde zaten ONAY düğmesi (gaz dağıtım kullanıcısının asıl işi), diğer ikisi
   * yalnız OKUR — sürüm listesini görmek ve seçmek bir görüntüleme
   * işlemi. (Sürüm YÜKLEME çizimi `loadProject` ile değiştirir ama
   * bu bir düzenleme değil, başka bir kaydın görüntülenmesidir.)
   */
  isReadOnly: boolean
  /** "Gönder"/"Onayla" düğmesinin arkası; bar yalnız TAŞIR, kendisi kurmaz. */
  submit: EditorSubmit
  versionHistory: VersionHistorySource
}

/**
 * Üst barın sağ öbeği: proje düzeyindeki eylemler.
 *
 * "Hata Kontrolleri" K90'da pasifti çünkü arkasındaki `core/validate.ts` boştu;
 * kural motoru yazılınca kendi açılır listesine dönüştü (`ValidationMenu`) —
 * Kayıt Geçmişi'yle (K109) aynı desen.
 *
 * "Test Et" KALDIRILDI (K142, kullanıcı isteği): hiçbir zaman bağlanmamıştı ve
 * "zaten hata kontrolleri tuşu o işi yapıyor". Dokümanda da (hata-kontrol.docx)
 * yalnız hata kontrolleri ekranı tarif ediliyordu; ne yaptığı hiç yazılı
 * olmayan pasif bir düğme, kullanıcıya bir şey vaat edip vermiyordu (K79 ile
 * aynı çizgi, bu kez kaldırma yönünde).
 *
 * "Gönder" ARTIK BAĞLI (K175) ve rolden iki yüzü var: gaz dağıtım kullanıcısı
 * "Onayla" görür, kalanlar "Gönder". Pasif hâli kalktı — hata kontrolü engel
 * değil uyarı, denetim hata bulursa araya onay penceresi giriyor. Mantığın
 * tamamı `useEditorSubmit`'te; bu bileşen yalnız etiketi ve ikonu seçiyor.
 */
export function EditorActions({
  onSave,
  isSaving,
  isReadOnly,
  submit,
  versionHistory,
}: EditorActionsProps) {
  const isDirty = useCadStore(selectIsProjectDirty)
  const SubmitIcon = SUBMIT_ICONS[submit.kind]

  return (
    <div className="flex items-center gap-2">
      <ValidationMenu />
      <button
        type="button"
        onClick={submit.request}
        disabled={submit.isPending}
        aria-busy={submit.isPending}
        title={SUBMIT_TITLES[submit.kind]}
        className={editorBarButtonVariants({ tone: 'card' })}
      >
        <SubmitIcon size={16} strokeWidth={1.8} aria-hidden />
        {SUBMIT_LABELS[submit.kind]}
      </button>

      {/* Kirliyken de basılabilir kalır: kullanıcı istediği an sürüm alabilmeli. */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          aria-label={isDirty ? 'Kaydet (kaydedilmemiş değişiklik var)' : 'Kaydet'}
          title="Kaydet (Ctrl+S)"
          className={editorBarPrimaryVariants()}
        >
          <Save size={16} strokeWidth={1.8} aria-hidden />
          {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          {/* Uyarı göstergesi (KK-16). Renk tek başına anlam taşımasın diye
              aria-label da değişiyor. */}
          {isDirty && <span aria-hidden className="size-2 rounded-full bg-brand" />}
        </button>
      )}

      {/* "Düzenle" menüsü kalkınca buraya taşındı (K90); açılır listesi
          kendi bileşeninde. */}
      <VersionHistoryMenu {...versionHistory} />
    </div>
  )
}
