# StarCAD — Web Tabanlı Doğal Gaz Tesisat Editörü

StarCAD, doğal gaz tesisat projelerini tarayıcıda çizmek için geliştirilen bir CAD uygulamasıdır.
Kullanıcı 2B planda duvar ve odaları çizer, üzerine gaz borusu, vana, sayaç ve cihazları yerleştirir;
projeyi 3B ve izometrik görünümde inceler ve malzeme dökümüyle birlikte PDF olarak dışa aktarır.

## Özellikler

- **2B çizim:** duvar, oda, kapı/pencere, ölçü ve metin etiketleri
- **Tesisat:** boru hattı çizimi, vana/sayaç/cihaz yerleştirme, kot (yükseklik) yönetimi, katlar arası geçiş
- **3B ve izometrik görünüm:** aynı sahnenin Three.js ile üç boyutlu ve izometrik gösterimi
- **Çok katlı projeler:** kat ekleme, kopyalama ve sıralama
- **Geri al / yinele** desteği
- **PDF çıktısı:** çizim ve malzeme dökümü
- **Yönetim paneli:** proje, firma, kullanıcı, poliçe ve evrak ekranları (rol bazlı)

## Teknolojiler

| Alan | Kullanılan |
| --- | --- |
| Arayüz | React 19, TypeScript, Vite, Tailwind CSS |
| 2B / 3B render | Three.js, react-three-fiber, drei |
| Durum yönetimi | Zustand, immer, zundo |
| Veri ve yönlendirme | TanStack Query, React Router, Zod |
| PDF | jsPDF, svg2pdf.js |
| Test ve kalite | Vitest, Testing Library, ESLint, React Compiler |

## Kurulum

Gereksinim: Node.js 20+ ve çalışan bir StarCAD API sunucusu.

```bash
npm install
cp .env.example .env   # VITE_API_URL değerini kendi API adresinize göre düzenleyin
npm run dev            # geliştirme sunucusu
```

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusunu başlatır |
| `npm run build` | Tip kontrolü yapar ve üretim derlemesi alır |
| `npm run preview` | Derleme çıktısını yerelde sunar |
| `npm run lint` | ESLint ile kod denetimi |
| `npm test` | Testleri izleme modunda çalıştırır |
| `npm run test:run` | Testleri bir kez çalıştırır |

## Proje Yapısı

```
src/
├── core/        # Saf geometri ve model fonksiyonları (React içermez)
├── scene/       # Three.js sahnesi (<Canvas> içi)
├── ui/          # DOM arayüz bileşenleri (<Canvas> dışı)
├── plumbing/    # Tesisat elemanları ve boru hattı mantığı
├── isometric/   # İzometrik görünüm
├── store/       # Zustand durum depoları
├── api/         # Sunucu istemcisi
└── pages/       # Sayfa bileşenleri
```

## Dokümantasyon

- `.claude/CLAUDE.md` — değişmez kurallar, veri modeli, dizin sahipliği
- `docs/kararlar.md` — alınan mimari kararlar ve gerekçeleri
- `.claude/knowledge/INDEX.md` — tuzaklar ve açık sorular
