---
type: decision
date: 2026-08
---

# Mahalin kullanım tipi

Talep dokümanı madde 104. `Room.usageType`, opsiyonel; liste + etiket kuralı
`core/roomUsage.ts`'te (K116).

## Referansta karşılığı YOK — liste TASLAK

WebCAD'in `Room`'u: `{ id, pointIds, label, labelPos, measuredArea,
centralVentilation, topSideOpenable }`. Kullanım tipi diye bir alan yok.

⚠️ Ekran görüntülerindeki **"Tanımsız" bir tip DEĞİL** — boş `label`'ın
arayüzdeki karşılığı. Liste tipi diye okunursa yanlış bir enum üretilir.

`ROOM_USAGE_TYPES` YİRMİ BEŞ tip taşıyor (K144'te on tip eklendi;
⚠️ `balcony` etiketi "Balkon (Açık)" oldu, DEĞERİ korundu — kapalı balkon ayrı
tip) ve **analist onayı bekliyor**. Üstüne
kural yazma: "hangi cihaz hangi mahale konabilir" AYRI bir tablo ve o tablo hâlâ
yok (`docs/api-eksikleri-hata-kontrol.md`, Hata3). Liste değişince değişecek TEK
yer bu dosya.

## Serbest metin ad YOK (K117)

`Room.name` modelden KALKTI. Kullanıcı kendi metnini yazmıyor, hazır listeden
seçiyor — yazılabilir tek yol kaldırılınca alanın kaynağı da kalmadı ve
yazılamayan bir alan zamanla çürür.

**Etiketin TEK sahibi `getRoomDisplayName(usageType)`:** tipin adı, tip yoksa
`"Tanımsız"`. Tüketiciler: sahnedeki etiket, hayalet katman (`Ghosts.tsx`) ve
hata kontrollerindeki "Mahal: X" satırı.

Eski kayıtlarda kalan `name` anahtarını zod sessizce düşürür; dosyalar açılmaya
devam eder.

## Tanımlama YERİ: özellik paneli

Mahal `SelectableKind`'a girdi ama **`resolveArchitectureTarget` zincirine
GİRMEDİ** — seçim `useSelectionTool`'un "boşluğa tıklama" dalında yapılıyor.
Gerekçeler ve tuzaklar için K117'ye bak; özeti:

- Zincire girseydi her hover'da yüz taraması yapılırdı.
- Mahalin İÇİNDEN çerçeve seçimi başlatmak imkânsız olurdu.

⚠️ `pruneSelection`'ın son satırı "geri kalan her şey sembol" idi; `room` oraya
düşünce seçim anında ve sessizce siliniyordu. Yeni tür eklerken o dosyaya bak.

⚠️ Mahal SİLİNEMEZ/dönüştürülemez (duvarların türevi). Panel "Sil"i ve grup
dönüşümlerini gizler (`PropertyPanelShell.isDeletable`).

⚠️ Panelde "Tip seçilmedi" için AYRI sentinel (`'none'`) kullanılıyor:
`PropertySelectField` boş string'i çoklu seçimde AYRIŞAN değer sayıyor.

## Tuzak

1. **`reconcileRooms` tipi de korumak zorunda.** Duvar taşınınca oda yeniden
   eşleştiriliyor ve kayıt alan alan yeniden kuruluyor. `usageType` eklenmeseydi
   kullanıcı duvara her dokunduğunda tip sessizce silinirdi — adın K31'de
   yaşadığı hatanın aynısı. Alanlar tek tek yazılır (`...existing` DEĞİL) ki
   yüzden gelen taze `wallIds` eskisiyle ezilmesin.
2. **`undefined` alanı SİLER.** Modelde alanın yokluğu "tip belirtilmemiş"
   demek ve `toRoomJson` alanı dosyaya hiç yazmıyor; store da `delete` etmeli,
   yoksa iki taraf farklı şey söyler. Opsiyonelliğin gerekçesi
   `AreaObject.axisId` ile aynı: göç yok, bit-bit tur bozulmasın.

## Sahne içi düzenleme kutusu SİLİNDİ

`RoomDefinitionEditor`, `useRoomNameTool`, `architectureUiStore.editingRoomId`
ve `findRoomLabelAt` korumaları K117'de kaldırıldı — tanımın tek yeri panel.
`core/roomLabel.ts`'teki `isPointInRoomLabel`/`getRoomLabelBounds` duruyor ama
çağıranı YOK.

## Bu adıma GİRMEYENLER

- `centralVentilation` / `topSideOpenable` — K32'nin ertelediği iki alan.
  Gerekçe "menfez aracı yazılınca kararlaştırılacak"tı; menfez ve Hata10 (K115)
  artık var, yani **vadesi geldi**.
- `Opening`'in WebCAD rol alanları: `entrance`, `buildingEntrance`,
  `boilerRoom`, `apartmentNumber`. Kazan dairesi kimliği referansta ODADA DEĞİL
  KAPIDA duruyor. Bunlar K115'in açık bıraktığı "dışarıdan erişim" sorusunu da
  çözebilir — giriş kapısı işaretli olsaydı graf tohumu tahmine dayanmazdı
  (bkz. validation-rules.md).

## Toplu tanımlama kipi (K145)

Araçlar > "Mahalleri Tanımla" AKTİF KATTAKİ tanımsız mahalleri tek tek gezer:
mahal sahnede seçim mavisiyle ve daha dolu (`roomDefinitionFillOpacity`)
çizilir, kamera ona gider (`uiStore.requestFocus` → `ViewportFocus`), altta
yüzen kart (`ui/canvas/RoomDefinitionCard.tsx`) tipleri rozet olarak sunar.
Klavye: 1–9 ilk dokuz rozet, ← → duraklar arası, Esc çıkış.

⚠️ Kuyruk BAŞLARKEN donar — `architectureUiStore.roomDefinitionQueue` yalnız
id tutar. Canlı türetilseydi tip verilen mahal kuyruktan düşer, ilerleme
göstergesi gözün önünde değişir ve geri gitmek imkânsız olurdu. Geometri ise
her render'da `core/roomDefinition.ts` → `getRoomDefinitionQueue` ile taze
okunur (kip açıkken duvar oynatılabilir).

⚠️ Sıra id'den değil KONUMDAN: üstten alta, sonra soldan sağa, 100 cm'lik satır
toleransıyla. id sırası çizim sırasıdır ve kamerayı çizimin bir ucundan
öbürüne savurur.

⚠️ Tip yazılınca bir sonraki değil, ilk TANIMSIZ durağa geçilir; kalan yoksa kip
kendini kapatır. `advanceAfter` içindeki harita o anda BAYATTIR (yazım henüz
render'a yansımadı), az önce tanımlanan mahal ayrıca elenir.

⚠️ Kartın geometri kaynağı `getFloorRoomStops`: kattaki TÜM mahalleri verir
(`isDefined` bayrağıyla), yalnız tanımsızları değil — geri gidilen durak artık
tanımlıysa da kamera oraya gitmeli.

⚠️ Kip açılırken seçim temizlenir: açık seçim hem ikinci bir mavi vurgu hem de
sağda ikinci bir tanımlama arayüzü demekti.

Menü maddesi salt görüntülemede ve mimari dışı görünümlerde pasiftir.

### Gözden geçirme turu, arama, odak payı (K146)

Tanımsız mahal kalmadıysa menü maddesi PASİF OLMAZ; kip TÜM mahalleri gezer
(gözden geçirme turu). ⚠️ Tur sıfırlama değil, hiçbir tip silinmez — bu yüzden
onay penceresi de yok. Madde yalnız katta hiç mahal yokken pasif.

⚠️ `advanceAfter` önce ileride TANIMSIZ durak arar, bulamazsa SIRADAKİ durağa
geçer; kip yalnız SON durakta kapanır. "Yalnız tanımsız ara" hâli gözden geçirme
turunda ilk düzeltmeden sonra kipi kapatıyordu.

Rozetlerde arama var (`RoomUsagePicker`, `includesTr` ile Türkçe duyarsız).
⚠️ Rozetlerde RAKAM KISAYOLU YOK: 1–9 vardı, kullanıcı kaldırttı — dokuz tuş
yirmi beş tipe yetmiyordu. Bu adlarla yeni kod yazma (`QUICK_KEY_COUNT` silindi).
⚠️ Kutu autoFocus ALMAZ: odak kutuya gitseydi ok tuşlarıyla durak gezinmesi
çalışmazdı. ⚠️ Kutuda Escʼi kutunun kendisi işler: pencere dinleyicisi yazı
alanlarını atlıyor.

Kipten çıkış ÜÇ yolla: kartın X'i, Esc ve TUVALE SOL TIK
(`scene/useRoomDefinitionExit.ts`). ⚠️ Orta ve sağ tuş çıkarmaz — biri kaydırma,
öteki araçtan çıkma jesti.

Odak payı bilerek cömert (`FOCUS_MARGIN_RATIO` 0,85 / asgari 150 cm): kullanıcı
bulgusu "fazla yakın, nerede olduğumuzu anlamıyoruz" — mahalin bağlamı da
görünmeli.
