---
type: decision
date: 2026-07-30
---

# Tema: açık (varsayılan) + koyu, class tabanlı

## Karar

Kabuk/admin renkleri `styles/index.css`'teki `@theme` token'larından gelir.
`@theme` bloğundaki değerler **açık temadır**. Koyu tema aynı token'ların
değerini `.dark` seçicisi altında değiştirir; utility class'lar (`bg-surface`,
`text-ink`, `border-edge`) hiç değişmez.

```css
@custom-variant dark (&:where(.dark, .dark *));  /* Tailwind v4: dark: class ile, medya sorgusuyla değil */
@theme { --color-surface: #ffffff; ... }          /* açık */
.dark { --color-surface: #1a2233; ... }           /* koyu */
```

Neden token override, `dark:` variant değil: her bileşene ikinci bir renk sınıfı
(`bg-white dark:bg-slate-900`) yazmak renk kararını 15 dosyaya dağıtır. Token
override'da bileşen tema bilmez.

## Neden class, neden medya sorgusu değil

Kullanıcı sol menünün altındaki düğmeyle seçiyor; seçim `localStorage`'da
(`starcad.theme`). Tailwind v4'ün varsayılan `dark:` davranışı
`prefers-color-scheme` olduğu için `@custom-variant` ile class'a çevrilmesi
ŞART — yazılmazsa `<html class="dark">` hiçbir şeyi değiştirmez.

## Tuzaklar

- `.dark` bloğu Tailwind'in `@layer theme` içindeki `:root` tanımını yenmek
  zorunda. Katmansız (layer dışı) CSS katmanlıyı yendiği için dosyanın
  `@theme`'inden SONRA ve layer dışında yazılır. `@theme` içine ikinci bir
  `.dark` bloğu koymak çalışmaz.
- `color-scheme: light/dark` da temayla dönmeli: yoksa `<select>` açılır
  listesi, onay kutusu ve kaydırma çubuğu koyu temada beyaz kalır.
- Tema class'ı React ağacı kurulmadan uygulanır (`initTheme()` main.tsx'te) —
  yoksa ilk boyamada açık tema görünüp koyuya atlar (flash).
- Aksan cyan #2BC8D4 beyaz zeminde METİN olarak okunmuyor (kontrast ~2:1).
  Bu yüzden iki token var: `--color-accent` (odak halkası/kenar, iki temada
  aynı) ve `--color-accent-ink` (aksan renkli yazı, açık temada koyulaştırılmış).

## Renk sözleşmesi (admin)

| Ne | Token | Tema |
|----|-------|------|
| Zemin / kart / kenarlık / yazı | surface(-sunken), edge, ink(-muted/-disabled) | temaya göre değişir |
| Sol menü | kendi token'ı YOK: surface-sunken + ink (ana içerikle aynı) | temaya göre değişir |
| Birincil eylem (buton, aktif sayfa no) | admin-primary (#3E5CE0) + admin-primary-ink | iki temada aynı |
| Odak halkası, aktif menü maddesi | accent (#2BC8D4) | iki temada aynı |
| Bağlantı metni | selection | temaya göre değişir (koyuda açılır) |
| Hata | danger | temaya göre değişir |

Marka sarısı #FFC107 admin arayüzünde KULLANILMAZ (eski K13 kararı iptal).
Çizim editörü kabuğundaki kullanımı sürüyor; tuvalde sarı = gaz hattı kuralı
ayrı ve değişmedi.

## Sidebar zemini = içerik zemini

Sol menü artık indigo değil; ana içerikle **aynı** zemini kullanıyor
(`bg-surface-sunken` + `text-ink`), yani ayrı bir `admin-sidebar` token'ı yok —
olsaydı iki zemin zamanla ayrışırdı. İkisi renk farkıyla değil `border-r
border-edge` çizgisiyle ayrılır. Aktif menü maddesi bir tık yukarıdaki yüzeyle
(`bg-surface`) + aksan `ring` ile belli edilir; aksan #2BC8D4 ve odak halkası
değişmedi.

Sonucu: sidebar üstündeki her şeyin rengi temayla döner. "Beyaz yazı" varsayan
sınıflar (`text-admin-sidebar-ink`, `bg-…-ink/15` hover'ları) kaldırıldı — koyu
zemin varsayan yeni sınıf yazma.

## Mantık nerede

`ui/admin/useTheme.ts` — modül düzeyinde tek durum + `useSyncExternalStore`.
Her bileşen kendi `useState`'ini tutsaydı iki tüketici ayrışırdı. Tema kalıcı
proje verisi olmadığı için `cadStore`'a girmez; `uiStore`'a da konmadı (o dosya
başka sahibin ve tema `localStorage`'a yazıyor).
