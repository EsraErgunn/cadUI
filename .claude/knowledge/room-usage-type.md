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

`ROOM_USAGE_TYPES` on beş tip taşıyor ve **analist onayı bekliyor**. Üstüne
kural yazma: "hangi cihaz hangi mahale konabilir" AYRI bir tablo ve o tablo hâlâ
yok (`docs/api-eksikleri-hata-kontrol.md`, Hata3). Liste değişince değişecek TEK
yer bu dosya.

## Ad ve tip AYRI şeyler

- `usageType` → kuralların baktığı sınıflandırma ("Yatak Odası")
- `name` → kullanıcının planda okumak istediği şey ("1 nolu daire mutfağı")

Tip adın yerine geçseydi aynı tipteki iki mahal planda ayırt edilemezdi.

**Etiket kuralının TEK sahibi `getRoomDisplayName(name, usageType)`:**
ad → kullanım tipinin adı → `"Tanımsız"`. Üç tüketici de oradan geçiyor —
sahnedeki etiket, etiketin VURUŞ TESTİ (`useRoomNameTool`) ve hata
kontrollerindeki "Mahal: X" satırı. Vuruş testi çizilen metne bakmak zorunda:
ham addan (boş) hesaplanan kutu hiç tıklanamazdı.

## Mahal ADSIZ doğar

`DEFAULT_ROOM_NAME` artık `''` (eskiden `'Oda'`). Zorunlu bir sonuç: sabit bir
ad hep dolu olsaydı etiket tipe hiç düşemez, "Tanımsız" hiç görünmezdi.

⚠️ Buna bağlı olarak **boş ad artık REDDEDİLMİYOR** — adı temizlemek, etiketi
tipe düşürmenin tek yolu. "Aynı adı yeniden yazma" kuralı (geçmişe boş adım
eklememek için) DURUYOR.

## İki tuzak

1. **`reconcileRooms` tipi de korumak zorunda.** Duvar taşınınca oda yeniden
   eşleştiriliyor ve kayıt alan alan yeniden kuruluyor. `usageType` eklenmeseydi
   kullanıcı duvara her dokunduğunda tip sessizce silinirdi — adın K31'de
   yaşadığı hatanın aynısı. Alanlar tek tek yazılır (`...existing` DEĞİL) ki
   yüzden gelen taze `wallIds` eskisiyle ezilmesin.
2. **`undefined` alanı SİLER.** Modelde alanın yokluğu "tip belirtilmemiş"
   demek ve `toRoomJson` alanı dosyaya hiç yazmıyor; store da `delete` etmeli,
   yoksa iki taraf farklı şey söyler. Opsiyonelliğin gerekçesi
   `AreaObject.axisId` ile aynı: göç yok, bit-bit tur bozulmasın.

## Düzenleme kutusu

`RoomNameEditor` → **`RoomDefinitionEditor`**. Ad taslakta bekler (her tuş ayrı
bir Ctrl+Z adımı olmasın), TİP seçilir seçilmez yazılır.

⚠️ Dışarı tıklama kapsamı kutunun TAMAMI olmalı, yalnız input değil: yakalama
fazındaki `pointerdown` input'u sayıyordu ve açılır listeye tıklamak kutuyu
kapatırdı. `TextLabelEditor` aynı deseni paylaşıyor — orada tek alan olduğu için
sorun çıkmıyor, ama oraya ikinci bir alan eklenirse aynı tuzak.

## Bu adıma GİRMEYENLER

- `centralVentilation` / `topSideOpenable` — K32'nin ertelediği iki alan.
  Gerekçe "menfez aracı yazılınca kararlaştırılacak"tı; menfez ve Hata10 (K115)
  artık var, yani **vadesi geldi**.
- `Opening`'in WebCAD rol alanları: `entrance`, `buildingEntrance`,
  `boilerRoom`, `apartmentNumber`. Kazan dairesi kimliği referansta ODADA DEĞİL
  KAPIDA duruyor. Bunlar K115'in açık bıraktığı "dışarıdan erişim" sorusunu da
  çözebilir — giriş kapısı işaretli olsaydı graf tohumu tahmine dayanmazdı
  (bkz. validation-rules.md).
