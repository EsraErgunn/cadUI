# Hata kontrolleri — yazılamayan iki kural

**Durum:** `hata-kontrol.docx` on kural tarif etti, **sekizi yazıldı** (K115).
Bu belge kalan ikisinin neden yazılmadığını ve neyin gerektiğini toplar.

Kural kimliği bile açılmadı (`VALIDATION_RULE_IDS` sekiz eleman): yarım bir
kural, listede "çalıştı ve temiz çıktı" diye okunurdu — K79'un reddettiği şeyin
ta kendisi.

## Hata3 — "Mahal yakıcı cihaz için uygun değildir"

Doküman: *"Uygun olmayan mahallere cihaz eklenmesi durumunda ilgili hata mesajı
yer almalıdır. Örneğin kullanıcı yatak odasına ocak eklemek isterse sistem buna
izin vermemelidir. Mahal listesi çok fazla olduğu için tek tek bu durumlar
belirtilmemiştir."*

**Engel — mahalin TİPİ yok.** `core/model.ts` → `Room` yalnız `name: string`
taşıyor, varsayılanı `'Oda'` (`DEFAULT_ROOM_NAME`) ve kullanıcı planda çift
tıklayıp serbestçe değiştiriyor (`scene/RoomNameEditor.tsx`). Sabit bir mahal
listesi, seçim kutusu ya da kod alanı YOK. Serbest metinden tip çıkarmak
("içinde 'yatak' geçiyorsa yatak odasıdır") kuralı yazım hatasına ve dil
farkına bağlar.

**Gereken iki şey:**

1. **Mahal tipi listesi.** Analistten TAM liste (mutfak, banyo, yatak odası,
   salon, kazan dairesi, balkon, hol, …). Bu geldiğinde `Room`'a `type` alanı
   eklenir — model sözleşmesi değişikliği, yani ayrı bir karar; ad alanı
   KALIR (tip "Yatak Odası" iken kullanıcı "Çocuk Odası" yazabilmeli).
2. **Cihaz ↔ mahal uygunluk tablosu.** Hangi yakıcı cihaz hangi mahal tipine
   konabilir. `BURNER_APPLIANCE_TYPES` altı tür (ocak, soba, şofben, kombi,
   kazan, diğer) — matris altı satır × mahal tipi sayısı kadar sütun.

**Not:** doküman "sistem buna izin vermemelidir" diyor, yani kural yalnız hata
LİSTESİ değil YERLEŞTİRME engeli de olabilir. İkisi farklı iş: engel
`plumbing/core/elementAttach.ts` tarafında, liste `core/validate.ts` tarafında.
Hangisi (ya da ikisi birden) isteniyor, netleşmeli.

## Hata8 — "Kolon projelerinde topraklanma eklenmesi zorunludur"

Doküman: *"Proje tipi kolon projesi ise topraklanma nesnesinin eklenmesi
zorunludur."*

**Birinci engel (asıl) — "topraklanma" diye bir nesne yok.** Ne
`INSTALLATION_ELEMENT_TYPES`'ta ne `PointSymbolType`'ta ne `AreaObjectType`'ta
karşılığı var. En yakın şey `InsulationProperties.isGrounded` + `groundingType`
— ama o, İZOLASYON nesnesinin "topraklandı mı" alanı; "projeye topraklama
eklenmiş mi" sorusunun cevabı değil ve izolasyon yoksa sorulamıyor bile.

Sorular:

- Topraklanma **ayrı bir nesne mi** (paletten yerleştirilen bir sembol), yoksa
  var olan bir elemanın alanı mı? Referans WebCAD'de karşılığı nedir?
- Ayrı nesneyse hangi aileye giriyor — nokta sembolü (Desen A, ölçüsüz) mü,
  alan nesnesi (Desen B) mi? Bir şeye mi tutunuyor (servis kutusu, kolon)
  yoksa serbest mi?
- Kat başına mı, proje başına mı zorunlu? (Kural metni proje başına okunuyor:
  künyesinde kat yok.)

**İkinci engel — proje tipi editöre bağlanmamış.** Bu bir sunucu eksiği DEĞİL:
`GET /api/projects/{id}` yanıtı `projectTypeName` taşıyor (2026-08-16 OpenAPI
envanteri, bkz. `api-eksikleri-proje-detayi.md`). Arayüz tarafında iki boşluk
var:

1. `src/api/projectDetail.ts` → `projectDetailDtoSchema` bu alanı okumuyor,
   `ProjectServerFields` on alanda duruyor.
2. Editör proje detayını HİÇ çekmiyor — `useProjectPersistence` yalnız
   `projectId` biliyor.

Ve bir sözleşme sorusu kalıyor: detay ucundaki `projectTypeName` bir GÖRÜNEN AD
mı (`"Kolon"`), liste ucundaki `projectType` ise KOD mu (`"KOLON"`)? İkisi
farklı şeyse "kolon projesi" karşılaştırması hangisine göre yazılacak?
Ada göre yazılırsa sunucudaki etiket değişince kural sessizce çalışmaz olur.

## Dokümandaki iki tutarsızlık

- Hata6'nın üstünde bağlamsız bir başlık duruyor: *"Tüketim vanası (sayaçtan
  önceki vana)"*. Ayrı bir kural mı, Hata6'nın parçası mı, artık bir satır mı?
  Bugün hiçbiri olarak ele alınmadı.
- Hata7'nin örnek künyesi yarım: *"Kat: Y. Kat Mahal: X. Kat diye."*

## Kapı kuralı: KAPANDI

Hata2 önce GRAF olarak yazılmıştı ("dışarıdan kapılarla ulaşılabilsin"). Dış
kapısı çizilmemiş kat planlarında bütün mahalleri hatalı gösterdiği için
kullanıcı kararıyla GEVŞEK okumaya çevrildi: **"her mahalin en az bir kapısı
olsun"** (bkz. K115). Bu madde artık analist onayı beklemiyor.

## Bilgi: "tüketim elemanı" listesi dokümanda VAR

Hata6 metni sonlandırıcıları sayıyor: **ocak, soba, şofben, kombi, kazan**.
Kod bunları `BURNER_APPLIANCE_TYPES` üzerinden okuyor ve listeye BİR tür daha
katıyor: `otherAppliance` ("Diğer Yakıcı Cihaz" — tipi Ocak/Fırın). Doküman onu
saymıyor ama model onu yakıcı cihaz sayıyor; sonlandırıcı kabul edilmeseydi
kullanıcı o cihazı koyup hattı bitiremezdi.

Ayrıca kodda dokümanda YAZMAYAN bir kabul var: **servis kutusu uç saymaz**
(gazın kaynağı, hattın sonu değil). Doküman "sayaç, filtre gibi elemanlar hattı
sonlandırmaz" derken kaynağı hiç konuşmuyor. İkisi de analist teyidine açık ama
kuralı bloke etmiyor.
