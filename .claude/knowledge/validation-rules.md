---
type: decision
date: 2026-08
---

# Hata kontrolleri — kural motoru

`core/validate.ts` ilk commit'ten beri boştu; `hata-kontrol.docx` ile dolduruldu
(K115). **On kuraldan sekizi yazıldı, ikisi verisi olmadığı için hiç açılmadı**
(bkz. `docs/api-eksikleri-hata-kontrol.md`).

## Dosya haritası

| Dosya | İşi |
|---|---|
| `core/validationModel.ts` | Sözleşme: `ValidationRuleId`, `VALIDATION_MESSAGES`, `ValidationIssue`, `ValidationFocus`, `ValidationSource`. **Yaprak modül** — hiçbir kural dosyasını import etmez. |
| `core/validate.ts` | `validateProject` + sözleşmeyi yeniden dışa verir. Tüketicilerin tek kapısı. |
| `core/validateArchitecture.ts` | Hata1 (mimari plan), Hata2 (kapı erişimi) |
| `core/validateInstallation.ts` | Hata1 (tesisat plan), Hata4 (marka/model), Hata5 (mahal dışı cihaz), Hata7 (sayaç birim/abone) |
| `core/validateGasNetwork.ts` | Hata6 (hat sonlandırma) |
| `core/validateDischarge.ts` | Hata9 (baca), Hata10 (menfez) |
| `core/roomTopology.ts` | Ortak türetim: yüz ↔ oda eşleşmesi, duvar başına mahal sayısı, nokta → mahal |
| `core/roomAccess.ts` | Kapılardan dışarıya erişim grafı |
| `ui/validation/` + `ui/WarningList.tsx` | Üst bar açılır listesi, satırlar, "göster" |
| `scene/ViewportFocus.tsx` | "göster"in kamera ayağı |

⚠️ **Sözleşme `validate.ts`'te DEĞİL `validationModel.ts`'te.** Kural dosyaları
`VALIDATION_MESSAGES`'ı `validate.ts`'ten alsaydı döngü kurulurdu
(validate → kurallar → validate). Yeni kural dosyası da sözleşmeyi yaprak
modülden almalı.

## Ortak türetim: neden `roomTopology`

Dört kural aynı iki soruyu soruyor: **"bu nokta hangi mahalde"** ve **"bu
duvarın öbür yüzü dışarısı mı"**. İkisi de `findRoomFaces` yüz taramasından
türüyor. Topoloji kat başına BİR kez `validateProject`'te kurulur ve iki kural
dosyasına da parametre olarak geçer — kural başına yeniden taransaydı aynı
pahalı hesap dört kez yapılırdı.

- `faceCountByWallId`: duvarın kaç mahali sınırladığı. Dış yüz (negatif alanlı
  sonsuz çevrim) `findRoomFaces` tarafından zaten eleniyor, yani **2 = iki
  mahal arası, 1 = dış kabuk**.
- `isWallOpenToOutside(wallId)` = `count < 2`. "Menfez atmosfere çıkar" kuralı
  tek satır bunun üstünde: dokümandaki iki görselin farkı tam olarak bu.
- Yüz ↔ `Room` eşleşmesi **TAM KÜME eşitliğiyle** (`Room.tsx` ile aynı kural).
  `reconcileRooms`'un kapsama gevşetmesi tekrarlanmaz — o, kullanıcının verdiği
  adı yaşatmak için var. Eşleşmeyen yüz yine mahaldir, varsayılan adla raporlanır.

## Kural notları (koddan okunmayanlar)

- **Hata2 GRAF.** "Her mahalin bir kapısı olsun" değil, "dışarıdan kapılarla
  ulaşılabilsin". ⚠️ Dışarıya açılan tek kapısı olmayan kat = bütün mahaller
  hatalı. Merdiven boşluğunun ayrı çizilmediği üst kat planlarında beklenen bu
  olmayabilir — **analist onayına açık**, değiştirmek `roomAccess.ts` içinde
  tek fonksiyon.
- **Mimari plan yokken mahal kuralları KOŞMAZ** (Hata5/9/10). Yoksa tek eksik
  (duvarsız kat) onlarca satır doğururdu; "mimari kat planı çizilmelidir"
  satırı tek başına konuşsun.
- ⚠️ **Kavşak uç DEĞİLDİR.** `nearestLine` yerleştirmesinde
  (`placeElementWithStub`) bağlantıların İKİSİ de KOLA yazılıyor, ana borunun
  ucuna kayıt yazılmıyor — "ocakla bitirdim ama hâlâ hata veriyor" bundandı
  (2026-08-20). Üstüne başka hat tutunan nokta kavşaktır, atlanır; devamı o
  kolun kendi denetiminde. `placeElementAtLineEnd` (sayaç) bağlantıyı hattın
  KENDİ ucuna yazar, orada bu kör nokta yok.
- **Hata6 üç serbest uç hâli var:** bağlantı kaydı yok / yakıcı olmayan bir
  elemanda bitip oradan başka hat çıkmıyor / eleman zaten yok. **Servis kutusu
  uç saymaz** (gazın kaynağı), **`floorPipeLinks` de saymaz** (hat üst/alt kata
  geçiyor). Deşarj hatları (baca, havalandırma) gaz taşımaz, kapsam dışı.
- **Hata9 bacanın DEŞARJ ucunu** arar: cihaza tutunmayan uç. İki uç da bağlıysa
  ya da hiçbiri değilse son köşe — çizim yönü cihazdan dışarı doğru
  (`dischargeStart.ts`).
- **Hata10 serbest menfezi SAYMAZ.** Duvara oturmayan menfezin neyin içinden
  dışarı açıldığı belli değil; "belki açılıyordur" diye hatayı gizlemek kuralı
  işlevsiz kılardı. Aynı mahaldeki birden çok cihaz TEK satır üretir: eksik olan
  menfez, cihaz değil.

## Sonuç yaşayan bir değer DEĞİL

Denetim çizim her değiştiğinde değil, **liste açıkken** çalışır
(`useProjectValidation`): tarama kat başına yüz taraması yapıyor, duvar
sürüklenirken her karede tekrarlanamaz.

⚠️ Tazeleme **abonelikle** geliyor, render sırasında hesaplamayla değil:
doğrulamanın girdisi React'in görmediği bir dış kaynak (store anlık görüntüsü)
ve render'da çağrılsaydı **React Compiler onu girdisiz bir sabit sanıp
dondururdu**. Aynı sebeple efekt gövdesinde `setState` de yok — lint kuralı
(`react-hooks/set-state-in-effect`) zaten geçirmiyor.

Düğme sayıyı ancak TAZE sonuç varken gösterir (`isFresh`): çalıştırılmamış bir
denetimi "0 hata" diye yazmak K79'un tam tersi.

## Satır düzeni: "göster" SOLDA, künyenin altında

Referans görselde sağ kenarda duruyor; kullanıcı isteğiyle sola, kural metniyle
aynı sütuna alındı — uzun kural metinlerinde sağdaki düğme kayboluyordu.
Negatif sol pay düğmenin kendi iç boşluğunu yutuyor ki yazı üstteki metinle tam
hizalansın. Görsele bakıp "sağa geri alalım" DENMESİN diye buraya yazıldı.

## "göster" üç şeyi birden yapar

Kata geç + nesneyi seç + kamerayı taşı. Üçü olmadan hata görünmüyor: yanlış
kattaki seçim hiç çizilmez, ekran dışındaki seçim de görünmez.

`ValidationFocus` **görünümü de taşır** (`architecture` / `installation`): iki
panel ayrı seçim store'una abone ve mimari hata tesisat görünümündeyken
bulunabiliyor. Karşı görünümün seçimi temizlenir.

Kamera ayağı `uiStore.pendingFocusBounds` → `scene/ViewportFocus.tsx`. Zoom/pan
hâlâ kamerada yaşıyor (bkz. `cameraViewport.ts`); store'da duran şey görüntü
değil, DOM'dan verilmiş **tek seferlik bir emir** ve sahne uygular uygulamaz
siliyor — silinmezse aynı hataya ikinci kez basmak hiçbir şey yapmazdı.

## Bağlanmayanlar

"Test Et" ve "Gönder" PASİF kaldı. Doküman yalnız hata kontrolleri ekranını
tarif ediyor; "Test Et"in ne yaptığı yazılı değil. "Gönder"in artık sebebi var
(hatalar giderilmeden proje onaya gidemez) ama onaya gönderme akışı — eksik
evrak yanıtı dahil — proje listesi ekranında yaşıyor (`useProjectActions`).
