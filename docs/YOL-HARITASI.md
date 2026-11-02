# KERNEL PANIC — Stant Oyunu #2: Yol Haritası ve Tasarım Dokümanı

**ATÜ TechBuilders · Beş aşamalı "sistem çöktü" temalı stant oyunu**
Sürüm: 1.2 (Faz 8: düelloda oyunculara farklı cevaplar, düelloda Emergency yok, her yarıda kendi sonuç geçişi, banner'daki çipli logo + siber yazı, Emergency'de donan ekran ve okuma süresi, Ölü Piksel 5 ekran; tablet testi kaldı) · Tarih: 2 Kasım 2026 · Durum: yayın öncesi, sıradaki: tablette son test · Stant: **4 Kasım 2026** · Kod: `Desktop/KernelPanic`

---

## 1. Özet

Katılımcı masaya gelir, karşısında devasa kırmızı bir buton görür. Üzerinde şu yazar:
**"BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ."**
Basınca sistem "hacklenir"; katılımcı 60 saniye içinde **beş aşamayı** oynayarak sistemi kurtarmaya çalışır: **Ölü Piksel → Dört Renk → Işın Yolu → Renk Tuzağı → Basma Dedik**. Her aşama kendi içinde adım adım zorlaşan küçük bir oyundur; her adımın kendi süresi vardır. Bir hata ya da süresi biten bir adım oyunu bitirmez, yalnızca o adımı kaybettirir: aşama her zaman sonuna kadar oynanır ve doğruların oranına göre **yeşil, açık yeşil, turuncu ya da kırmızı** not alır. Oyun boyunca rastgele olaylar (overheat, glitch, acil durum, enerji geri geldi) her turu farklı yaşatır. Sonunda skor tablosu **yoktur**; katılımcı beş notun belirlediği bir **ünvan**, renkli beş modül ve (istersen) ayrı bir ekranda **hata raporu** görür.

| Madde | Karar |
|---|---|
| Hedef kitle | Herkes, kodlama bilmeyen ziyaretçiler dahil |
| Tur süresi | 60 sn (ayarlardan 45 / 75 sn); yalnızca oyuncu oynarken akar |
| Aşama sayısı | 5, sabit sırayla; her aşamada 3–13 adım (Ölü Piksel 5 ekran) |
| Puanlama | Aşama başına renk notu (§5.1), skor tablosu / nickname yok |
| İnternet / API | Yok, tamamen çevrimdışı |
| Dil | Türkçe arayüz, bazı teknik başlıklar İngilizce kalır (SYSTEM FAILURE vb.) |
| Renk paleti | Kulüp logosundan türetildi (bkz. §9) |
| Cihaz | **Android tablet** (BuildArena ile aynı stant tableti; dokunmatik, yatay, tam ekran) |
| Ses | **Açık** (stantta sesli oynanacak); hiçbir aşama sese dayanmaz |
| Teknoloji | React + Vite + TypeScript (bkz. §8) |

### Oyun adı (onaylandı)

**KERNEL PANIC** — Yazılımcıların bildiği "sistem çöktü" hatasıyla birebir örtüşür, kodlama bilmeyen biri için de ürkütücü ve akılda kalıcı bir isim. Slogan: *"Basma dedik. Bastın."*

---

## 2. Oyun akışı (ekran ekran)

```
[Açılış*] → [Attract / Buton] → [Hack geçişi] → [Beş aşama + olaylar] → [Sonuç geçişi] → [Sonuç ekranı] → [Hata raporu**] → [Reset]
                    └─ 1v1 DÜELLO: iki buton → [Hack] → [Bölünmüş ekranda beş aşama] → [Düello sonucu] → [Reset]
*yalnız APK'da   **hatalı adım varsa, ayrı ekran
```

### 2.0 Açılış (APK, Faz 7)

BuildArena'daki gibi iki katlı:

1. **Android açılış ekranı:** gece mavisi zeminde kırmızı güç simgesi kendini çizer, etrafında turkuaz bir halka döner. Oyunun açılış animasyonu hazır olana kadar (en çok 8 sn) bekler, sonra yumuşakça kaybolur.
2. **Oyunun açılışı:** kulüp logosunun **çipi açılır** (Faz 8: banner'daki gibi parlayan halka kapanır, devre izleri sağa, sola ve yukarı çizilir, uçlarındaki noktalar yanar, izlerde ışık akar), "ATÜ TECH BUILDERS SUNAR" (siber yazı), gürültüden çözülen **KERNEL PANIC**, beş modülün sırayla dolması ("> sistem hazır"); ardından ekran eski bir monitör gibi parlak bir çizgiye katlanır ve buton ekranı arkasından çıkar. Dokununca atlanır. Tarayıcıda yalnız `?intro=1` ile oynar.

### 2.1 Attract ekranı (buton ekranı)

Amaç: stanttan geçen birini 3 saniyede durdurmak.

- **Buton:** ekranın ortasında, büyük, 3B görünümlü arcade butonu; cam kubbe, çevresinde dönen sarı-siyah **tehlike şeridi halkası**, nefes alır gibi atan kırmızı parlama. Koyu lacivert zeminde kırmızı, paletin tam zıt rengi olduğu için uzaktan da görünür.
- **Buton yazısı:** "BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ." sabit kalır; butonun altında **dönen yasal uyarılar** (her 4 sn'de bir, daktilo efektiyle):
  - "Basarsan format atılır. Yedek yok."
  - "Bu butona basan şartları kabul etmiş sayılır. Şartları kimse bilmiyor."
  - "Garanti kapsamı dışında. Aklınız dahil."
  - "Önce bas, sonra Stack Overflow'a sor."
  - "Yönetici izni gerekmiyor. Cesaret yeterli."
  - "Pişmanlık %100, eğlence %100."
  - "Son kullanma tarihi: şimdi."
  - "Bu buton kırmızı. Bir bildikleri vardır."
- **Arka plan:** yavaş akan terminal satırları, soluk hex kodları, hafif tarama çizgisi (scanline).
- **Oyunu kim yaptı (Faz 7–8):** sol üstte kulüp logosu büyük (100 px). Faz 8: kulübün **banner'ındaki gibi** logonun etrafında parlayan bir **halka ve çip bacakları gibi dışarı uzanan devre izleri** (uçlarında noktalar, izlerde ara ara akan ışık); logo dosyasına dokunulmaz, çerçeve etrafına çizilir. Yanında kulübün adı **siber bir yazı tipiyle** (Orbitron), banner'ın renkleriyle: **ATÜ** beyaz, **TECH** turkuaz, **BUILDERS** mavi. "yapımı · stant oyunu #2" satırı kaldırıldı.
- **Köşe düğmeleri (Faz 7):** sağ üstte durum ışığının yanında küçük bir **ayarlar** düğmesi (dişli); alt köşelerde **TEK KİŞİ / 1v1 DÜELLO** seçici ve **"Bizi takip edin"** (kulübün Linktree QR'ını açar: linktr.ee/atutechbuilders; dışına dokununca ya da 45 sn sonra kapanır).
- **Ayarlar:** yalnızca tur süresi (45/60/75) ve ses (açık/kapalı, seviye, ses testi, müzik). Ayarlar artık logoya gizli değil.
- **Easter egg:** logoya 5 kez hızlı dokununca gizli "sudo" mesajı.
- **Boşta kalma:** 20 sn kimse dokunmazsa buton titreyerek "bas artık" der (sadece görsel).

### 2.2 Hack geçişi (basıldıktan sonra, ~3 sn)

Fotoğraftaki **Aşama 1 — Activate** bu ekrandır.

1. Buton içeri çöker, ekran **tek bir CRT çizgisine** büzülür, tekrar açılır.
2. Kırmızı alarm, ekranda üstten aşağı **"SYSTEM FAILURE"** harf harf bozularak yazılır.
3. Arka planda yağan matris tarzı kod, hex dökümü, sahte log akışı:
   `> kernel: critical process terminated` · `> rerouting power... FAILED` · `> user_input: REQUIRED`
4. "Kritik sistem devre dışı kaldı. Sistemi kurtarmak için **60 saniyen** var." → 3-2-1 geri sayım, ilk aşama başlar.

> **Güncel hâl (Faz 5):** hack ekranı butonla **aynı odada ve aynı başlıkla** açılır. Üst bar (logo, KERNEL PANIC, durum ışığı) yerinde kalır, yalnızca "Sistem stabil" → "Kritik hata" olur ve oda kırmızıya döner. SYSTEM FAILURE gürültüden çözülerek oturur; "sistem kaybı" çubuğu ve loglar aşama kartıyla aynı kesimdeki bir panelde akar (kenarında dolaşan kırmızı ışık); geri sayım turkuaz bir halkadır ve ekran ilk aşamaya yumuşakça çözülür.

### 2.3 Beş aşama (Faz 6)

Fotoğraftaki **Aşama 2 — Answer** ve **Aşama 3 — Final Protocol** artık beş küçük oyundur. Sıra her turda aynıdır; son aşama her zaman finaldir.

**Ekran:** üstte `AŞAMA 2/5` ve aşamanın adı, tur süresi çubuğu (sistem enerjisi gibi azalır), `Sistem %` ve beş modül kutusu. Ortada tur boyunca yerinde kalan büyük bir **aşama kartı**; aşamalar onun içinde değişir. Altta terminal satırı (`> guvenlik_duvari: renk dizisi bekleniyor`).

**Bir aşamanın akışı:**

1. **Başlık kartı:** oyun kartın içinde loş ve bulanık durur; üstünde `AŞAMA 2/5 · DÖRT RENK`, büyük komut (`İZLE, TEKRARLA`) ve tek satır ipucu belirir. Olay varsa bir etiket eklenir (RİSKLİ KANAL, GÜVENLİ KANAL, GLITCH, FİNAL). Kart çözülürken oyun tam ışığa gelir ve başlar. Bu sırada tur süresi durur.
2. **Adımlar:** her adımın kendi süre çubuğu vardır. Doğru adım yeşil nokta olur. Yanlış adım ya da süresi biten adım kırmızı nokta olur; **doğrusu gösterilir** ve sıradaki adım gelir. Aşama hiçbir zaman yarıda kesilmez.
3. **Not kartı:** oyun geri çekilir. Kırmızıdan yeşile uzanan bir renk cetvelinde bir çubuk doğruların oranına kadar dolar, ardından not kendi renginde belirir (`İYİ`, `11/13 renk doğru · %85`). HUD'daki modül kutusu aynı renge döner, sonra sıradaki aşamaya geçilir.

| # | Aşama | Adımlar (normal sürüm) | Adım süresi | Not hesabı |
|---|---|---|---|---|
| 1 | **Ölü Piksel** — rengi azıcık farklı kareyi bul | **5 ekran** (Faz 8, aynı zorluk basamakları, daha çok ekran): 4×4 (%10, kolay) → 5×5 (%8, kolay) → 6×6 (%6, orta) → 7×7 (%5, orta) → 8×8 (%3,5 + hafif renk kayması, dikkatli bak); her ekran başka renkte | ekran başına 5 / 5,5 / 6 / 7 / 8 sn; yanlış kare o ekranın süresinden **2 sn** götürür | bulunan ekran / 5 |
| 2 | **Dört Renk** — yanan renkleri aynı sırayla tekrarla | 3 katman: 3 renk yavaş → 5 renk hızlı (bir renk art arda) → 5 renk, gösterimden sonra **renkler yer değiştirir** | her renge 3 sn (izlerken süre durur) | doğru basılan renk / 13; yanlış renk o katmanı bitirir, kalan renkleri sayılmaz |
| 3 | **Işın Yolu** — aynalara dokun, ışını sunucuya ulaştır | 3 hat: 6×4 (2 ayna) → 7×5 (4 ayna, tuzak ayna ve duvar) → 8×5 (5 ayna, sunucu üstte ya da altta) | hat başına 8 / 10 / 12 sn | bağlanan hat / 3 |
| 4 | **Renk Tuzağı** — renk adı başka renkte yazılır | 2 bölüm: önce **YAZISINA BAS** (3 kelime) → ⚠ KURAL DEĞİŞTİ → **RENGİNE BAS** (3 kelime) | kelime başına 2,6 sn | doğru kelime / 6 |
| 5 | **Basma Dedik** (final) — tek kumanda kırmızı buton | 4 komut karışık sırayla: BASILI TUT (2 sn), 3 KEZ BAS, YEŞİLDE BAS, BASMA! (2 sn dokunma) → **TERS MOD**: BAS yazınca basma, BASMA! yazınca bas | komut başına 2–3,8 sn | doğru komut / 6 |

- **Süresi biten adımda doğrusu gösterilir:** Ölü Piksel'de kare halkayla işaretlenir, Dört Renk'te doğru renk yanar, Işın Yolu'nda aynalar teker teker doğru konuma döner ve ışın sunucuya ulaşır, Renk Tuzağı'nda doğru düğme yeşil çerçeve alır.
- **Renk Tuzağı sırası** kasıtlı olarak tersine çevrildi: göz önce okumaya alışır, sonra tam da okumaması gereken an gelir (daha kafa karıştırıcı).
- **Final:** Basma Dedik başlarken çerçeve kırmızıya döner, kalp atışı sesi duyulur, müzik yoğunlaşır. Tur sloganla biter: "Basma dedik. Bastın."
- Hiçbir aşama ses gerektirmez; gürültülü stantta da oynanır.
- **Ana ekrana dönüş (Faz 7):** aşama ekranının sağ altında küçük bir ev düğmesi; **1 saniye basılı tutunca** tur bırakılır ve buton ekranına dönülür (etrafındaki halka dolar; erken bırakmak iptal eder, yanlışlıkla dokunuş oyunu bitirmez).

### 2.4 Sonuç ekranı ve hata raporu

Bkz. §5 ve §6.

### 2.5 1v1 Düello (Faz 7)

BuildArena'daki düello gibi: iki kişi tabletin önünde yan yana, **aynı beş aşamayı aynı anda**, bölünmüş ekranda oynar.

- **Butonla birleşmesi:** buton ekranında **1v1 DÜELLO** seçilince tek büyük butonun yerine **iki kırmızı buton** gelir: solda **1 · OYUNCU 1** (mavi), sağda **2 · OYUNCU 2** (turuncu). Her oyuncu kendi butonuna basar; basan "HAZIR ✓ · rakip bekleniyor" der, buton basılı kalır ve oyuncunun renginde parlar. **İkisi de basınca** sistem çöker (hack ekranı: "İkinizin de 60 saniyesi var. Önce kim kurtaracak?"). Diğeri 12 sn içinde basmazsa butonlar bırakılır. Düello seçili kalır; sıradaki çift doğrudan basabilir.
- **Bölünmüş ekran:** iki yarı (sol mavi, sağ turuncu üst şerit, ortada VS). Her yarı kendi göstergesi, saati, modülleri ve aşama kartıyla tam bir tur; aşamalar yarım ekrana göre küçülür. Her yarı yalnızca kendi dokunuşlarını alır; Overheat herkesin kendi hızına göre gelir.
- **Aynı zorluk, farklı cevaplar (Faz 8):** iki oyuncu aynı aşamaları **aynı zorlukta** oynar ama yan tarafa bakıp kopya çekemez:
  - **Ölü Piksel:** ekranlar aynı (boyut, renk, fark, süre); ölü piksel iki oyuncuda **farklı yerde**, birbirinden en az iki kare uzakta.
  - **Dört Renk:** katman uzunlukları, hız ve yer değiştirme aynı; her katmanın **renk sırası farklı**.
  - **Renk Tuzağı:** iki bölüm aynı; kelimeler ve renkleri farklı (aynı sırada aynı kelime aynı renkte gelmez).
  - **Basma Dedik:** aynı komutlar, TERS MOD yine sonda; **komut sırası farklı**, ilk komuttan itibaren.
  - **Işın Yolu:** iki oyuncuda **aynı** (başka bir hat daha kolay olabileceği için, haksızlık olmasın).
- **Düelloda Emergency yok (Faz 8):** güvenli/riskli seçimi iki oyuncuya farklı aşama verirdi; düellonun rastgele olayı her zaman bir Glitch'tir (iki oyuncuda aynı aşamada).
- **Biten oyuncunun sonu (Faz 8):** önce biten oyuncunun yarısında, tek kişilik turdaki **sonuç geçişi** (ünvanın animasyonu) kendi ekranı kadar oynar: sahne yarıya sığacak kadar küçülür, renk katmanları o yarının aşama ekranını boyar. Ardından ünvanı, beş modülü ve "%... kurtarıldı" kalır, "Rakip hâlâ oynuyor…". İkisi de bitince "Sonuçlar geliyor…", iki geçiş de bitince düello sonucu gelir.
- **Kazanan:** ikisi de bitince düello sonucu: iki sütunda ünvan, kurtarılan sistem yüzdesi (beş aşamanın doğru oranı), modüller, kalan süre. **Yüzdesi yüksek olan kazanır; eşitse süresi çok kalan; o da eşitse berabere.** Kazananın sütunu kendi renginde parlar, taç iner: "OYUNCU 1 KAZANDI". Rövanş yok (kuyruk için); "Ana ekran" ya da 25 sn sonra kendiliğinden buton ekranı.
- Ortadaki ev düğmesi (1 sn basılı tut) düelloyu bitirir. Faz 8: düğme ortadaki çizgide **VS'nin hemen altında** durur (önceden altta oyuncu 1 etiketinin ve kartların köşesinin üstüne biniyordu).

---

## 3. Rastgele olaylar

Genel kurallar (oyunun kaosa dönmemesi için):

- Bir turda **en fazla 2 olay** olur (Power Restored yalnızca animasyon olduğu için bu sınıra sayılmaz); 1. ve 5. aşamaya olay **gelmez**.
- Her turda **en az 1 rastgele olay** (Glitch veya Emergency) garanti edilir; aynı olay iki kez gelmez. Düelloda Emergency yoktur (§2.5).
- Overheat ve Power Restored **katılımcının davranışına** bağlıdır; Glitch ve Emergency şansa bağlıdır (2., 3. ve 4. aşamada, %40 / %50 / %40 ağırlıkla; Glitch o aşamanın oyununu bozar, Emergency o aşamanın sürümünü seçtirir).
- Her olayın süre etkisi, seçilen tur süresine orantılı ölçeklenir (45 / 60 / 75).
- Tüm olaylarda **fotosensitif güvenlik**: saniyede 3'ten fazla yanıp sönme yok; cihazın "hareketi azalt" ayarına uyulur.

### 3.1 SYSTEM OVERHEAT! (davranışa bağlı) — iki yönlü

| | **Çok hızlı gidiyorsa** | **Çok yavaş gidiyorsa** |
|---|---|---|
| Tetik | İlk iki aşama bittiğinde tur süresinin **%80'inden fazlası** hâlâ duruyorsa | Kalan süre **%25'in altında** ve en az **2 aşama** hâlâ kalmışsa |
| Ne olur | İki aşama arasında alarm: "İŞLEMCİ AŞIRI ISINDI" | Aynısı, mesaj: "ÇEKİRDEK KRİTİK" |
| Soğutma | Ekranda **"DOKUNMA!"**: işlemci 3 saniyede 96 °C'den 60 °C'ye soğur | Aynısı |
| Dokunmazsan | Ek süre **yok** ("SOĞUTULDU · devam") | **+5 sn** |
| Dokunursan | **−5 sn**, "SİSTEM ISINDI" uyarısı (panel içten kızarır) | Ceza **yok**, yalnızca ek süre kaçar ("süre kesilmedi") |

- Alarm ve soğutma boyunca **ana süre durur**. Overheat bir turda **en fazla 1 kez** olur ve finalden hemen önce gelmez.
- Sonuçta ayrı bir rozet görünür ("Aşırı ısınmayı atlattın").

### 3.2 GLITCH DETECTED! (şansa bağlı, mantıklı kurguyla)

**Kurgu: "Veri Bozulması"** — Sistem çökerken o aşamanın oyunu da bozulmaya başlar. Aşamanın adı HUD'da gürültüden çözülerek yazılır, başlık kartına "GLITCH" etiketi eklenir, oda turkuaz-amber titrer.

| Aşama | Glitch'in yaptığı |
|---|---|
| Dört Renk | Renkler 2. katmanda da gösterimden sonra yer değiştirir |
| Işın Yolu | 2,2 saniyede bir aynalardan biri kendiliğinden döner |
| Renk Tuzağı | Renk düğmeleri her cevaptan sonra yer değiştirir |

- Glitch yalnızca **o aşamayı** etkiler; doğru cevabın mantığı bozulmaz, yalnızca yer ve görünüm değişir.

### 3.3 EMERGENCY MODE! (şansa bağlı, risk–ödül)

**Kurgu: "Yedek Kanal Seçimi"** — aşama başlamadan sistem iki kurtarma yolu sunar.

- 🟢 **GÜVENLİ KANAL** — oyunun kolay sürümü (Dört Renk 3-4-4 renk, Işın Yolu küçük hatlar, Renk Tuzağı kelime başına 3 sn). Süreye dokunmaz.
- 🔴 **RİSKLİ KANAL** — oyunun en zor sürümü (Dört Renk 5-6-7 renk ve en hızlı gösterim, Işın Yolu 9×6 ve 6 ayna, Renk Tuzağı kelime başına 1,8 sn). Aşama **yeşil ya da açık yeşil** biterse **+5 sn**, bitmezse **−3 sn**.
- **Ekran donar, önce okunur (Faz 8):** panel geldiğinde ana süre durur ("SÜRE DURDU"), odanın kod yağmuru yavaşlayıp durur, dönen uyarı ışığı sabit bir parıltıya döner, yazılar sırayla ve sakin gelir. İlk **4 sn okuma süresi**dir: geri sayım işlemez ("Acele etme: önce iki kanalı da oku."). Sonra **8 sn seçim süresi** başlar ("Seçmezsen 8 sn sonra sistem güvenli kanalı seçer."). Seçmezse otomatik "GÜVENLİ" seçilir. Hızlı okuyan hemen seçebilir. (Önceden toplam 4 sn'ydi; ilk kez oynayan yetişemiyordu.)
- Yalnızca tek kişilik turda gelir.

### 3.4 POWER RESTORED! (sadece animasyon)

- **Tetik:** **art arda 2 yeşil (ya da açık yeşil) aşama**; finalden sonra gelmez.
- **Oyuna etkisi yok**, tamamen görsel bir ödül: HUD'dan sıcak bir ışık yayılır, "ping" sesi, kırmızı alarm yumuşak bir geçişle **turuncuya** döner, kod yağmuru yavaşlar. Yeni bir olay olana veya oyun bitene kadar bu "sakin" görünüm sürer.

---

## 4. Süre ve ana mekanikler

| Kural | Değer |
|---|---|
| Aşama sayısı | 5, sabit sıra |
| Tur süresi | 60 sn (45 / 75 ayarlanabilir) |
| Süre ne zaman akar | Yalnızca oyuncu oynarken; başlık kartı, renkleri izleme, doğrusunun gösterilmesi, kural uyarısı, not kartı ve olay panellerinde durur |
| Adım süresi | Her adımın kendi süresi var (§2.3); biten adım yanlış sayılır, doğrusu gösterilir |
| Yanlış adım | Yalnızca o adım kaybedilir; aşama sonuna kadar oynanır |
| Süre biterse | Tur **durmaz**: sayaç kırmızıya döner ve ileri sayar (`+00:07`), kalan aşamalar yine oynanır; ünvan "geç kalanlardan" seçilir (§5.1) |
| Boşta kalma | Sonuç ve rapor ekranında 25 sn dokunuş yoksa otomatik başa döner |

**Neden böyle:** her aşama sonuna kadar oynanmalı ve not almalı (kulüp kararı). Bu yüzden süre bitince tur kesilmez; 60 saniye hikâyesi ise sayaçta ve ünvanda yaşamaya devam eder. Ortalama bir oyuncu beş aşamayı yaklaşık 40–50 sn'lik oynama süresinde bitirir; tablet testinde süre ve adım süreleri `src/game/config.ts`'den ayarlanır.

---

## 5. Sonuç sistemi (skor tablosu yok)

### 5.1 Notlar ve ünvanlar

**Aşama notu** (doğru adımların oranı):

| Oran | Not | Renk |
|---|---|---|
| %100 (hepsi doğru) | **TEMİZ** | yeşil `#02FF18` |
| %75'ten fazla | **İYİ** | açık yeşil (yeşil ile turuncu arası) `#B8F53D` |
| %50–75 (75 dahil) | **SINIRDA** | turuncu `#FF8C1A` |
| %50'nin altı | **BOZUK** | kırmızı `#FF2D4A` |

Not, aşamadaki adım sayısına bağlıdır: 3 adımlı aşamada (Ölü Piksel, Işın Yolu) 2/3 = %67 turuncudur; açık yeşil 5 ve daha fazla adımlı aşamalarda (Dört Renk 13, Renk Tuzağı 6, Basma Dedik 6) görülür. Yeşil ve açık yeşil birlikte "modül ayakta" sayılır.

**Ünvan** (beş notun birleşimi; fotoğraftaki dört ünvan korundu, üç yeni ünvan eklendi):

| Durum | Ünvan | Renk |
|---|---|---|
| Beşi de TEMİZ, süre ≥ %20 kaldı | **SYSTEM SAVIOR** | yeşil |
| Beşi de TEMİZ, süre < %20 kaldı | **LAST SECOND HERO** | yeşil |
| Beşi de yeşil ya da açık yeşil (en az biri açık yeşil) | **ALL SYSTEMS GO** *(yeni)* | açık yeşil |
| Dördü yeşil/açık yeşil, biri turuncu ya da kırmızı | **ONE BUG LEFT** | açık yeşil |
| Kırmızı yok, en az ikisi turuncu | **BARELY BOOTED** | turuncu |
| 1–2 kırmızı | **SAFE MODE** | turuncu |
| 3–4 kırmızı | **ERROR 404** *(yeni)* — "Sistem bulunamadı. Sen değil, o kayboldu." | kırmızı |
| Beşi de kırmızı | **KERNEL PANIC** *(yeni)* — "Oyunun adını hak ettin. Tebrikler(?)" | kırmızı |
| Süre bitti, en az 3 yeşil/açık yeşil | **ALMOST A LEGEND** | turuncu |
| Süre bitti, daha azı | **HAVE YOU TRIED TURNING IT OFF AND ON?** | kırmızı |

### 5.2 Sonuç ekranı içeriği

- **Sistem modülleri:** HUD'daki beş küçük kutu büyük kutulara **uçarak** yerleşir; her biri aşamanın renginde. Altında aşamanın adı ve notu (`Dört Renk · 11/13 · İYİ`).
- Büyük **ünvan** (notların renk ölçeğinde), altında bir cümlelik espri.
- **Doğru adım / Hatalı adım** sayıları yukarı sayan animasyonla, **Kalan süre** (süre bittiyse "Süre aşımı +7 sn").
- Atlatılan olay rozetleri (🔥 Overheat · ⚡ Power · 🧩 Glitch · 🚨 Emergency).
- İki buton: **HATA RAPORUNU AÇ** (hatalı adım varsa) ve **YENİDEN BAŞLAT**.
- Nickname girişi, liderlik tablosu, kayıt **yoktur**.

### 5.3 Sonuç geçiş animasyonları

> **Faz 6 (2 Kasım, kulübün geri bildirimi: "Barely Booted dışındakileri sevemedim"):** BARELY BOOTED aynen kaldı. Diğer altı geçiş baştan yapıldı ve yeni üç ünvana yeni geçiş eklendi. Hepsi BARELY BOOTED'ın beğenilen dilini izler: aşama ekranı altta kalır ve kararır, donar ya da kapanır; üstünde sistemin küçük bir parçası **hikâyeyi anlatır** (renk dalgası ya da kopuk parçacık yok). Yazılar sonuç gelmeden bulanıklaşarak çekilir, son aşamanın not kartı geçiş başlarken yumuşakça kaybolur, modül kutuları sonuca uçar.

| Ünvan | Geçiş (Faz 6) |
|---|---|
| SYSTEM SAVIOR | Beş yay tek tek çizilerek bir halkayı kapatır (her aşama bir yay), ortada onay işareti kendini çizer, halka yeşil parlar; "SYSTEM RESTORED", "5/5 modül temiz · 23 sn kaldı"; oda yeşile döner |
| LAST SECOND HERO | Ekran donar ve renksizleşir; ortada kalan saniyeler ("00:04") kalp atışıyla iki kez atar; renk saatten dışarı doğru geri gelir, "SON SANİYEDE KURTARILDI" damgası |
| ALL SYSTEMS GO *(yeni)* | "sistem durumu" penceresi tüp gibi açılır; beş modülün ışığı sırayla kendi renginde (yeşil / açık yeşil) yanar; altta "ALL SYSTEMS GO" şeridi soldan sağa dolar |
| ONE BUG LEFT | Kalan modüller kararır, tek bozuk modül kırmızı çerçeveyle nefes alır; bozuk modülün içinden bir **büyüteç** çıkıp büyür, içinde piksel bir böcek bacaklarını oynatır; "1 bug bulundu · Işın Yolu %33" |
| BARELY BOOTED | (Aynen) çerçeveli açılış penceresi: satırlar sağda durum etiketleriyle gelir (640K OK, modüller x/5, idare eder), yanıp sönen imleç, takıla takıla "yeterince" dolan çubuk |
| SAFE MODE | Ekran renksizleşir; eski bir **Gelişmiş Önyükleme Seçenekleri** menüsü açılır, seçim çubuğu "Normal başlat"tan "Güvenli Mod"a iner ve seçer; menü çizgiye katlanıp kaybolur, köşelerde "Safe Mode" belirir |
| ERROR 404 *(yeni)* | "sistem://kurtarma" penceresi: büyük 404, sıfırı kapanmayan kırık bir halka; "Sistem bulunamadı", arama kutusuna "sistemi kurtar" yazılır, "0 sonuç" |
| KERNEL PANIC *(yeni)* | Ekran donar ve kararır; çekirdeğin son sözleri akar ("Kernel panic - not syncing", her aşama için `[ FAIL ] ekran_01.ko %0`, Call Trace: `basma_dedik+0x1f`); ardından kocaman kırmızı "KERNEL PANIC" ve saniyede bir yanıp sönen klavye ışığı |
| ALMOST A LEGEND | Kocaman "LEGEND" yazısı bir gösterge gibi soldan dolar ama sonuna yetişmeden durur; dolgunun kenarı iki kez titrer; "NEREDEYSE… 7 sn geç kaldın" |
| HAVE YOU TRIED… | Aşama ekranı eski bir monitör gibi **kapanır** (parlak bir çizgiye, sonra noktaya büzülür), oda kararır; güç düğmesi simgesi belirir, halkası basılı tutulmuş gibi dolar ve turkuaz yanar; "Kapat. Aç. Tekrar dene." kelime kelime gelir |

**Arka plan varyantı:** turun olay arka planı (Overheat, Glitch, Emergency, Power) aşama ekranının kendisinde olduğu için geçiş her zaman ona uyar (öncelik: Overheat > Glitch > Emergency > Power Restored > Normal).

> **Önceki sürümler:** 1 Kasım'da geçişler soru ekranının üzerinde oynayan renk katmanlarıydı (yeşile boyanma, donma, iris, mavi ekran); Faz 5'te ONE BUG LEFT yakınlaşması ve BARELY BOOTED penceresi eklenmişti. Faz 6'da BARELY BOOTED dışında hepsi yukarıdaki hâliyle değişti.

---

## 6. Hata raporu ekranı (ayrı ekran)

Sonuç ekranından **HATA RAPORUNU AÇ** ile açılır; her adım doğruysa buton hiç görünmez ("0 hata. Log tertemiz.").

Terminal / hata günlüğü estetiğinde, hatalı adımı olan her aşama için bir satır:

```
HATA RAPORU   4 hatalı adım
─────────────────────────────────────────────────────────
AŞAMA 2  Dört Renk     10/13 · %77 · İYİ
         > katman 2 · 4. renkte MAVİ, doğrusu SARI
─────────────────────────────────────────────────────────
AŞAMA 4  Renk Tuzağı   5/6 · %83 · İYİ
         > 2. bölüm · doğrusu YEŞİL, sen KIRMIZI
```

- Her satır aşamanın notunun renginde; altında en fazla 2 kayıt ("… 1 kayıt daha").
- Kaydırma gerekmez (en fazla 5 satır).
- Altta: **◀ Sonuca dön** ve **YENİDEN BAŞLAT**.
- 25 sn dokunulmazsa otomatik başa döner.

---

## 7. Ses ve görsel tasarım

- **Ses (stantta açık):** alarm sireni, ping, "hata" bip'i, güç geri gelme çınlaması; Dört Renk'te her renge bir nota, ayna dönüşünde tık, renkler yer değiştirirken "whoosh", not kartında yükselen bir ton. Web Audio ile kod içinde sentezlenir, telif sorunu yok. Hiçbir aşama sese dayanmaz.
- **Müzik (üretken, dosyasız, Faz 5'te temaya göre yenilendi):** butonun başında ilgi çeken **"Sinyal"** (112 BPM, La minör, Am-F-C-G; her iki turda bir akılda kalan bir melodi), aşamalarda gerici **"Geri sayım"** (96 BPM, Re minör, Dm-B♭-Gm-A; saat gibi tıkırdayan ostinato, kalp atışı bası). Final aşamasında ve son 10 saniyede yoğunlaşır (hi-hat, siren), Overheat'te süre durduğu için boğuklaşır, hack alarmında susar. Sonuçta ünvanın tonuna göre çalar: başarıda **zafer marşı** (118 BPM, Do majör), sınırda **sakin e-piyano** (88 BPM), çöküşte **bozuk lo-fi** (74 BPM, takılan ritim, cızırtı). Efektlerden ayrı, daha kısık bir kanalda çalar; gizli ayarlarda ayrı "Müzik" düğmesi var. İlk dokunuşta başlar (APK'da açılışta).
  - Tablet tarayıcıları sesi ilk dokunuşa kadar kilitler; **kırmızı butona basış** sesi açan dokunuş olur, ek adım gerekmez.
  - Stant gürültülü olabilir: alarm ve olay sesleri keskin ve net tasarlanır, müzik/uğultu düşük tutulur; her uyarı ayrıca görsel de verilir.
  - Ayarlar'da ana ses seviyesi vardır; tablet ses seviyesi stant öncesi tam açılır.
- **Tipografi:** **Chakra Petch** (arayüz ve komutlar, teknolojik ama okunaklı) + **JetBrains Mono** (terminal logları, sayaç, kodlar). İkisi de uygulamanın içinde gömülü, Türkçe karakterleri tam; komutlar uzaktan okunabilecek boyutta (en az 28 px).
- **Efektler:** scanline, CRT eğrisi, vinyet, kod yağmuru, glitch şeritleri, Overheat közleri. Hepsi CSS/Canvas/SVG, görsel dosya gerekmez.
- **Hareket kuralı (Faz 4, kulübün geri bildirimi):** geçişler **yumuşak** ve **ekrana bağlı**. Her efekt ekrandaki bir öğeden doğar (butonun kırmızısı ekranı doldurur ve hack ekranı o kırmızının içinden açılır; Power Restored ışığı HUD'dan yayılır; büyüteç bozuk modülün içinden çıkar). Aşama kartı tur boyunca yerinde kalır, aşamalar içinde değişir; yer değiştiren şeyler (renk tuşları, renk düğmeleri, aynalar) kayarak gider; olay panelleri kartın yerine yerleşir; arka plan ruh hâlleri üst üste katmanlar hâlinde birbirine geçer; sonuç geçişi aşama ekranının üzerinde oynar ve sonuç onun üzerinden çözülerek açılır. Ekrandan bağımsız kıvılcım, sarsıntı ve ekran yırtılması kullanılmaz.
- **Ortak dünya ve ekran geçişleri (Faz 5):** bütün ekranlar **tek bir odanın** üzerinde durur (kod yağmuru, perspektif ızgara zemin, odanın ışığı, CRT camı). Oda hiç kapanmaz, yalnızca ışığı değişir: butonda turkuaz, hack'te kırmızı, olayda olayın rengi, sonuçta sonucun rengi; aşamalar boyunca kırmızı, modüller yeşile döndükçe azalır. Yeni ışık önce yanar, eski ışık sonra söner, böylece arada karanlık bir an olmaz. Ekranlar birbirine **çapraz geçişle** bağlanır.
- **Dokunmatik:** tüm hedefler ≥ 64 px (Basma Dedik butonu 230 px), çift dokunma / yanlışlıkla basma engeli.

---

## 8. Teknik plan

| Konu | Karar |
|---|---|
| Teknoloji | **React + Vite + TypeScript**, çevrimdışı çalışan tek sayfa uygulama |
| Animasyon | Saf CSS (keyframes, filter, mix-blend) + SVG (Işın Yolu, halkalar) + `<canvas>` ile kod yağmuru; ek kütüphane yok |
| Durum yönetimi | `useReducer` ile küçük durum makinesi: `ATTRACT → HACK → PLAY → RESULT → REPORT`; tur yalnızca adımları, bekleme anlarını ve aşamanın bitişini bilir |
| Aşamalar | Her aşamanın saf bir üreticisi (`src/game/stages/`, tohumlu: aynı tohum aynı ekranları verir) ve süre/dokunuş mantığını taşıyan küçük bir sınıfı (`src/screens/stages/runners/`) var; React bileşeni yalnızca çizer |
| Ses | Web Audio API ile sentez (dosya yok); ilk dokunuşta kilit açılır |
| Tablet dağıtımı | Tablet **Android**: **Capacitor ile APK** (yatay, tam ekran, ekran uyanık, geri tuşu çıkmaz). Yedek olarak **PWA** (`vite-plugin-pwa`) |
| Ekran uyanık | Screen Wake Lock API ile tablet ekranı kapanmaz |
| Dokunmatik | Yakınlaştırma, uzun basma menüsü, metin seçme, kaydırma ve çift dokunma kapatılır; tüm hedefler ≥ 64 px; yatay ekran sabit |
| Veri | `src/game/config.ts` (tur süresi, adım süreleri, not eşikleri, olay olasılıkları, ek süreler); `src/data/texts.ts` (aşama, ünvan ve olay metinleri) |
| Güvenlik | API / sunucu yok; kişisel veri tutulmaz |
| Test | Birim testleri (kurallar, üreticiler, aşama mantığı sahte saatle), Playwright ile tablet profilinde her aşama ve olay; tablette son deneme |

**Klasör yapısı:**

```
src/
  game/          durum makinesi, notlar, ünvanlar, olaylar, ayarlar
  game/stages/   beş aşamanın üreticileri
  screens/       Attract, Hack, Play, Result, Report, Settings
  screens/play/  aşama kartı, not kartı, olay panelleri
  screens/stages/ beş oyun + runners/ (süre ve dokunuş mantığı)
  fx/            ortak dünya, kod yağmuru, sonuç geçişleri
  audio/         sentezlenmiş sesler ve müzik
  data/          metinler
```

**Sorular (arşiv):** Faz 5'e kadar oyun 120 soruluk `SORULAR.md` havuzunu kullanıyordu. Faz 6'da sorular oyundan tamamen çıkarıldı; havuz ve cevap kontrolü yalnızca arşiv olarak `docs/arsiv/` altında durur.

---

## 9. Renk paleti (logodan çıkarıldı)

Logo analiz edildi: koyu lacivert zemin, turkuaz halka ve "TECH", kobalt mavi "BUILDERS", yeşil `{ }`, beyaz "ATÜ".

| Rol | Renk | Kod |
|---|---|---|
| Zemin | Gece lacivert | `#090E1D` |
| Panel | Koyu lacivert-mavi | `#0F1830` |
| Ana vurgu | Turkuaz | `#44EFEC` |
| İkincil | Kobalt mavi | `#0040E0` |
| Başarı / doğru | Logo yeşili (`{ }`) | `#02FF18` |
| Metin | Beyaz | `#FFFFFF` |
| Alarm / buton | Alarm kırmızısı | `#FF2D4A` |
| Uyarı / glitch | Amber | `#FFB020` |
| Not: İYİ | Açık yeşil | `#B8F53D` |
| Not: SINIRDA | Turuncu | `#FF8C1A` |

Kırmızı ve amber logoda yoktur; **bilerek** eklenmiştir: oyunun dramatik kısmı alarm renkleri ister ve turkuaz zeminde kırmızı buton en güçlü kontrastı verir. Not renkleri (yeşil → açık yeşil → turuncu → kırmızı) Faz 6'da eklendi. Beğenilmezse tek dosyada (CSS değişkenleri) değiştirilebilir.

---

## 10. Yol haritası (stant 4 Kasım)

| Faz | Gün | İçerik | Durum |
|---|---|---|---|
| **Faz 0** | 31 Ekim | Kurulum (React + Vite + TS, BuildArena araç zinciri), renk token'ları ve yazı tipleri, 1280×800 sahne, tüm ayar sayıları (`src/game/config.ts`), ünvan hesabı, logo ve PWA ikonları, ajan kuralları ve skill'ler | ✅ |
| **Faz 1** | 31 Ekim gece | Soru havuzu + ayrıştırıcı; durum makinesi; **kırmızı buton ekranı**; **hack geçişi** (SYSTEM FAILURE, loglar, 3-2-1); **soru ekranı**; **sonuç** ve **hata raporu** (temel hâli); sentezlenmiş sesler; 25 sn boşta kalınca başa dönüş | ✅ |
| **Faz 2** | 1 Kasım | **Olaylar:** Overheat (hızlı/yavaş), Glitch, Emergency, Power Restored + olay yöneticisi; **ünvana göre sonuç geçişleri** ve arka plan varyantları; olay rozetleri; **gizli ayarlar**; "sudo" sürprizi | ✅ 186 birim + 60 uçtan uca test |
| **Faz 3** | 1 Kasım | **Animasyon kalitesi:** butonda sonar halkaları, hack ekranında alarm ışığı ve halkalı geri sayım, Overheat'te közler ve **duran ana süre**, Power Restored'da **kırmızıdan turuncuya** geçiş, sonuçta ünvanın çözülmesi | ✅ 187 birim + 61 uçtan uca test |
| **Faz 4** | 1 Kasım | **Yumuşak geçişler** (hareket kuralı); **APK** (`npm run apk`, Capacitor; masaüstünde `KernelPanic.apk`); Wake Lock ve tam ekran; soru cevaplarının kaynak kontrolü | ✅ 187 birim + 61 uçtan uca test |
| **Faz 5** | 1 Kasım | **Kalite turu:** tüm ekranların altında ortak dünya; ekranlar arası çapraz geçiş (View Transitions); hack ekranı buton ekranıyla aynı başlık ve oda; sonuçta modül kutularının uçuşu; ONE BUG LEFT ve BARELY BOOTED yenilendi; temaya uygun yeni müzikler | ✅ 187 birim + 68 uçtan uca test |
| **Faz 6** | 2 Kasım | **Sorular yerine beş aşama** (Beş Aşama sayfasındaki oyunlar, kulübün son isteğiyle): Ölü Piksel'de her ekranın kendi süresi ve süre bitince doğru pikselin gösterilmesi; her adımın kendi süresi; **hata aşamayı bitirmez**, her aşama sonuna kadar oynanır ve **renk notu** alır (yeşil / açık yeşil / turuncu / kırmızı); Renk Tuzağı'nda önce yazı, sonra renk; olaylar aşamalara uyarlandı (DOKUNMA! soğutması, oyunun kolay/zor sürümü, aşamaya özel glitch); süre bitince tur kesilmez, ileri sayar; **3 yeni ünvan** (ALL SYSTEMS GO, ERROR 404, KERNEL PANIC); BARELY BOOTED dışındaki **tüm sonuç geçişleri yenilendi**, yeni ünvanlara yeni geçişler; aşama başlık kartı ve not kartı; sonuçta aşama adları ve notları, rapor aşama aşama; sorular `docs/arsiv/`'e taşındı | ✅ 92 birim + 66 uçtan uca test |
| **Faz 7** | 2 Kasım | **1v1 düello** (buton ekranında mod seçici, iki buton, ikisi de basınca başlar; bölünmüş ekranda aynı beş aşama; biten bekler; kazanan ekranı); **APK açılışı** (Android açılış ekranı: kırmızı güç simgesi + dönen halka; oyunun açılış animasyonu: logo, KERNEL PANIC, beş modül, monitör gibi katlanarak oyuna geçiş); buton ekranında **büyük logo ve "ATÜ TechBuilders yapımı"**, **dişli ayarlar düğmesi** (yalnız süre ve ses), **"Bizi takip edin"** QR'ı; oyun içinde **ev düğmesi** (1 sn basılı tut); **Overheat kuralları** (süre çokken: dokunursa −5 sn; süre azken: dokunmazsa +5 sn); "3 KEZ BAS" halkasının üçüncü dokunuşta dolmaması düzeltildi | ✅ 94 birim + 81 uçtan uca test |
| **Faz 8** | 2 Kasım | **Düelloda adil ama farklı içerik** (aynı zorluk; ölü pikselin yeri, renk sırası, Renk Tuzağı kelimeleri ve Basma Dedik komut sırası oyuncuya göre farklı; Işın Yolu aynı); **düelloda Emergency yok**; düelloda biten oyuncunun yarısında **kendi sonuç geçişi** (tek kişilik gibi, yarıya sığdırılmış); **Emergency'de ekran donar**, 4 sn okuma + 8 sn seçim; **Ölü Piksel 5 ekran**; logo **banner'daki çip çerçevesiyle** (halka + devre izleri), kulüp adı **siber yazıyla** (Orbitron, ATÜ beyaz · TECH turkuaz · BUILDERS mavi), "yapımı · stant oyunu #2" kaldırıldı, açılışta çip açılır; düelloda ev düğmesi VS'nin altına taşındı | ✅ 105 birim + 83 uçtan uca test |
| **Son test** | yayından önce | **Tablette** ses seviyesi, dokunma hissi, efekt akıcılığı, **iki kişinin aynı anda dokunması (düello)**, 5-10 kişilik deneme, **adım süreleri ve tur süresinin dengelenmesi** (Ölü Piksel'in son ekranı, Işın Yolu hat süreleri, YEŞİLDE BAS), yedek kurulum | |
| **Stant** | 4 Kasım | Kurulum, ses ve ekran uyanık kontrolü, gün içi gözlem | |

### Kesme listesi (zaman daralırsa, bu sırayla)

Çekirdek akış (buton → hack → beş aşama → sonuç → hata raporu) ve dört olay **korunur**. Önce şunlardan vazgeçilir:

1. Easter egg ve gizli "sudo" mesajı
2. Ünvan başına özel geçişler yerine **3 ortak geçiş** (başarı / sınırda / çöküş) + arka plan varyantı
3. Arka plan uğultusu ve ek ses efektleri (alarm ve ping kalır)
4. Ayarlar'da süre dışındaki seçenekler

---

## 11. Karar kaydı

| # | Konu | Karar |
|---|---|---|
| 1 | Oyun adı | **KERNEL PANIC** |
| 2 | Overheat | Soğutma "DOKUNMA!" 3 sn. Süre çokken geldiyse: dokunmazsan ödül yok, dokunursan **−5 sn**. Süre azken geldiyse: dokunmazsan **+5 sn**, dokunursan ceza yok (Faz 7) |
| 3 | Emergency ödülü | **Süre:** riskli kanal yeşil biterse +5 sn, bitmezse −3 sn |
| 4 | ~~Soru tonu~~ | Faz 6'da sorular kaldırıldı (bkz. 12) |
| 5 | Cihaz ve ses | **Tablet**, ses **açık**; hiçbir aşama sese dayanmaz |
| 6 | Teknoloji | **React + Vite + TypeScript** |
| 7 | Palet | Logo tabanlı (turkuaz-lacivert-kırmızı) + not renkleri |
| 8 | Tablet | **Android** (BuildArena'nın çalıştığı stant tableti) → Capacitor APK, yedek PWA |
| 9 | Geliştirme ortamı | Kod `Desktop/KernelPanic`, editör **Antigravity**; ajan kuralları `AGENTS.md`, skill'ler `.agents/skills/` |
| 10 | ~~Soru havuzu~~ | Faz 6'da arşivlendi (`docs/arsiv/SORULAR.md`) |
| 11 | Takvim | Stant **4 Kasım 2026** |
| 12 | Oyun | **Beş aşama**, sabit sıra: Ölü Piksel → Dört Renk → Işın Yolu → Renk Tuzağı → Basma Dedik (final) |
| 13 | Hata | Bir hata ya da süresi biten adım yalnızca o adımı kaybettirir, doğrusu gösterilir; **her aşama sonuna kadar oynanır** |
| 14 | Puan | Aşama notu: %100 yeşil, >%75 açık yeşil, %50–75 turuncu, <%50 kırmızı; ünvan beş nottan hesaplanır |
| 15 | Renk Tuzağı sırası | Önce **yazısına**, kural değişince **rengine** bas |
| 16 | Süre bitince | Tur kesilmez; sayaç ileri sayar, kalan aşamalar oynanır, ünvan "geç kalanlardan" seçilir |
| 17 | Düello | **1v1**, aynı ekranda iki yarı, aynı içerik; buton ekranında mod seçici + iki buton (ikisi de basınca başlar); kazanan kurtarılan yüzde, eşitlikte kalan süre; rövanş yok |
| 18 | Ayarlar | Logodaki gizli ayar kaldırıldı; sağ üstte dişli düğmesi; yalnız süre ve ses |
| 19 | Ana ekrana dönüş | Oyun içinde ev düğmesi, 1 sn basılı tutunca |
| 20 | Logo | Buton ekranında büyük logo + "ATÜ TechBuilders yapımı"; "Bizi takip edin" Linktree QR'ı (Faz 8: "yapımı" satırı kalktı, bkz. #25) |
| 21 | Düello içeriği | Aynı zorluk, farklı cevaplar (ölü piksel yeri, renk sırası, kelimeler, komut sırası); Işın Yolu iki oyuncuda aynı |
| 22 | Düelloda olaylar | Emergency yok; rastgele olay her zaman Glitch |
| 23 | Düello sonu | Biten oyuncunun yarısında tek kişilik turdaki sonuç geçişi, yarıya sığdırılmış; iki geçiş bitince düello sonucu |
| 24 | Emergency süresi | Ekran donar; 4 sn okuma (geri sayım yok) + 8 sn seçim |
| 25 | Logo ve ad | Banner'daki gibi halka + devre izleri; kulüp adı Orbitron ile banner renklerinde; Ölü Piksel 5 ekran (aynı zorluk basamakları) |

---

## 12. Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Süre çok kısa | Faz faz plan, kesme listesi, çekirdek önce |
| Kırmızı alarm ve yanıp sönme rahatsız edebilir | Saniyede 3'ten az yanıp sönme, cihazın "hareketi azalt" ayarına uyulur |
| Stant gürültüsü, sesler duyulmaz | Hiçbir aşama sese dayanmaz; keskin alarm sesleri, her uyarı ayrıca görsel |
| Tablette ses kilidi (tarayıcı) | Ses, kırmızı butona ilk dokunuşta açılır |
| Tablet ekranı kapanır / uyur | Wake Lock, şarj kablosu, uyku kapalı |
| Ziyaretçi ayarları değiştirir | Ayarlarda yalnız süre ve ses var; görevli stant öncesi kontrol eder |
| Düelloda iki kişi aynı anda dokunur | Her yarı yalnız kendi dokunuşlarını alır; tablette iki kişiyle denenecek |
| Düelloda yan tarafa bakıp kopya | Cevaplar oyuncuya göre farklı (Işın Yolu hariç; orada iki hat da aynı) |
| Ölü Piksel'in 5 ekranı turu uzatır | Ekran süreleri `config.ts`'de; tablet denemesinde gerekirse kısaltılır ya da tur süresi 75 sn yapılır |
| Kuyruk uzar, tur çok sürer | Her adımın süresi sınırlı olduğu için hiç dokunulmasa da tur kendiliğinden biter; sonuçta 25 sn boşta kalınca otomatik reset; geçişe dokunmak onu atlar |
| Aşamalar çok kolay/çok zor | Tablette 5–10 kişiyle deneme; adım süreleri ve farklar tek dosyadan (`config.ts`) ayarlanır |
| İlk kez gören ziyaretçi ne yapacağını anlamaz | Her aşamanın başlık kartında büyük komut ve tek satır ipucu; süre o sırada durur |
| Renk körü ziyaretçi | Dört Renk'te tuşların yeri sabittir (yer değiştirme dışında); Renk Tuzağı'nın ilk bölümü yazıyı okumaya dayanır |
| Animasyon yükü tableti yorar | Efektler CSS/GPU ağırlıklı; düelloda iki tur aynı anda çalıştığı için tablette ayrıca bakılacak |
| Çökme / donma | Hata yakalama, otomatik başa dönüş; yedek cihaz |

---

## 13. Kapsam dışı (şimdilik)

Skor tablosu, kullanıcı hesabı, internet bağlantısı, çevrimiçi çok oyunculu mod (yan yana 1v1 düello var), kamera/QR kayıt, ödül dağıtım sistemi.

---

*Faz 0–8 tamamlandı; yayından önce kalan tek adım tablette son test (düello dahil) ve süre dengesi.*
