# decision: Servis kutusu / sayaç silme — kaskad + onay

Servis kutusu proje başına TEKTİR ve tüm gaz tesisatının köküdür
(`lineSeed.ts` → `hasServiceBox`, `getLineSeedElementType`: kutu yokken ilk
boru kendiliğinden onu koyar). Önceden kutuyu silmek yalnız kutuyu
kaldırıyordu — geride köksüz bir boru/armatür/cihaz ağı kalıyordu. Artık iki
kural birlikte geçerli:

1. **Kaskad**: kutu silinince ona GAZ TAŞIYAN hat/eleman grafında ulaşılan her
   şey de gider (borular, branşmanlar, boruya oturan armatürler, cihazlar).
   Hesap `plumbing/core/installationReachability.ts` →
   `collectServiceBoxInstallation`: kutudan başlayan BFS, kenarlar
   `InstallationConnection` (port/outlet/`line` hedefi) ve hat noktalarındaki
   `inlineElementId`. Yalnız `isGasCarryingKind` hatlar taşınır — baca/
   havalandırma AYRI bir graf (element-attach.md), cihazın kanalı zaten
   `applyRemoval` içindeki `collectDischargeLineIdsForElements` tarafından
   AYRICA süpürülüyor; iki yerde aynı işi tekrarlamamak için kapsam dışı
   bırakıldı.
2. **Onay**: kutuyu içeren bir silme isteği (klavye Delete/Backspace ya da
   panel "Sil" düğmesi) doğrudan uygulanmaz. `plumbing/store/deletionActions.ts`
   → `requestSelectionDeletion` TEK karar noktası: seçimde `serviceBox` VARSA
   kaskad kapsamını hesaplayıp `usePlumbingUiStore.pendingCascadeDeletion`e
   yazar, `CascadeDeleteDialog` (mount: `EditorPage.tsx`) bunu okuyup
   onay ister. Onaylanınca TEK `removeSelection` çağrısı gider — tek Ctrl+Z.

## Sayaç aynı desenle genişledi

Sayaç (`gasMeter`) da kendi dalının TEK girişidir — silinince ÇIKIŞINDAN
erişilen boru/armatür/cihaz ağı köksüz kalırdı (komşu dairenin sayacına
GEÇİLMEZ). Kapsam `plumbing/core/meterReport.ts` →
`collectMeterDownstreamInstallation` ile hesaplanır — `buildMeterReport`'un
ZATEN kullandığı `traceMeterSubtree` gezinmesini (sayacın `out` portundan
başlar) TEKRAR YAZMAZ, aynı fonksiyonu sarar. `PendingServiceBoxDeletion` bu
yüzden `PendingCascadeDeletion`'a genelleşti (`kind: 'serviceBox' | 'gasMeter'`
diyalog metnini seçer), dosya da `CascadeDeleteDialog.tsx`'e taşındı.

## Neden iki ayrı çağrı yerine (useSelectionTool.ts + PlumbingPropertyPanel.tsx) tek fonksiyon

Silme iki yerden tetiklenebiliyor. İkisi ayrı ayrı "servis kutusu/sayaç mı"
kontrolü yazsaydı biri güncellenip diğeri unutulabilirdi —
`requestSelectionDeletion` tek adres, ikisi de oradan geçer.

## Bilinen sınır

Pano "Kes" (Ctrl+X, `clipboardActions.ts` → `cutSelectionToClipboard`) bu akışa
GİRMEDİ: servis kutusunu kesmek hâlâ onay istemeden yalnız seçili öğeleri
keser, kaskad uygulanmaz. Kullanıcı isteği yalnız "silme" içindi; kesme akışı
ayrıca ele alınmadı.
