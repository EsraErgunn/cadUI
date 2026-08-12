# Baca / havalandırma ağzı: cihaz kenarında SERBEST

Tür: decision · 2026-08

Baca ve havalandırma damga değil GÜZERGÂH (`InstallationLineKind`), ve cihazdan
çıktıkları ağız metadata'da ilan edilmiş sabit bir port DEĞİL.

## Ağız nerede

- Cihazın gövde dikdörtgeni metadata'da `dischargeBox` ile verilir. `bounds`
  KULLANILAMAZ — o, gaz giriş çıkıntısını da kapsayan tutma kutusu; ağız oraya
  oturtulsaydı çizilmiş gövdenin dışında, boşlukta dururdu.
- Ağız bu kutunun çevresinde imlece en yakın kenara oturur ve kenar boyunca
  serbestçe kayar (`core/dischargeOutlet.ts` → `resolveOutletOnBox`). İmleç
  gövdenin İÇİNDEYKEN de dışındayken de aynı hesap çalışır.
- İki uçta yarım kanal genişliği pay bırakılır ki kanal kenardan taşmasın. Gövde
  kanaldan darsa (şofben 24 cm, havalandırma 30 cm) pay sığmaz ve ağız kenarın
  ORTASINA sabitlenir — taşma kaçınılmaz, hiç değilse simetrik.
- SVG'lerde çizili bir bağlantı ağzı YOK ve olmamalı: ağız her yerde olabildiği
  için sabit bir kol yanlış yeri işaret ederdi. Ağzı kullanıcıya gösteren şey
  `DischargePreview`'daki ağız çizgisi (kanalın tam genişliğinde).

## Modeldeki yeri

`InstallationEndpointTarget`/`LineEndAttachment` üçüncü bir varyant kazandı:
`{kind:'outlet', elementId, position, direction}`. Konum sembolün YEREL (SVG)
uzayında saklanır, planda değil — cihaz taşınınca/döndürülünce ağız portlarla
aynı dönüşümden geçip kendiliğinden yerinde kalır.

⚠️ **Tuzak:** elemana bağlı ucu arayan her yer artık `kind === 'port'` denetimi
ile YETİNEMEZ; `getTargetElementId(target)` sorulmalı. Unutulan bir yer ağzı
sessizce kopuk bırakır (taşıma yayılımı, silme, kat temizliği, pano).

⚠️ `ApplianceOutlet.position` metadata'daki kardeşinin aksine `readonly` DEĞİL:
tip store'da yaşıyor, immer draft'ı readonly tuple'ı yazılabilir taslağa
çeviremiyor.

## Adet kuralı (kullanıcı kararı)

Bir cihazda **ya tek baca, ya bir veya daha çok havalandırma** — ikisi bir arada
olmaz (`canAttachDischarge`). Doluluk `isPortOccupied` ile değil hattın TÜRÜNDEN
türetilir (`getAttachedDischargeKinds`): bağlantı kaydı yalnız "bu uç şu cihaza
tutunuyor" der, kanalın baca mı havalandırma mı olduğunu hattın kendisi bilir.

## İlk segment

Cihazdan çıkan ilk segment ağzın eksenine KİLİTLİ
(`dischargeDraft.ts` → `projectOntoOutletAxis`); sonraki köşeler serbest. Serbest
bırakılsaydı ızgaraya yuvarlanan ikinci tık eksene hemen hiç düşmez ve kanal
cihazdan eğik çıkardı.
