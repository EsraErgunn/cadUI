import { Save, Send } from 'lucide-react'

import { editorBarButtonVariants, editorBarPrimaryVariants } from './editorBarVariants'
import { selectIsProjectDirty, useCadStore } from '../../store/cadStore'
import { ValidationMenu } from '../validation/ValidationMenu'
import { VersionHistoryMenu, type VersionHistorySource } from '../versions/VersionHistoryMenu'

type EditorActionsProps = {
  onSave: () => void
  isSaving: boolean
  /**
   * Salt görüntüleme: "Kaydet" HİÇ çizilmez. Sunucu da bu rolü reddederdi
   * (`POST /api/projects/{id}/newversion` → Admin, ProjectFirmUser); düğmeyi
   * bırakmak kullanıcıyı anlamsız bir 403'e götürürdü.
   *
   * "Gönder", "Hata Kontrolleri" ve "Kayıt Geçmişi" KALIR: ilki zaten pasif,
   * diğer ikisi yalnız OKUR — sürüm listesini görmek ve seçmek bir görüntüleme
   * işlemi. (Sürüm YÜKLEME çizimi `loadProject` ile değiştirir ama
   * bu bir düzenleme değil, başka bir kaydın görüntülenmesidir.)
   */
  isReadOnly: boolean
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
 * "Gönder" de pasif ama artık SEBEBİ VAR: hatalar giderilmeden proje onaya
 * gidemez (doküman, Kapsam). Denetim temiz çıksa bile düğme açılmıyor — onaya
 * gönderme akışı (eksik evrak yanıtı dahil) proje listesi ekranında yaşıyor ve
 * editöre taşınması ayrı bir adım.
 */
export function EditorActions({
  onSave,
  isSaving,
  isReadOnly,
  versionHistory,
}: EditorActionsProps) {
  const isDirty = useCadStore(selectIsProjectDirty)

  return (
    <div className="flex items-center gap-2">
      <ValidationMenu />
      <button
        type="button"
        disabled
        title="Gönder (önce hata kontrolleri giderilmeli)"
        className={editorBarButtonVariants({ tone: 'card' })}
      >
        <Send size={16} strokeWidth={1.8} aria-hidden />
        Gönder
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
