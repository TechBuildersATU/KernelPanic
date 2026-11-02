import type { EventKind, StageId, TitleId } from '@/game/types'

/** The red button's fixed label (§2.1). */
export const BUTTON_LABEL = 'BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ.'

/** Rotating "legal" lines under the button, typed out one by one (§2.1). */
export const DISCLAIMERS: readonly string[] = [
  'Basarsan format atılır. Yedek yok.',
  'Bu butona basan şartları kabul etmiş sayılır. Şartları kimse bilmiyor.',
  'Garanti kapsamı dışında. Aklınız dahil.',
  "Önce bas, sonra Stack Overflow'a sor.",
  'Yönetici izni gerekmiyor. Cesaret yeterli.',
  'Pişmanlık %100, eğlence %100.',
  'Son kullanma tarihi: şimdi.',
  'Bu buton kırmızı. Bir bildikleri vardır.',
]

export interface TitleText {
  /** Shown big on the result screen (stays English, like SYSTEM FAILURE). */
  title: string
  /** One-line joke under the title. */
  line: string
}

/** Result titles (§5.1, §5.2). */
export const TITLES: Readonly<Record<TitleId, TitleText>> = {
  'system-savior': {
    title: 'SYSTEM SAVIOR',
    line: 'Sistem ayakta. Sunucular sana minnettar.',
  },
  'last-second-hero': {
    title: 'LAST SECOND HERO',
    line: 'Son milisaniyede kurtardın. Nabzın hâlâ 120.',
  },
  'all-systems-go': {
    title: 'ALL SYSTEMS GO',
    line: 'Beş modül de yeşil. Birkaçı biraz terlemiş.',
  },
  'one-bug-left': {
    title: 'ONE BUG LEFT',
    line: 'Her şey çalışıyor… bir şey hariç.',
  },
  'barely-booted': {
    title: 'BARELY BOOTED',
    line: 'Sistem açıldı. Nasıl açıldığını sorma.',
  },
  'safe-mode': {
    title: 'SAFE MODE',
    line: 'Sistem açıldı ama sadece Not Defteri çalışıyor.',
  },
  'error-404': {
    title: 'ERROR 404',
    line: 'Sistem bulunamadı. Sen değil, o kayboldu.',
  },
  'kernel-panic': {
    title: 'KERNEL PANIC',
    line: 'Oyunun adını hak ettin. Tebrikler(?)',
  },
  'almost-a-legend': {
    title: 'ALMOST A LEGEND',
    line: 'Efsane olmana birkaç saniye kalmıştı.',
  },
  'turn-it-off-and-on': {
    title: 'HAVE YOU TRIED TURNING IT OFF AND ON?',
    line: 'Bilinen en eski çözüm: kapat, aç, tekrar dene.',
  },
}

/** Event banners (§3). Titles stay English like the other system banners. */
export const EVENT_TEXT: Record<EventKind, { title: string; line: string }> = {
  overheat: { title: 'SYSTEM OVERHEAT!', line: 'Çekirdek sıcaklığı kritik seviyede' },
  glitch: { title: 'GLITCH DETECTED!', line: 'Bu aşamanın oyunu bozuldu' },
  emergency: { title: 'EMERGENCY MODE!', line: 'Yedek kanallar devrede' },
  power: { title: 'POWER RESTORED!', line: 'Art arda iki yeşil aşama: enerji geri geldi' },
}

export interface StageText {
  name: string
  /** The big command on the stage's title card. */
  command: string
  hint: string
  /** What the glitch does to this stage. */
  glitch?: string
  /** The terminal line while it runs. */
  log: string
  /** Module file in the log ("modul_02"). */
  file: string
  /** What one step is called on the grade card ("2/3 ekran doğru"). */
  step: string
}

/** The five stages (§2.3). */
export const STAGE_TEXT: Readonly<Record<StageId, StageText>> = {
  piksel: {
    name: 'Ölü Piksel',
    command: 'BUL!',
    hint: 'rengi azıcık farklı olan kareye dokun',
    log: 'ekran_tarama.sys: ölü piksel aranıyor',
    file: 'ekran',
    step: 'ekran',
  },
  renk: {
    name: 'Dört Renk',
    command: 'İZLE, TEKRARLA',
    hint: 'yanan renkleri aynı sırayla tekrarla',
    glitch: 'renkler 2. katmanda da yer değiştirir',
    log: 'guvenlik_duvari: renk dizisi bekleniyor',
    file: 'duvar',
    step: 'renk',
  },
  isin: {
    name: 'Işın Yolu',
    command: 'YÖNLENDİR!',
    hint: 'aynalara dokun, ışını sunucuya ulaştır',
    glitch: 'aynalardan biri kendi kendine döner',
    log: 'veri_isini: sunucuya yol aranıyor',
    file: 'hat',
    step: 'hat',
  },
  tuzak: {
    name: 'Renk Tuzağı',
    command: 'TUZAĞA DÜŞME!',
    hint: 'önce yazana bas; kural değişince yazının rengine',
    glitch: 'renk düğmeleri her cevapta yer değiştirir',
    log: 'renk_filtresi: tuzak tespit edildi',
    file: 'filtre',
    step: 'kelime',
  },
  basma: {
    name: 'Basma Dedik',
    command: 'BASMA DEDİK',
    hint: "ne yazıyorsa onu yap; TERS MOD'da tersini",
    log: 'final_protocol.sys yüklendi',
    file: 'final',
    step: 'komut',
  },
}
