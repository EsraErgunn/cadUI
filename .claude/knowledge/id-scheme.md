# decision: id şeması — artan tamsayı, UUID değil

**Karar:** Kalıcı id'ler proje bazlı artan tamsayı (`nextUniqueId`) ile üretilir.
`crypto.randomUUID()` KULLANILMAZ.

**Neden:** WebCAD JSON formatıyla round-trip testi (docs/sample-project.json
yükle→serileştir→bit-bit aynı) bu id şemasına dayanıyor. UUID'ye geçilirse test
karşılaştırdığı gerçek formatla uyuşmaz, testin anlamı değişir.

**Gözden geçirme koşulu:** Ekip "WebCAD JSON'uyla bit uyumu aramıyoruz, kendi
modelimizi kuruyoruz" kararını bilinçli olarak alırsa, o zaman UUID'ye geçmek
savunulabilir — ama bu durumda round-trip testinin ne test ettiği yeniden
tanımlanmalı. Bilinçli bir karar alınmadan bu şema değiştirilmez.
