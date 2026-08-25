# Yakıcı cihaz sembolleri: WebCAD'in dili, kendi çıkışlarımız

Deşarj çıkışı olan altı eleman (`dischargeBox` taşıyan: Ocak, Soba, Şofben,
Kombi, Kazan, Diğer Yakıcı Cihaz) referans uygulamanın
(https://plnr.webcad.com.tr/) sembol diline çevrildi: `cooker` → dört göz,
`stove` → dikey taramalı panel, `otherconsumption` → üç daire, `boiler` /
`heater` / `bigboiler` → gövde içinde **G** işareti.

## Gövdeye ve giriş çıkıntısına DOKUNULMAZ

Her cihazın `dischargeBox`'ı çizilmiş gövde dikdörtgeninin BİREBİR aynısıdır
(ör. `boiler`: rect(10,6,40,42) ↔ `{min:[10,6], max:[50,48]}`). Baca ve
havalandırma ağzı bu kutunun üstünde kayar. Gövde büyütülür/kaydırılırsa ağız
çizimin dışında, boşlukta durur.

Aynı şekilde soldaki gaz girişi çıkıntısı `ports[in]`'in konumuna gider —
kısaltmak sembolü porttan koparır.

Bu yüzden yeniden çizim **yalnız iç işareti** değiştirir; `*.meta.json`
(origin / ports / bounds / dischargeBox) hiç açılmaz.

## ⚠️ SVGLoader `<text>` BASMAZ — harf `<path>` olmak zorunda

`symbolLoader.ts` sembolü three.js geometrisine `SVGLoader` ile çeviriyor ve
loader metin elemanını sessizce ATLAR: sahnede harf görünmez, hata da vermez.
`ui/pdf/symbolMarkup.ts` ise aynı dosyayı HAM metin olarak gömdüğü için harf
KÂĞITTA çıkardı — ekranla kâğıt sessizce ayrışırdı.

Bu yüzden WebCAD'in "G" damgası yay + çizgi olarak elle yazıldı:

```
<path d="M25.66 17.34 A8 8 0 1 0 25.66 28.66 L25.66 23 L20 23" />
```

Yay komutu (`A`/`a`) SVGLoader'da desteklidir (`parseArcCommand`). Uç noktalar
merkeze göre `r·cos45°` ile hesaplanır; yarıçapı değiştiren, iki uç noktayı da
birlikte değiştirmeli.

## Sobanın bacası sembolden ÇIKTI

Eski soba çiziminde gövdenin sağ üstünden çıkan kısa bir eğik çizgi vardı.
Baca artık sembolün parçası değil bir GÜZERGÂH (`InstallationLineKind`,
deşarj portundan çizilir) — sabit bir baca çizgisi, kullanıcı bacayı başka
yönde çizdiğinde çelişki üretiyordu.

## Ocak zaten aynıydı

`stove` (Ocak) ile WebCAD'in `cooker`'ı aynı sembol (kare + dört göz);
dosyaya dokunulmadı.
