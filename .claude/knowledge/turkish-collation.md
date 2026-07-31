# gotcha: Türkçe metin karşılaştırma

## `'İ'.toLowerCase()` tek harf DÖNDÜRMEZ

JavaScript'te `'İ'.toLowerCase()` sonucu `'i'` değil, **`'i'` + birleşen nokta
(U+0307)** — iki kod noktası. Ekranda `i` gibi görünür, `===` ve `includes` ile
`'i'`ye eşleşmez. "İzmirgaz" içinde "izmir" aranınca sonuç boş döner ve hata
gözle görülmez.

Ayrıca `'I'.toLowerCase()` yerel ayara göre `'i'` ya da `'ı'` olabilir
(`toLocaleLowerCase('tr')` `'ı'` verir). Yani "duyarsız arama" yerel ayara
bağımlı hâle gelir.

**Çözüm:** `api/turkishText.ts` içindeki elle yazılmış eşleme tablosu.
`normalizeTr()` İ/ı/I → `i`, Ş/ş → `s`, Ğ/ğ → `g`, Ü/ü → `u`, Ö/ö → `o`,
Ç/ç → `c` indirger; kalanı düz `toLowerCase()`. Yerel ayardan bağımsız, tek kod
noktası. Arama karşılaştırması `includesTr()` üzerinden yapılır.

`toLowerCase()`/`toLocaleLowerCase()` ile elle karşılaştırma YAZMA — bu tabloyu kullan.

## Sıralamada `localeCompare(..., 'tr')`

Sıralarken `localeCompare` **'tr'** yerel ayarıyla çağrılır: varsayılan sırada
`ç` `c`den sonra değil `d`den önce gelmez, Türkçe alfabe sırası bozulur.
Normalize edilmiş anahtara göre sıralama da yapma — o anahtar aramaya özgüdür,
`ş` ile `s`yi aynı yere koyar.

Yer: `api/adminFirmsMock.ts` (`compareFirms`). Gerçek endpoint geldiğinde bu iş
SQL collation'ına geçer (`Turkish_CI_AS` benzeri) — istemci tarafı sıralama YOK.
