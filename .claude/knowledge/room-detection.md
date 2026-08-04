---
type: decision
date: 2026-08-05
---

# Mahal (oda) tespiti ve çizimi

## Karar

`Room = { id, wallIds, name }`. Geometri YOK, `floorId` YOK — ikisi de
duvarlardan türetilir. Poligon her karede `findRoomFaces` ile yeniden hesaplanır.

Kimlik **tam duvar kümesi eşleşmesiyle** korunur (`getWallSetKey`), eşik yok:

- Duvar taşınır/bölünür → küme güncellenir, oda aynı oda, ad yaşar.
- İçinden duvar geçer → eski çevrim yok olur, iki YENİ oda, ikisi de `"Oda"`.
- Duvar silinir → oda düşer. Ctrl+Z odayı adıyla geri getirir.

## Tuzak: saydam dolgu duvarı boyar, renderOrder çözmez

three.js saydam nesneleri AYRI GEÇİŞTE ve opak nesnelerden SONRA çizer.
`renderOrder` yalnız kendi geçişi içinde sıralar. `RENDER_ORDER.room` (10)
`wall`'dan (20) küçük olmasına rağmen oda dolgusu duvarların üstüne biniyordu.

Aynı tuzak ileride her saydam mimari katman için geçerli — sıralamayı büyütüp
küçültmek işe yaramaz.

Çözüm: dolgu poligonu duvarların **iç yüzüne** kadar çekilir
(`core/roomFill.ts` → `insetRoomPolygon`), yani duvara hiç değmez. Kenar bazında
çekilir çünkü her kenarın duvarı ayrı kalınlıkta olabilir; köşe, komşu iki
kenarın ötelenmiş DOĞRULARININ kesişimidir (köşeler tek tek ötelense kenarlar
kopardı). Oda kendi duvarlarından inceyse poligon ters döner → `undefined`,
dolgu çizilmez.

Kapsül duvarın köşedeki `r` yarıçaplı diskiyle de çakışmaz: içeri çekilmiş köşe
açıortay üzerinde `r/sin(θ/2) ≥ r` uzaktadır.

`areaCm2` bundan ETKİLENMEZ — alan duvar merkez ekseninden ölçülmeye devam eder,
küçültme yalnız çizimdedir.

## Tuzak: üçgen yelpaze içbükey odada dışarı taşar

Yelpaze (corners[0] sabit köşe) yalnız dışbükey poligonda doğrudur. L şeklindeki
odada iç köşeyi kesen üçgenler poligonun dışına taşıyordu. `triangulatePolygon`
kulak kırpma yapar; kulak testi hem içbükey köşeyi hem içine köşe hapsolan
üçgeni eler.

## Tuzak: drei `<Text>` font dosyası olmadan sessizce hiçbir şey çizmez

Font verilmezse troika varsayılanını **Google Fonts CDN'inden** indirmeye
çalışıyor; istek düşünce hata da atmıyor, 0 piksel çiziyor. Konsol tertemiz
olduğu için teşhisi zor.

Font artık repoda: `public/fonts/roboto-regular.woff` (Roboto Regular, Apache
2.0, 34 KB). **latin + latin-ext** birlikte alındı — yalnız `latin` alt kümesinde
`ğ ş İ Ğ Ş` YOK ve oda adları Türkçe. Yeni bir etiket eklerken `font` propunu
vermeyi unutma, yoksa aynı sessiz hataya düşülür. troika `.woff2` OKUMAZ.

Büyük harfe çevirme `toLocaleUpperCase('tr-TR')` ile: varsayılan locale `i → I`
üretir, `İ` değil.

## Etiket konumu: en büyük iç çemberin merkezi

Ağırlık merkezi iki türlü yanılıyordu — L odada iç köşenin boşluğuna (odanın
DIŞINA) düşebiliyor, düşmediğinde bile o köşenin dibine oturup iki satırlık
etiketi duvarın üstüne taşırıyordu. `getRoomLabelAnchor` artık duvarlardan en
uzak noktayı arıyor: kaba ızgara taraması + adım yarılayan yerel arama. Kaba
tarama şart, çünkü içbükey poligonda gradyan yanlış kola sürüklüyor.

## Oda adı: çift tıkla düzenleme

Odaya çift tık → etiketin yerinde bir input. Çift tık ortak jest veri yolundaki
`onPointerDown` akışından TÜRETİLİYOR (`useRoomNameTool`): veri yolu yalnız ham
pointer olayı taşıyor ve oraya `onDoubleClick` eklemek D'nin dosyasına yazmak
olurdu. Hangi odaya tıklandığı `findRoomFaceAt` ile bulunur — iç içe odalarda
KÜÇÜK olan kazanır.

Boş ad reddedilir, aynı ad yazılmaz (`renameRoomInDraft`); Esc taslağı atar,
Enter ve dışarı tık kaydeder. Ad değişimi tek Ctrl+Z adımıdır.

## Tuzak: drei `<Html>` AYRI bir react-dom kökü açar

`Html` içeriğini `ReactDOM.createRoot(el)` ile kendi kökünde çiziyor. O kökün
React olay işleyicisinden (`onKeyDown`, `onBlur`) yapılan store yazımı, R3F
ağacındaki aboneyi YENİDEN ÇİZDİRMİYOR: store `null`'a düşüyor ama kutu ekranda
asılı kalıyor, hata da yok. Teşhisi zor çünkü `onChange` çalışıyor (aynı kök
içinde kaldığı için).

Bu yüzden `RoomNameEditor`'da kaydetme/kapanma NATIVE `window` dinleyicisinde
(`keydown` + yakalama fazında `pointerdown`). Aynı kalıba başka bir `Html`
kullanıldığında da uyulmalı. Taslağın son hâli `useRef` ile okunur — dinleyici
kurulduğu andaki state'i görürdü.

## Grup işlemleri odaları YENİDEN HESAPLAMALI

Seçim/grup işlemleri (KK-10/KK-11) odalardan önce yazıldı; `recomputeRoomsInDraft`
çağrısı onlara sonradan bağlandı — `selectionOps` → `deleteSelection`,
`transformOps` → `transformSelection` ve `duplicateSelection`.

Bağlanmasaydı sessizce bozulurdu: silinen duvarın odası store'da hayalet olarak
kalır ve kaydedilen JSON'a sızar; çoğaltılan kapalı çevrim için oda doğmaz;
taşımada duvar bölünürse odanın duvar kümesi eskir ve oda çizimden düşer.
Regresyon testi `architectureRoomsGroupOps.test.ts`.

**Duvar topolojisini değiştiren HER yeni action bu çağrıyı yapmalı** — bölmeden
(K24) sonra, `markDirty`'den önce.

## Bilinen sınır

Kapının üstünden geçen duvar orada düğüm açmaz (K24 bölmeyi reddeder), o noktada
oda çevrimi kapanmaz. Kullanıcıya uyarı yok.

Odalar hâlâ seçilebilir NESNE değil (dolgunun `raycast`'i kapalı); çift tık
seçimden bağımsız çalışıyor. Genel nesne seçimi gelince (fay-B2) `editingRoomId`
o seçimden türetilebilir.

## Nerede

`core/room.ts` · `core/roomIdentity.ts` · `core/roomLabel.ts` ·
`core/roomFill.ts` · `store/architectureRooms.ts` · `scene/Room.tsx`.
Karar defteri: `docs/kararlar.md` K31.
