# KERNEL PANIC — Booth Game #2: Roadmap and Design Document

**ATÜ TechBuilders · a five-stage "the system crashed" booth game**
Version: 1.4 (Faz 10: Emergency left the game, every round gets one Glitch; Dead Pixel shows five kinds of panel; Beam Path draws each line from several recipes and mirrors it, so the beam comes from either side. Faz 9: the cyber eye instead of the red button, a mirrored duel, English code and documents) · Date: 2 November 2026 · Status: pre-release, next: the last test on the tablet · Booth: **4 November 2026** · Code: `Desktop/KernelPanic`

The game speaks Turkish. This document quotes its on-screen texts in Turkish, with a translation where it helps. Phases are called "Faz" as in the club's plan.

---

## 1. Summary

A visitor comes to the table and finds a big eye in a warning ring, written around it:
**"BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ."** ("You are about to press. We are not responsible for the consequences.")
Pressing it "hacks" the system; the visitor has 60 seconds to save it by playing **five stages**: **Dead Pixel → Four Colours → Beam Path → Colour Trap → Don't Press** (Ölü Piksel → Dört Renk → Işın Yolu → Renk Tuzağı → Basma Dedik). Each stage is a small game that gets harder step by step; every step has its own clock. A mistake or a step running out never ends the game, it only costs that step: a stage is always played to its end and graded **green, lime, orange or red** by its share of right steps. Surprise events (overheat, glitch, power restored) make every round different. There is **no leaderboard**; at the end the visitor sees a **title** decided by the five grades, five coloured modules and, on a separate screen if they want, an **error report**.

| Item | Decision |
|---|---|
| Audience | Everyone, including visitors who do not code |
| Round length | 60 s (45 / 75 s in the settings); runs only while the player plays |
| Stages | 5, in a fixed order; 3–13 steps each (Dead Pixel has 5 screens) |
| Scoring | A colour grade per stage (§5.1); no leaderboard, no nickname |
| Internet / API | None, fully offline |
| Language | Turkish UI; some technical banners stay English (SYSTEM FAILURE etc.) |
| Palette | Taken from the club logo (see §9) |
| Device | **Android tablet** (the same booth tablet as BuildArena; touch, landscape, full screen) |
| Sound | **On** (played with sound at the booth); no stage depends on sound |
| Technology | React + Vite + TypeScript (see §8) |

### Name (approved)

**KERNEL PANIC** — exactly the "the system crashed" error developers know, and a scary, memorable name for someone who does not code. Slogan: *"Basma dedik. Bastın."* ("We said don't press. You pressed.")

---

## 2. Game flow (screen by screen)

```
[Opening*] → [Attract / eye] → [Hack intro] → [Five stages + events] → [Result transition] → [Result] → [Error report**] → [Reset]
                    └─ 1v1 DUEL: two eyes → [Hack] → [Five stages on a split screen] → [Duel result] → [Reset]
*APK only   **only if a step went wrong, a separate screen
```

### 2.0 Opening (APK, Faz 7)

Two layers, as in BuildArena:

1. **Android launch screen:** on night blue, a red power symbol draws itself inside a turning cyan ring. It waits until the game's opening is ready (8 s at most), then fades out.
2. **The game's opening:** the club logo's **chip powers on** (Faz 8: the glowing ring closes as on the club banner, circuit traces draw out to the left, right and up, their end points light up, light runs along them), "ATÜ TECH BUILDERS SUNAR" ("presents", in the cyber font), **KERNEL PANIC** resolves out of noise, the five modules fill one by one ("> sistem hazır"); then the screen folds into a bright line like an old monitor and the button screen comes out from behind it. A tap skips it. In a browser it plays only with `?intro=1`.

### 2.1 Attract screen (the button screen)

Goal: stop a passer-by within 3 seconds.

- **The eye (Faz 9):** in the middle of the screen, where the red arcade button used to be, a big **cyber eye** sits in the same yellow-black **hazard ring** with the warning band. It is a camera-like lens: a cyan iris whose segmented ring refocuses (turns) as it looks, a red core in the pupil, a glass glare, metal lids that blink. **Every 3 seconds it looks somewhere else** — right, left, up, down, the four diagonals or straight at the visitor, never the same way twice in a row — with a quick glide like a real eye (now and then with a blink on the way), and it never quite holds still. **Wherever the screen is touched, the eye looks there** for a moment before it looks around again. Pressing the eye is pressing the button: it opens wide, its pupil shrinks, it turns alarm red, and the room fills with red light. Sonar rings still pulse out of it ("press me" from across the booth).
- **The text around it:** "BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ." stays; under the eye **rotating disclaimers** (every 4 s, typed out):
  - "Basarsan format atılır. Yedek yok." (Press it and the disk gets formatted. No backup.)
  - "Göz seni izliyor. Kırpmadan bas." (The eye is watching you. Press without blinking. — Faz 9)
  - "Bu butona basan şartları kabul etmiş sayılır. Şartları kimse bilmiyor." (Whoever presses accepts the terms. Nobody knows the terms.)
  - "Garanti kapsamı dışında. Aklınız dahil." (Not covered by the warranty. Neither is your mind.)
  - "Önce bas, sonra Stack Overflow'a sor." (Press first, ask Stack Overflow later.)
  - "Bakışma yarışı değil bu. Bas." (This is not a staring contest. Press. — Faz 9)
  - "Yönetici izni gerekmiyor. Cesaret yeterli." (No admin rights needed. Courage will do.)
  - "Pişmanlık %100, eğlence %100." (100 % regret, 100 % fun.)
  - "Son kullanma tarihi: şimdi." (Best before: now.)
  - The line "Bu buton kırmızı. Bir bildikleri vardır." (This button is red. They must know something.) left in Faz 9: the button is no longer red.
- **Background:** slowly flowing terminal lines, faint hex codes, a light scanline.
- **Who made the game (Faz 7–8):** the club logo, big (100 px), top left. Faz 8: as on the club's **banner**, a glowing **ring and circuit traces running out like the pins of a chip** (with end points and light running along them now and then); the logo file is never touched, the frame is drawn around it. Next to it the club's name in a **cyber typeface** (Orbitron), in the banner's colours: **ATÜ** white, **TECH** cyan, **BUILDERS** blue. Faz 9: the traces that run past the screen's left and top edges are cut at the edges, also while the screens switch (before, a screen switch showed them outside the game on screens wider than the tablet).
- **Corner controls (Faz 7):** next to the status light top right a small **settings** button (a gear); along the bottom the **TEK KİŞİ / 1v1 DÜELLO** (solo / duel) switch and **"Bizi takip edin"** ("Follow us": opens the club's Linktree QR, linktr.ee/atutechbuilders; closes on a tap outside or after 45 s).
- **Settings:** only the round length (45/60/75) and sound (on/off, level, sound test, music). The settings are no longer hidden in the logo.
- **Easter egg:** five quick taps on the logo show a secret "sudo" message.
- **Idle:** if nobody touches the screen for 20 s, the eye turns to the visitor, squints and blinks twice, looking around in between, until somebody touches the screen (Faz 9; before, the red button gave a little shake).

### 2.2 Hack intro (after the press, ~3 s)

This is **Stage 1 — Activate** in the club's sketch.

1. The eye is pressed, the screen shrinks into **a single CRT line** and opens again.
2. Red alarm; **"SYSTEM FAILURE"** is written from the top, letter by letter, glitching.
3. Matrix-like code rain, a hex dump and a fake log behind it:
   `> kernel: critical process terminated` · `> rerouting power... FAILED` · `> user_input: REQUIRED`
4. "Kritik sistem devre dışı kaldı. Sistemi kurtarmak için **60 saniyen** var." (A critical system went down. You have **60 seconds** to save it.) → a 3-2-1 countdown, the first stage starts.

> **Current state (Faz 5):** the hack screen opens **in the same room with the same header** as the button screen. The top bar (logo, KERNEL PANIC, status light) stays put; only "Sistem stabil" (system stable) turns into "Kritik hata" (critical error) and the room turns red. SYSTEM FAILURE resolves out of noise; the "system loss" bar and the logs run in a panel the size of the stage card (a red light circles its edge); the countdown is a cyan ring and the screen dissolves softly into the first stage.

### 2.3 The five stages (Faz 6)

**Stage 2 — Answer** and **Stage 3 — Final Protocol** of the club's sketch are now five small games. The order is the same in every round; the last stage is always the final.

**Screen:** at the top `AŞAMA 2/5` (stage 2/5) with the stage's name, the round clock bar (draining like the system's power), `Sistem %` and five module cells. In the middle a big **stage card** that stays for the whole round; the stages change inside it. At the bottom a terminal line (`> guvenlik_duvari: renk dizisi bekleniyor`, "firewall: waiting for the colour sequence").

**How a stage goes:**

1. **Title card:** the game waits dim and blurred inside the card; on top come `AŞAMA 2/5 · DÖRT RENK`, a big command (`İZLE, TEKRARLA`, watch, repeat) and a one-line hint. With an event a tag is added (RİSKLİ KANAL, GÜVENLİ KANAL, GLITCH, FİNAL). As the card dissolves the game comes up to full light and starts. The round clock stands still meanwhile.
2. **Steps:** every step has its own timer bar. A right step becomes a green dot. A wrong step or one that runs out becomes a red dot; **the right answer is shown** and the next step comes. A stage is never cut short.
3. **Grade card:** the game steps back. On a colour scale from red to green a bar fills up to the share of right steps, then the grade appears in its colour (`İYİ`, `11/13 renk doğru · %85`). The module cell in the HUD takes the same colour, then the next stage comes.

| # | Stage | Steps (normal version) | Step clock | Grade |
|---|---|---|---|---|
| 1 | **Dead Pixel** (Ölü Piksel) — find the square of a slightly different colour | **5 screens** (Faz 8, the same difficulty levels, more screens): 4×4 (10 %, easy) → 5×5 (8 %, easy) → 6×6 (6 %, medium) → 7×7 (5 %, medium) → 8×8 (3.5 % + a slight hue shift, look closely); Faz 10: every screen is **another kind of panel** — LCD squares, round LEDs, diamonds, honeycomb cells, RGB bars, in a new order every round (the diamonds, the smallest, only on the first three screens) — and in another colour from a pool of eight; its name stands next to it ("panel LED") | 5 / 5.5 / 6 / 7 / 8 s per screen; a wrong square takes **2 s** off that screen's time | screens found / 5 |
| 2 | **Four Colours** (Dört Renk) — repeat the lit colours in the same order | 3 layers: 3 colours slow → 5 colours fast (one colour twice in a row) → 5 colours, and after the show **the pads trade places** | 3 s per colour (the clock stands still while watching) | colours pressed right / 13; a wrong colour ends that layer, its remaining colours do not count |
| 3 | **Beam Path** (Işın Yolu) — tap the mirrors so the beam reaches the server | 3 lines: 6×4 (2–3 mirrors to set) → 7×5 (3–5, decoy mirrors and walls) → 8×5 (4–6). Faz 10, against repetition: each line is drawn from **three recipes** of the same difficulty, and then **mirrored** at random — the emitter sits on the left or the right, the server on either side, at the top or the bottom | 8 / 10 / 12 s per line | lines connected / 3 |
| 4 | **Colour Trap** (Renk Tuzağı) — a colour name written in another colour | 2 parts: first **YAZISINA BAS** (tap what the word says, 3 words) → ⚠ KURAL DEĞİŞTİ (the rule changed) → **RENGİNE BAS** (tap its ink colour, 3 words) | 2.6 s per word | right words / 6 |
| 5 | **Don't Press** (Basma Dedik, the final) — the red button is the only control | 4 commands in a mixed order: BASILI TUT (hold 2 s), 3 KEZ BAS (press 3 times), YEŞİLDE BAS (press on green), BASMA! (don't touch for 2 s) → **TERS MOD** (reverse mode): on BAS don't press, on BASMA! press | 2–3.8 s per command | right commands / 6 |

- **A step that runs out shows the right answer:** Dead Pixel rings the square, Four Colours lights the right pad, Beam Path turns the mirrors one by one into place and the beam reaches the server, Colour Trap frames the right button in green.
- **The Colour Trap order** is reversed on purpose: the eye first gets used to reading, then comes exactly the moment it must not read (more confusing).
- **Final:** as Don't Press starts the frame turns red, a heartbeat sounds, the music rises. The round ends with the slogan: "Basma dedik. Bastın."
- No stage needs sound; it plays at a noisy booth too.
- **Back to the button screen (Faz 7):** a small house button at the bottom right of the stage screen; **held for 1 second** it leaves the round and returns to the button screen (its ring fills; letting go early cancels it, a stray tap never ends a game).

### 2.4 Result screen and error report

See §5 and §6.

### 2.5 1v1 Duel (Faz 7)

Like BuildArena's duel: two people side by side in front of the tablet play **the same five stages at the same time** on a split screen.

- **On the button screen:** choosing **1v1 DÜELLO** shows **two eyes** instead of one big eye (Faz 9; two red buttons before): on the left **1 · OYUNCU 1** (player 1, blue), on the right **2 · OYUNCU 2** (player 2, orange). The two eyes look around together, like a face. Each player presses their own eye; the one who pressed reads "HAZIR ✓ · rakip bekleniyor" (ready, waiting for the other player), their eye takes their colour and looks across at the other player. **Once both have pressed** the system falls (hack screen: "İkinizin de 60 saniyesi var. Önce kim kurtaracak?", both of you have 60 seconds, who saves it first?). If the other does not press within 12 s, the eyes let go. The duel stays selected; the next pair can press right away.
- **Split screen:** two halves (a blue top stripe on the left, orange on the right, VS in the middle). Each half is a full round with its own HUD, clock, modules and stage card; the stages shrink to half a screen. Each half takes only its own touches; Overheat comes to each player at their own pace. Faz 9: the right half mirrors the left, its stage card's accent line runs along its outer (right) edge, so the seam between the players stays clear.
- **Same difficulty, different answers (Faz 8):** both players play the same stages **at the same difficulty**, but cannot copy from the side:
  - **Dead Pixel:** the same screens (size, colour, difference, time); the dead pixel is **somewhere else** for each player, at least two squares apart.
  - **Four Colours:** the same layer lengths, speed and swaps; every layer has **another colour order**.
  - **Colour Trap:** the same two parts; other words and colours (the same word never comes in the same colour at the same place).
  - **Don't Press:** the same commands, TERS MOD still last; **another command order**, from the first command on.
  - **Beam Path:** **the same** for both (another line could be easier, which would be unfair).
- **The duel's event (Faz 8, Faz 10):** like every round, a Glitch, on the same stage for both players.
- **The first one done (Faz 8):** on the half of the player who finishes first, the solo round's **result transition** (the title's animation) plays on their own half: the scene shrinks to fit the half, its colour layers tint that half's stage screen. Then their title, five modules and "%... kurtarıldı" (saved) stay, with "Rakip hâlâ oynuyor…" (the other player is still playing). Once both are done, "Sonuçlar geliyor…" (results coming), and once both transitions have played, the duel result.
- **Winner:** the duel result shows two columns: title, share of the system saved (right steps over the five stages), modules, time left. **The higher share wins; on a tie, more time left; if that ties too, a draw.** The winner's column glows in their colour and a crown comes down: "OYUNCU 1 KAZANDI" (player 1 wins). No rematch (for the queue); "Ana ekran" (home) or after 25 s the button screen by itself.
- The house button in the middle (held 1 s) ends the duel. Faz 8: it sits on the seam **right under VS** (before, it overlapped player 1's tag and the cards' corner at the bottom).

---

## 3. Random events

General rules (so the game does not turn into chaos):

- **At most 2 events** per round (Power Restored is only an animation and does not count); stages 1 and 5 **never** get an event.
- **Exactly 1 random event** per round: a Glitch, on stage 2, 3 or 4 (weighted 40 % / 50 % / 40 %); it breaks that stage's game a little. Solo and duel alike (§2.5).
- Overheat and Power Restored depend on **how the visitor plays**.
- Faz 10: **Emergency left the game** (§3.3); the round no longer has a safe or risky version of a stage.
- Every event's time effect scales with the chosen round length (45 / 60 / 75).
- **Photosensitive safety** in every event: nothing flashes more than 3 times a second; the device's "reduce motion" setting is respected.

### 3.1 SYSTEM OVERHEAT! (depends on the player) — both ways

| | **Going very fast** | **Going very slow** |
|---|---|---|
| Trigger | After the first two stages **more than 80 %** of the round is still left | Less than **25 %** left and at least **2 stages** still to play |
| What happens | An alarm between two stages: "İŞLEMCİ AŞIRI ISINDI" (the processor overheated) | The same, with "ÇEKİRDEK KRİTİK" (core critical) |
| Cooling | **"DOKUNMA!"** (don't touch!) on screen: the processor cools from 96 °C to 60 °C in 3 seconds | The same |
| Not touching | **No** extra time ("SOĞUTULDU · devam", cooled, go on) | **+5 s** |
| Touching | **−5 s**, a "SİSTEM ISINDI" (the system heated up) warning (the panel glows from inside) | **No** penalty, only the bonus is missed ("süre kesilmedi", no time taken) |

- The **round clock stands still** during the alarm and the cooling. Overheat comes **at most once** a round and never right before the final.
- The result shows a badge for it ("Aşırı ısınmayı atlattın", you survived the overheat).

### 3.2 GLITCH DETECTED! (by chance, with a story)

**Story: "data corruption"** — as the system crashes, that stage's game starts to break too. The stage's name resolves out of noise in the HUD, the title card gets a "GLITCH" tag, the room flickers cyan-amber.

| Stage | What the glitch does |
|---|---|
| Four Colours | The pads trade places after the show in layer 2 as well |
| Beam Path | A mirror turns by itself every 2.2 seconds |
| Colour Trap | The colour buttons trade places after every answer |

- A glitch affects **only that stage**; the logic of the right answer never breaks, only places and looks change.

### 3.3 ~~EMERGENCY MODE!~~ (removed in Faz 10)

The club took it out of the game after the Faz 9 tests ("bu oyunda çok gerek yok gibi", it does not seem needed in this game): the other events already make every round different, and its panel stopped the round for up to 12 s. What it was, for the record:

**Story: "choose a backup channel"** — before the stage starts the system offers two ways out.

- 🟢 **GÜVENLİ KANAL** (safe channel) — the game's easy version (Four Colours 3-4-4 colours, Beam Path small lines, Colour Trap 3 s per word). No effect on time.
- 🔴 **RİSKLİ KANAL** (risky channel) — the game's hardest version (Four Colours 5-6-7 colours with the fastest show, Beam Path 9×6 with 6 mirrors, Colour Trap 1.8 s per word). If the stage ends **green or lime**, **+5 s**, otherwise **−3 s**.
- **The screen freezes, reading first (Faz 8):** when the panel comes the round clock stands still ("SÜRE DURDU", time stopped), the room's code rain slows to a stop, the turning warning light becomes a still glow, the texts come in one by one, calmly. The first **4 s are for reading**: no countdown ("Acele etme: önce iki kanalı da oku.", don't rush: read both channels first). Then **8 s to choose** start ("Seçmezsen 8 sn sonra sistem güvenli kanalı seçer.", if you do not choose, the system picks the safe channel in 8 s). Without a choice, SAFE is picked. A fast reader can choose right away. (Before it was 4 s in all; first-time players could not keep up.)
- Solo rounds only.

### 3.4 POWER RESTORED! (an animation only)

- **Trigger:** **two green (or lime) stages in a row**; never after the final.
- **No effect on the game**, purely a visual reward: a warm light spreads from the HUD, a "ping", the red alarm softly turns **orange**, the code rain slows down. This calm look stays until a new event or the end of the game.

---

## 4. Time and core mechanics

| Rule | Value |
|---|---|
| Stages | 5, fixed order |
| Round length | 60 s (45 / 75 in the settings) |
| When the clock runs | Only while the player plays; it stands still during title cards, watching colours, showing the right answer, the rule warning, grade cards and event panels |
| Step clock | Every step has its own (§2.3); a step that runs out counts as wrong and its answer is shown |
| A wrong step | Only that step is lost; the stage is played to its end |
| Out of time | The round **does not stop**: the clock turns red and counts on (`+00:07`), the remaining stages are still played; the title comes from the "late" ones (§5.1) |
| Idle | The result and report screens return to the start after 25 s without a touch |

**Why:** every stage must be played to its end and graded (the club's decision). So running out of time does not cut the round; the 60-second story lives on in the clock and the title. An average player finishes the five stages in about 40–50 s of play; on the tablet the round and step lengths are tuned in `src/game/config.ts`.

---

## 5. Results (no leaderboard)

### 5.1 Grades and titles

**Stage grade** (share of right steps):

| Share | Grade | Colour |
|---|---|---|
| 100 % (all right) | **TEMİZ** (clean) | green `#02FF18` |
| more than 75 % | **İYİ** (good) | lime (between green and orange) `#B8F53D` |
| 50–75 % (75 included) | **SINIRDA** (borderline) | orange `#FF8C1A` |
| below 50 % | **BOZUK** (broken) | red `#FF2D4A` |

The grade depends on the stage's number of steps: in a 3-step stage (Beam Path) 2/3 = 67 % is orange; lime shows up in stages with 5 or more steps (Dead Pixel 5, Four Colours 13, Colour Trap 6, Don't Press 6). Green and lime together count as "the module is up".

**Title** (from the five grades; the four titles of the club's sketch are kept, three new ones added):

| Situation | Title | Colour |
|---|---|---|
| All five CLEAN, ≥ 20 % of the time left | **SYSTEM SAVIOR** | green |
| All five CLEAN, < 20 % of the time left | **LAST SECOND HERO** | green |
| All five green or lime (at least one lime) | **ALL SYSTEMS GO** *(new)* | lime |
| Four green/lime, one orange or red | **ONE BUG LEFT** | lime |
| No red, at least two orange | **BARELY BOOTED** | orange |
| 1–2 red | **SAFE MODE** | orange |
| 3–4 red | **ERROR 404** *(new)* — "Sistem bulunamadı. Sen değil, o kayboldu." (System not found. Not you, it got lost.) | red |
| All five red | **KERNEL PANIC** *(new)* — "Oyunun adını hak ettin. Tebrikler(?)" (You earned the game's name. Congratulations(?)) | red |
| Out of time, at least 3 green/lime | **ALMOST A LEGEND** | orange |
| Out of time, fewer | **HAVE YOU TRIED TURNING IT OFF AND ON?** | red |

### 5.2 The result screen

- **System modules:** the five small HUD cells **fly** into big cells, each in its stage's colour, with the stage's name and grade below (`Dört Renk · 11/13 · İYİ`).
- The big **title** (in the grade scale's colours) with a one-line joke.
- **Right steps / wrong steps** counting up, **time left** ("Süre aşımı +7 sn", overtime, if the time ran out).
- Badges for the events survived (🔥 Overheat · ⚡ Power · 🧩 Glitch).
- Two buttons: **HATA RAPORUNU AÇ** (open the error report, only if a step went wrong) and **YENİDEN BAŞLAT** (restart).
- **No** nickname, leaderboard or records.

### 5.3 Result transitions

> **Faz 6 (2 November, the club's feedback: "we could not like any but Barely Booted"):** BARELY BOOTED stayed as it was. The other six transitions were rebuilt and the three new titles got new ones. All follow BARELY BOOTED's liked style: the stage screen stays underneath and dims, freezes or switches off; on top, a small piece of the system **tells the story** (no colour waves or detached particles). Texts blur away before the result comes, the last stage's grade card fades softly as the transition starts, the module cells fly into the result.

| Title | Transition (Faz 6) |
|---|---|
| SYSTEM SAVIOR | Five arcs draw one by one and close a ring (one arc per stage), a check mark draws itself in the middle, the ring glows green; "SYSTEM RESTORED", "5/5 modül temiz · 23 sn kaldı" (5/5 modules clean, 23 s left); the room turns green |
| LAST SECOND HERO | The screen freezes and loses its colour; the seconds left ("00:04") beat twice like a heart in the middle; the colour comes back out of the clock, a "SON SANİYEDE KURTARILDI" (saved in the last second) stamp |
| ALL SYSTEMS GO *(new)* | A "system status" window opens like a tube; the five modules' lights come on one by one in their colours (green / lime); an "ALL SYSTEMS GO" strip fills from left to right |
| ONE BUG LEFT | The other modules dim, the one broken module breathes in a red frame; a **magnifying glass** comes out of it and grows, a pixel bug wiggles its legs inside; "1 bug bulundu · Işın Yolu %33" (1 bug found) |
| BARELY BOOTED | (Unchanged) a framed boot window: lines come with status tags on the right (640K OK, modules x/5, idare eder = it'll do), a blinking cursor, a bar that fills "just enough" in fits and starts |
| SAFE MODE | The screen loses its colour; an old **Advanced Boot Options** menu opens, the selection bar moves down from "Normal başlat" (start normally) to "Güvenli Mod" (safe mode) and picks it; the menu folds into a line and vanishes, "Safe Mode" appears in the corners |
| ERROR 404 *(new)* | A "sistem://kurtarma" (system://rescue) window: a big 404 whose zero is a broken ring that never closes; "Sistem bulunamadı", "sistemi kurtar" (save the system) is typed into a search box, "0 sonuç" (0 results) |
| KERNEL PANIC *(new)* | The screen freezes and darkens; the kernel's last words scroll ("Kernel panic - not syncing", `[ FAIL ] ekran_01.ko %0` for every stage, Call Trace: `basma_dedik+0x1f`); then a huge red "KERNEL PANIC" and a keyboard light blinking once a second |
| ALMOST A LEGEND | A huge "LEGEND" fills from the left like a gauge but stops before the end; the edge of the fill trembles twice; "NEREDEYSE… 7 sn geç kaldın" (almost… you were 7 s late) |
| HAVE YOU TRIED… | The stage screen **switches off** like an old monitor (shrinks into a bright line, then a dot), the room darkens; a power button symbol appears, its ring fills as if held and lights cyan; "Kapat. Aç. Tekrar dene." (Turn it off. Turn it on. Try again.) comes word by word |

**Background variant:** the round's event background (Overheat, Glitch, Power) is on the stage screen itself, so the transition always matches it (priority: Overheat > Glitch > Power Restored > Normal).

> **Earlier versions:** on 1 November the transitions were colour layers over the question screen (painting green, freezing, an iris, a blue screen); Faz 5 added the ONE BUG LEFT zoom and the BARELY BOOTED window. In Faz 6 all but BARELY BOOTED changed into the versions above.

---

## 6. Error report (a separate screen)

Opened from the result screen with **HATA RAPORUNU AÇ**; if every step was right the button does not show at all ("0 hata. Log tertemiz.", 0 errors, the log is spotless).

In the look of a terminal / error log, one row for every stage with a wrong step:

```
HATA RAPORU   4 hatalı adım
─────────────────────────────────────────────────────────
AŞAMA 2  Dört Renk     10/13 · %77 · İYİ
         > katman 2 · 4. renkte MAVİ, doğrusu SARI
─────────────────────────────────────────────────────────
AŞAMA 4  Renk Tuzağı   5/6 · %83 · İYİ
         > 2. bölüm · doğrusu YEŞİL, sen KIRMIZI
```

(Error report, 4 wrong steps. Stage 2, Four Colours: layer 2, 4th colour BLUE, should be YELLOW. Stage 4, Colour Trap: part 2, should be GREEN, you RED.)

- Every row in the colour of the stage's grade; at most 2 entries under it ("… 1 kayıt daha", 1 more entry).
- No scrolling (5 rows at most).
- At the bottom: **◀ Sonuca dön** (back to the result) and **YENİDEN BAŞLAT**.
- Returns to the start after 25 s without a touch.

---

## 7. Sound and visual design

- **Sound (on at the booth):** alarm siren, ping, an "error" beep, a power-restored chime; a note per pad in Four Colours, a click when a mirror turns, a "whoosh" when pads trade places, a rising tone on the grade card. Synthesised in code with Web Audio, no licensing issues. No stage depends on sound.
- **Music (generative, no files, renewed for the theme in Faz 5):** an attention-grabbing **"Sinyal"** (signal) at the button (112 BPM, A minor, Am-F-C-G; a catchy melody every other round), a tense **"Geri sayım"** (countdown) on the stages (96 BPM, D minor, Dm-B♭-Gm-A; an ostinato ticking like a clock, a heartbeat bass). It rises in the final stage and the last 10 seconds (hi-hat, siren), goes muffled during Overheat while the clock stands still, and falls silent under the hack alarm. On the result it plays by the title's tone: a **victory march** for a win (118 BPM, C major), a **calm electric piano** for a close call (88 BPM), **broken lo-fi** for a crash (74 BPM, a stuttering beat, crackle). It plays on a quieter channel than the effects; the settings have their own "Müzik" switch. It starts with the first touch (in the APK, at the opening).
  - Tablet browsers lock sound until the first touch; **pressing the eye** is that touch, no extra step needed.
  - The booth may be noisy: alarm and event sounds are sharp and clear, music and hum low; every cue also shows on screen.
  - The settings have a master volume; the tablet's volume is turned all the way up before the booth.
- **Type:** **Chakra Petch** (UI and commands; technical but readable) + **JetBrains Mono** (terminal logs, clock, codes) + **Orbitron** (the club's name only). All bundled in the app with full Turkish characters; commands readable from a distance (at least 28 px).
- **Effects:** scanlines, CRT curvature, vignette, code rain, glitch strips, Overheat embers. All CSS/Canvas/SVG, no image files needed.
- **Motion rule (Faz 4, the club's feedback):** transitions are **soft** and **tied to the screen**. Every effect grows out of an element on screen (the pressed eye's red fills the screen and the hack screen opens inside that red; the Power Restored light spreads from the HUD; the magnifying glass comes out of the broken module). The stage card stays for the whole round and the stages change inside it; things that change place (pads, colour buttons, mirrors) glide; event panels take the card's place; background moods layer into each other; the result transition plays over the stage screen and the result dissolves open from it. No detached sparks, shakes or screen tears.
- **One world and screen switches (Faz 5):** all screens stand in **one room** (code rain, a perspective grid floor, the room's light, CRT glass). The room never switches off, only its light changes: cyan at the button, red at the hack, the event's colour during an event, the result's colour at the end; red during the stages, fading as modules turn green. The new light comes up before the old one lets go, so there is never a dark moment in between. Screens **cross-fade** into each other.
- **Touch:** every target ≥ 64 px (the Don't Press button 230 px), guards against double taps and stray presses.

---

## 8. Technical plan

| Topic | Decision |
|---|---|
| Technology | **React + Vite + TypeScript**, a single-page app that runs offline |
| Animation | Plain CSS (keyframes, filter, mix-blend) + SVG (Beam Path, rings, the eye) + `<canvas>` for the code rain; no extra library |
| State | A small state machine with `useReducer`: `ATTRACT → HACK → PLAY → RESULT → REPORT`; the round only knows steps, holds and the end of a stage |
| Stages | Every stage has a pure generator (`src/game/stages/`, seeded: the same seed gives the same screens) and a small class with its timing and touch logic (`src/screens/stages/runners/`); the React component only draws |
| The eye | `src/components/eye/`: the drawing (`Eye.tsx`), pure geometry (`geometry.ts`: directions, lids, blink) and the motion (`motion.ts`: one `GazeDirector` per button screen, an `EyeMotion` per eye writing the SVG on every frame) |
| Sound | Synthesised with the Web Audio API (no files); unlocked on the first touch |
| Tablet | The tablet is **Android**: an **APK with Capacitor** (landscape, full screen, screen kept on, the back button never exits). A **PWA** (`vite-plugin-pwa`) as backup |
| Screen on | The Screen Wake Lock API keeps the tablet's screen on |
| Touch | Zoom, long-press menus, text selection, scrolling and double-tap are off; all targets ≥ 64 px; landscape locked |
| Data | `src/game/config.ts` (round length, step clocks, grade thresholds, event odds, bonuses); `src/data/texts.ts` (stage, title and event texts) |
| Security | No API or server; no personal data kept |
| Tests | Unit tests (rules, generators, stage logic with fake timers, the eye's geometry), Playwright on the tablet profile for every stage and event; the last test on the tablet |
| Code language | Identifiers, file names, comments and documents in English; only the on-screen texts are Turkish (Faz 9) |

**Folders:**

```
src/
  game/              state machine, grades, titles, events, settings
  game/stages/       the five stages' generators (pixel, colours, beam, trap, orders)
  components/eye/    the eye on the button screen
  screens/           Attract, Hack, Play, Result, Report, Settings, DuelPlay, DuelResult
  screens/play/      stage card, grade card, event panels
  screens/stages/    the five games (PixelStage … OrdersStage) + runners/ (timing and touch logic)
  fx/                the shared world, code rain, result transitions, the opening
  audio/             synthesised sounds and music
  data/              texts
```

| Stage | Stage id | Generator | Runner | Component |
|---|---|---|---|---|
| Dead Pixel (Ölü Piksel) | `pixel` | `game/stages/pixel.ts` | `runners/pixel.ts` | `PixelStage` |
| Four Colours (Dört Renk) | `colours` | `game/stages/colours.ts` | `runners/colours.ts` | `ColoursStage` |
| Beam Path (Işın Yolu) | `beam` | `game/stages/beam.ts` | `runners/beam.ts` | `BeamStage` |
| Colour Trap (Renk Tuzağı) | `trap` | `game/stages/trap.ts` | `runners/trap.ts` | `TrapStage` |
| Don't Press (Basma Dedik) | `orders` | `game/stages/orders.ts` | `runners/orders.ts` | `OrdersStage` |

**Questions (archive):** until Faz 5 the game used a pool of 120 questions. In Faz 6 the questions left the game completely; the pool and its answer check are kept only as an archive in `docs/archive/` (in Turkish, the game's language).

---

## 9. Palette (taken from the logo)

The logo was analysed: a dark navy background, a cyan ring and "TECH", cobalt blue "BUILDERS", a green `{ }`, a white "ATÜ".

| Role | Colour | Code |
|---|---|---|
| Background | Night navy | `#090E1D` |
| Panel | Dark navy blue | `#0F1830` |
| Main accent | Cyan | `#44EFEC` |
| Secondary | Cobalt blue | `#0040E0` |
| Success / right | The logo's green (`{ }`) | `#02FF18` |
| Text | White | `#FFFFFF` |
| Alarm | Alarm red | `#FF2D4A` |
| Warning / glitch | Amber | `#FFB020` |
| Grade: İYİ | Lime | `#B8F53D` |
| Grade: SINIRDA | Orange | `#FF8C1A` |
| Duel players | Blue / orange | `#5B8CFF` / `#FF9A52` |

Red and amber are not in the logo; they were added **on purpose**: the game's drama needs alarm colours, and red is the strongest contrast on the night blue. The grade colours (green → lime → orange → red) came in Faz 6. They can be changed in one file (CSS variables).

---

## 10. Roadmap (booth on 4 November)

| Phase | Day | Content | Status |
|---|---|---|---|
| **Faz 0** | 31 Oct | Setup (React + Vite + TS, BuildArena's tool chain), colour tokens and fonts, the 1280×800 stage, every tunable number (`src/game/config.ts`), the title rules, logo and PWA icons, agent rules and skills | ✅ |
| **Faz 1** | 31 Oct night | Question pool + parser; state machine; the **red button screen**; the **hack intro** (SYSTEM FAILURE, logs, 3-2-1); the **question screen**; **result** and **error report** (basic); synthesised sounds; back to the start after 25 s idle | ✅ |
| **Faz 2** | 1 Nov | **Events:** Overheat (fast/slow), Glitch, Emergency, Power Restored + the event planner; **result transitions per title** with background variants; event badges; **hidden settings**; the "sudo" surprise | ✅ 186 unit + 60 end-to-end tests |
| **Faz 3** | 1 Nov | **Animation quality:** sonar rings on the button, alarm light and a ring countdown on the hack screen, embers and **the clock standing still** in Overheat, **red to orange** in Power Restored, the title resolving on the result | ✅ 187 unit + 61 end-to-end tests |
| **Faz 4** | 1 Nov | **Soft transitions** (the motion rule); **APK** (`npm run apk`, Capacitor; `KernelPanic.apk` on the desktop); Wake Lock and full screen; source check of the answers | ✅ 187 unit + 61 end-to-end tests |
| **Faz 5** | 1 Nov | **Quality pass:** one shared world under every screen; cross-fades between screens (View Transitions); the hack screen in the same room with the same header; module cells flying into the result; ONE BUG LEFT and BARELY BOOTED renewed; new music for the theme | ✅ 187 unit + 68 end-to-end tests |
| **Faz 6** | 2 Nov | **Five stages instead of questions** (the games of the "Beş Aşama" page, at the club's request): Dead Pixel with its own clock per screen, the right pixel shown when it runs out; every step with its own clock; **a mistake never ends a stage**, every stage is played to its end and gets a **colour grade** (green / lime / orange / red); Colour Trap first the word, then the colour; events adapted to the stages ("DOKUNMA!" cooling, easy/hard versions, a glitch per stage); the round counts on when time runs out; **3 new titles** (ALL SYSTEMS GO, ERROR 404, KERNEL PANIC); **every result transition renewed** except BARELY BOOTED, new ones for the new titles; stage title and grade cards; stage names and grades on the result, the report per stage; questions moved to the archive | ✅ 92 unit + 66 end-to-end tests |
| **Faz 7** | 2 Nov | **1v1 duel** (a mode switch on the button screen, two buttons, starts once both pressed; the same five stages on a split screen; the first one done waits; a winner screen); **APK opening** (Android launch screen: red power symbol + turning ring; the game's opening: logo, KERNEL PANIC, five modules, folding like a monitor into the game); a **big logo with "ATÜ TechBuilders yapımı"** (made by) on the button screen, a **gear settings button** (time and sound only), **"Bizi takip edin"** QR; a **house button** in the game (hold 1 s); **Overheat rules** (plenty of time: a touch costs −5 s; little time: holding off gives +5 s); fixed "3 KEZ BAS" not filling its ring on the third tap | ✅ 94 unit + 81 end-to-end tests |
| **Faz 8** | 2 Nov | **Fair but different duel content** (the same difficulty; the dead pixel's place, the colour order, Colour Trap's words and Don't Press's command order differ per player; Beam Path the same); **no Emergency in a duel**; the first one done gets **their own result transition** on their half (as in a solo round, shrunk to fit); **Emergency freezes the screen**, 4 s to read + 8 s to choose; **Dead Pixel 5 screens**; the logo in the **banner's chip frame** (ring + circuit traces), the club's name in a **cyber typeface** (Orbitron, ATÜ white · TECH cyan · BUILDERS blue), "yapımı · stant oyunu #2" removed, the chip powers on in the opening; the duel's house button moved under VS | ✅ 105 unit + 83 end-to-end tests |
| **Faz 9** | 2 Nov | **The cyber eye** replaces the red button (the club picked it from three eyes on the "Kernel Panic Göz" prototype page): it looks somewhere else **every 3 s**, looks **where the screen is touched**, squints at the visitor when idle, opens wide and turns red when pressed; two eyes in the duel, looking together; the duel's right half mirrors the left (card accent on the outer edge); the logo chip **no longer spills out** of the game during screen switches; **English identifiers, file names and documents** for the public repository (the UI stays Turkish); end-to-end tests made independent of the machine's speed (they failed on GitHub's slower runners) | ✅ 111 unit + 87 end-to-end tests |
| **Faz 10** | 2 Nov | **Emergency removed** (one Glitch every round, solo and duel; the safe/risky versions of the stages are gone); **Dead Pixel variety**: five kinds of panel (LCD, LED, diamond, honeycomb, RGB bars) and eight colours, in a new order every round, the difficulty unchanged; **Beam Path variety**: three recipes per line and lines mirrored at random (the beam from either side, the server anywhere) | ✅ 110 unit + 82 end-to-end tests |
| **Last test** | before release | **On the tablet:** sound level, touch feel, smoothness of the effects, **two people touching at once (duel)**, a trial with 5–10 people, **tuning the step and round lengths** (Dead Pixel's last screen, Beam Path's line clocks, YEŞİLDE BAS), backup install | |
| **Booth** | 4 Nov | Setup, sound and screen-on check, watching during the day | |

### Cut list (if time runs short, in this order)

The core loop (eye → hack → five stages → result → error report) and the four events **stay**. First to go:

1. The easter egg and the secret "sudo" message
2. **3 shared transitions** (success / close call / crash) + the background variant instead of one per title
3. Background hum and extra sound effects (alarm and ping stay)
4. Settings other than the round length

---

## 11. Decision log

| # | Topic | Decision |
|---|---|---|
| 1 | Name | **KERNEL PANIC** |
| 2 | Overheat | "DOKUNMA!" cooling for 3 s. With plenty of time: no reward for holding off, a touch costs **−5 s**. With little time: holding off gives **+5 s**, a touch costs nothing (Faz 7) |
| 3 | ~~Emergency reward~~ | Emergency removed in Faz 10 (see #30) |
| 4 | ~~Question tone~~ | Questions removed in Faz 6 (see 12) |
| 5 | Device and sound | **Tablet**, sound **on**; no stage depends on sound |
| 6 | Technology | **React + Vite + TypeScript** |
| 7 | Palette | Based on the logo (cyan-navy-red) + grade colours |
| 8 | Tablet | **Android** (the booth tablet BuildArena runs on) → Capacitor APK, PWA as backup |
| 9 | Development | Code in `Desktop/KernelPanic`, editor **Antigravity**; agent rules in `AGENTS.md`, skills in `.agents/skills/` |
| 10 | ~~Question pool~~ | Archived in Faz 6 (`docs/archive/`) |
| 11 | Schedule | Booth on **4 November 2026** |
| 12 | Game | **Five stages**, fixed order: Dead Pixel → Four Colours → Beam Path → Colour Trap → Don't Press (final) |
| 13 | Mistakes | A mistake or a step running out only costs that step, its answer is shown; **every stage is played to its end** |
| 14 | Score | Stage grade: 100 % green, >75 % lime, 50–75 % orange, <50 % red; the title comes from the five grades |
| 15 | Colour Trap order | First tap **what the word says**, after the rule changes **its ink colour** |
| 16 | Out of time | The round goes on; the clock counts on, the remaining stages are played, the title comes from the "late" ones |
| 17 | Duel | **1v1**, two halves on one screen, the same content; a mode switch on the button screen + two eyes (starts once both pressed); the winner by share saved, then time left; no rematch |
| 18 | Settings | The settings hidden in the logo were removed; a gear at the top right; time and sound only |
| 19 | Back home | A house button in the game, held for 1 s |
| 20 | Logo | A big logo on the button screen + "ATÜ TechBuilders yapımı"; the "Bizi takip edin" Linktree QR (Faz 8: the "yapımı" line was removed, see #25) |
| 21 | Duel content | The same difficulty, other answers (dead pixel's place, colour order, words, command order); Beam Path the same for both |
| 22 | Duel events | No Emergency; the random event is always a Glitch |
| 23 | End of a duel | The solo result transition on the half of the player done first, shrunk to fit; the duel result once both transitions have played |
| 24 | ~~Emergency time~~ | Emergency removed in Faz 10 (see #30) |
| 25 | Logo and name | Ring + circuit traces as on the banner; the club's name in Orbitron in the banner's colours; Dead Pixel 5 screens (the same difficulty levels) |
| 26 | The button screen's hero | The **cyber eye** (from the prototype page's three eyes: cyber, red, living) in the hazard ring with "BASMAK ÜZERESİN"; pressing it is pressing the button |
| 27 | The eye's looks | Somewhere else **every 3 s** (8 directions or straight ahead, never twice the same); looks **where the screen is touched** (1.8 s); idle 20 s: squints at the visitor and blinks twice |
| 28 | Duel halves | Mirrored: each stage card's accent line on the outer edge |
| 29 | Public repository | Code identifiers, file names, comments and documents in English; on-screen texts stay Turkish; the README ends with a Turkish section on how to play |
| 30 | Emergency | **Removed** (Faz 10): every round, solo or duel, gets one Glitch on stage 2, 3 or 4 |
| 31 | Dead Pixel variety | Five kinds of panel and eight colours, each screen of a round different; sizes, differences and clocks unchanged |
| 32 | Beam Path variety | Three recipes of the same difficulty per line; every line mirrored at random (emitter left or right, server on any side) |

---

## 12. Risks and measures

| Risk | Measure |
|---|---|
| Too little time | A phase-by-phase plan, a cut list, the core first |
| Red alarms and flashing may disturb | Fewer than 3 flashes a second, the device's "reduce motion" setting is respected |
| Booth noise, sounds go unheard | No stage depends on sound; sharp alarm sounds, every cue also on screen |
| Sound lock on the tablet (browser) | Sound unlocks on the first touch of the eye |
| The tablet's screen switches off / sleeps | Wake Lock, charging cable, sleep off |
| Visitors change the settings | The settings hold only time and sound; staff check them before the booth |
| Two people touch at once in the duel | Each half takes only its own touches; to be tried with two people on the tablet |
| Copying from the side in the duel | Answers differ per player (except Beam Path, where both lines are the same) |
| Dead Pixel's 5 screens make the round longer | Screen clocks in `config.ts`; shortened on the tablet if needed, or the round set to 75 s |
| A visitor does not see that the eye is to be pressed | The hazard ring, "BASMAK ÜZERESİN" and the sonar rings stay from the red button; the disclaimers say "bas" (press); watched at the booth |
| Long queue, rounds take too long | Every step has a limited clock, so a round ends by itself even untouched; the result resets after 25 s idle; a tap skips the transition |
| Stages too easy / too hard | A trial with 5–10 people on the tablet; step clocks and differences tuned in one file (`config.ts`) |
| A first-time visitor does not know what to do | Every stage's title card has a big command and a one-line hint; the clock stands still meanwhile |
| Colour-blind visitors | Four Colours' pads keep their places (except swaps); Colour Trap's first part is about reading the word |
| Animations tire the tablet | Effects are mostly CSS/GPU; in the duel two rounds run at once, to be checked on the tablet |
| Crash / freeze | Error handling, automatic return to the start; a backup device |
| End-to-end tests fail on slower machines (GitHub) | Timed checks hold the page's clock or act inside the page; checked with a 4× slower CPU (Faz 9) |

---

## 13. Out of scope (for now)

A leaderboard, user accounts, an internet connection, online multiplayer (the side-by-side 1v1 duel is in), camera/QR registration, a prize system.

---

*Faz 0–9 done; the only step left before release is the last test on the tablet (duel included) and tuning the time.*
