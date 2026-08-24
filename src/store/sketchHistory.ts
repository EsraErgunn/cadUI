import { useCadStore } from './cadStore'
import { useUiStore } from './uiStore'

/**
 * Serbest çizim ile ÇİZİM arasındaki sıralamayı tutan ortak saat (K164).
 *
 * Neden gerekli: iki geçmiş ayrı store'da yaşıyor — çizim zundo'da, kroki
 * `uiStore`'da (kaydedilmediği için, K163). Ctrl+Z hangisine gitmeli sorusunun
 * doğru cevabı "EN SON hangisi yapıldıysa o"; iki yığın birbirinin zamanını
 * bilmediği için burada tek bir sayaçla damgalanıyorlar.
 *
 * ⚠️ `revision` sayacı bu iş için KULLANILAMAZ: geri alma geçmişinde izlenen
 * alanlar arasında değil (`partializeProjectState`), yani geri alındığında eski
 * değerine dönmüyor ve "hangisi daha yeni" sorusunu yanıtlayamıyor.
 */
let clock = 0
let lastDrawingTick = 0
let lastSketchTick = 0

/** Kroki tarafı her yazdığında çağrılır. */
export function markSketchAction(): void {
  clock += 1
  lastSketchTick = clock
}

/**
 * Çizim değişikliklerini damgalar. `revision` her `markDirty`de artıyor, yani
 * kabul edilen her düzenlemede bir kez — reddedilen denemeler (K13) artırmıyor,
 * bu yüzden saate boş adım düşmüyor.
 *
 * Abonelik MODÜL YÜKLENİRKEN kuruluyor ve hiç sökülmüyor: store uygulamanın
 * ömrü boyunca yaşıyor, sökülecek bir yaşam döngüsü yok.
 */
useCadStore.subscribe((state, previous) => {
  if (state.revision === previous.revision) return
  clock += 1
  lastDrawingTick = clock
})

/**
 * Ctrl+Z krokiye mi gitmeli? İki koşul birden: geri alınacak bir kroki işlemi
 * VAR ve son yapılan iş krokiydi.
 *
 * ⚠️ Duvar çizip sonra kroki çizen kullanıcı Ctrl+Z'de KROKİYİ geri alır; kroki
 * çizip sonra duvar çizen ise DUVARI. Araca göre dallanmak yanlış olurdu —
 * kullanıcı krokiyi bitirip seçim aracına dönmüş olabilir.
 */
export function shouldUndoSketch(): boolean {
  return useUiStore.getState().sketchUndoStack.length > 0 && lastSketchTick > lastDrawingTick
}

/** Yineleme için aynı kural: kroki yığını doluysa ve son iş krokiydiyse. */
export function shouldRedoSketch(): boolean {
  return useUiStore.getState().sketchRedoStack.length > 0 && lastSketchTick > lastDrawingTick
}
