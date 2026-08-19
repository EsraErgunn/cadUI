import { CircleCheck, FlaskConical, Save, Send } from 'lucide-react'

import { editorBarButtonVariants, editorBarPrimaryVariants } from './editorBarVariants'
import { selectIsProjectDirty, useCadStore } from '../../store/cadStore'
import { VersionHistoryMenu, type VersionHistorySource } from '../versions/VersionHistoryMenu'

type EditorActionsProps = {
  onSave: () => void
  isSaving: boolean
  versionHistory: VersionHistorySource
}

/**
 * Üst barın sağ öbeği: proje düzeyindeki eylemler.
 *
 * "Hata Kontrolleri" bağımsız bir eylem DEĞİL, "Test Et"in sonucunu gösteren
 * yer; doğrulama hattı (core/validate.ts bugün boş) bağlanınca sonuç varken
 * görünen bir rozete dönüşecek. O gün gelene kadar Test Et/Gönder ile birlikte
 * pasif duruyor — "0 hata" yazmak, çalıştırılmamış bir kontrolü geçmiş gibi
 * gösterirdi (palet dürüstlüğü, K79). Kayıt Geçmişi o öbekten AYRILDI: arkasına
 * gerçek bir uç bağlandı (GET /api/projects/{id}/versions), kendi açılır
 * listesini taşıyor (K109).
 */
export function EditorActions({ onSave, isSaving, versionHistory }: EditorActionsProps) {
  const isDirty = useCadStore(selectIsProjectDirty)

  return (
    <div className="flex items-center gap-2">
      {/* TODO(enfal): Test Et doğrulamayı çalıştırsın, sonuç bu rozete yazılsın. */}
      <button
        type="button"
        disabled
        title="Hata Kontrolleri (test çalıştırılınca dolar)"
        className={editorBarButtonVariants({ tone: 'success' })}
      >
        <CircleCheck size={16} strokeWidth={1.8} aria-hidden />
        Hata Kontrolleri
      </button>
      <button
        type="button"
        disabled
        title="Test Et"
        className={editorBarButtonVariants({ tone: 'card' })}
      >
        <FlaskConical size={16} strokeWidth={1.8} aria-hidden />
        Test Et
      </button>
      <button
        type="button"
        disabled
        title="Gönder"
        className={editorBarButtonVariants({ tone: 'card' })}
      >
        <Send size={16} strokeWidth={1.8} aria-hidden />
        Gönder
      </button>

      {/* Kirliyken de basılabilir kalır: kullanıcı istediği an sürüm alabilmeli. */}
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

      {/* "Düzenle" menüsü kalkınca buraya taşındı (K90); açılır listesi
          kendi bileşeninde. */}
      <VersionHistoryMenu {...versionHistory} />
    </div>
  )
}
