# KERNEL PANIC

**ATÜ TechBuilders · Stant Oyunu #2** — _Basma dedik. Bastın._

Kırmızı butona basan ziyaretçi, "hacklenen" sistemi 60 saniyede 5 aşamada kurtarmaya çalışır:
Ölü Piksel, Dört Renk, Işın Yolu, Renk Tuzağı ve final Basma Dedik. Her aşama sonuna kadar
oynanır ve doğruların oranına göre yeşil, açık yeşil, turuncu ya da kırmızı not alır. Overheat,
Glitch, Emergency ve Power Restored olayları her turu farklı yapar; sonunda notlardan bir ünvan
ve ayrı bir hata raporu ekranı gösterilir. **1v1 düello** modunda iki kişi aynı tablette,
bölünmüş ekranda aynı aşamaları aynı zorlukta ama farklı cevaplarla yan yana yarışır. Skor tablosu yok, internet gerekmez.

- Plan ve tasarım: [`docs/YOL-HARITASI.md`](docs/YOL-HARITASI.md) (PDF yanında)
- İlk taslaklar: `docs/taslak/`
- Ajan kuralları: [`AGENTS.md`](AGENTS.md)

## Çalıştırma

```bash
npm install
npm run dev          # http://localhost:5174
npm run dev:tablet   # aynı ağdaki tabletten açmak için
npm run check        # lint + tip + testler + derleme + uçtan uca testler
```

React 19 · TypeScript · Vite · PWA (çevrimdışı) · Vitest · Playwright
