/**
 * Interface strings for the five newer languages: Filipino, Malay, Indonesian,
 * Burmese and Lao. Each row is [English, Filipino, Malay, Indonesian, Burmese, Lao],
 * keyed by the same English text the DOM translator sees. Anything not listed
 * here falls back to English, the same as the other languages.
 */
import type { Language } from "./i18nExtras";
import { MORE_LANGUAGES, lookupMoreRow, type MoreLanguage } from "./i18nMore";

export type NewLanguage = "fil" | "ms" | "id" | "my" | "lo" | MoreLanguage;
export const NEW_LANGUAGES: NewLanguage[] = ["fil", "ms", "id", "my", "lo"];

export function isNewLanguage(lang: Language): lang is NewLanguage {
  return (NEW_LANGUAGES as Language[]).includes(lang) || (MORE_LANGUAGES as Language[]).includes(lang);
}

type NewRow = [string, string, string, string, string, string];

const NEW_ROWS: NewRow[] = [
  // navigation & shell
  ["Home", "Tahanan", "Laman Utama", "Beranda", "ပင်မ", "ໜ້າຫຼັກ"],
  ["Shop", "Tindahan", "Kedai", "Toko", "ဆိုင်", "ຮ້ານຄ້າ"],
  ["Towers", "Mga Tore", "Menara", "Menara", "စင်တိုင်များ", "ຫໍຄອຍ"],
  ["Specials", "Espesyal", "Istimewa", "Spesial", "အထူး", "ພິເສດ"],
  ["Guild", "Gild", "Gild", "Guild", "အသင်း", "ສະມາຄົມ"],
  ["Mail", "Mensahe", "Mel", "Surat", "စာ", "ຈົດໝາຍ"],
  ["Season", "Season", "Musim", "Musim", "ရာသီ", "ລະດູການ"],
  ["Command Center", "Sentro ng Utos", "Pusat Komando", "Pusat Komando", "ဌာနချုပ်", "ສູນບັນຊາ"],
  ["Settings", "Mga Setting", "Tetapan", "Pengaturan", "ဆက်တင်များ", "ການຕັ້ງຄ່າ"],
  ["Language", "Wika", "Bahasa", "Bahasa", "ဘာသာစကား", "ພາສາ"],
  ["Choose the interface language", "Piliin ang wika ng interface", "Pilih bahasa antara muka", "Pilih bahasa antarmuka", "interface ဘာသာစကားကို ရွေးပါ", "ເລືອກພາສາຂອງ interface"],
  ["Interface Theme", "Tema ng Interface", "Tema Antara Muka", "Tema Antarmuka", "interface အဆင်အပြင်", "ຫົວຂໍ້ interface"],
  ["Install App", "I-install ang App", "Pasang Aplikasi", "Pasang Aplikasi", "အက်ပ်ထည့်သွင်းရန်", "ຕິດຕັ້ງແອັບ"],
  ["Installed", "Naka-install", "Dipasang", "Terpasang", "ထည့်သွင်းပြီး", "ຕິດຕັ້ງແລ້ວ"],
  ["Install", "I-install", "Pasang", "Pasang", "ထည့်သွင်း", "ຕິດຕັ້ງ"],
  ["Back", "Bumalik", "Kembali", "Kembali", "နောက်သို့", "ກັບຄືນ"],
  ["Close", "Isara", "Tutup", "Tutup", "ပိတ်", "ປິດ"],
  ["Cancel", "Kanselahin", "Batal", "Batal", "ပယ်ဖျက်", "ຍົກເລີກ"],
  ["Save", "I-save", "Simpan", "Simpan", "သိမ်းရန်", "ບັນທຶກ"],
  ["Confirm", "Kumpirmahin", "Sahkan", "Konfirmasi", "အတည်ပြုရန်", "ຢືນຢັນ"],
  ["Continue", "Magpatuloy", "Teruskan", "Lanjutkan", "ဆက်လုပ်ရန်", "ສືບຕໍ່"],
  ["Remove", "Alisin", "Buang", "Hapus", "ဖယ်ရှား", "ລຶບອອກ"],
  ["Send", "Ipadala", "Hantar", "Kirim", "ပို့ရန်", "ສົ່ງ"],
  ["Pause", "I-pause", "Jeda", "Jeda", "ရပ်ရန်", "ຢຸດຊົ່ວຄາວ"],
  ["Resume", "Ipagpatuloy", "Sambung", "Lanjutkan", "ဆက်ရန်", "ສືບຕໍ່"],
  ["PAUSED", "NAKA-PAUSE", "DIJEDA", "DIJEDA", "ရပ်နေသည်", "ຢຸດຊົ່ວຄາວ"],
  ["Play", "I-play", "Main", "Main", "ဖွင့်ရန်", "ຫຼິ້ນ"],
  ["Upgrade", "I-upgrade", "Naik Taraf", "Tingkatkan", "အဆင့်မြှင့်", "ອັບເກຣດ"],
  ["Collect", "Kolektahin", "Kutip", "Ambil", "ရယူရန်", "ເກັບ"],
  ["Victory", "Tagumpay", "Kemenangan", "Kemenangan", "အနိုင်ရခြင်း", "ໄຊຊະນະ"],
  ["Defeat", "Pagkatalo", "Kekalahan", "Kekalahan", "ရှုံးနိမ့်ခြင်း", "ພ່າຍແພ້"],
  ["Enter battle", "Pumasok sa laban", "Masuk pertempuran", "Masuk pertempuran", "တိုက်ပွဲသို့ဝင်ရန်", "ເຂົ້າສູ່ການຕໍ່ສູ້"],
  ["Settings", "Mga Setting", "Tetapan", "Pengaturan", "ဆက်တင်များ", "ການຕັ້ງຄ່າ"],
  // modes
  ["Battle", "Laban", "Pertempuran", "Pertempuran", "တိုက်ပွဲ", "ການຕໍ່ສູ້"],
  ["Endless", "Walang Hanggan", "Tanpa Henti", "Tanpa Henti", "အဆုံးမဲ့", "ບໍ່ມີທີ່ສິ້ນສຸດ"],
  ["Gauntlet", "Hamon", "Cabaran", "Tantangan", "စိန်ခေါ်မှု", "ສິ່ງທ້າທາຍ"],
  ["Sandbox", "Sandbox", "Kotak Pasir", "Sandbox", "Sandbox", "Sandbox"],
  ["Hardcore", "Hardcore", "Hardcore", "Hardcore", "Hardcore", "Hardcore"],
  ["Super Hardcore", "Super Hardcore", "Super Hardcore", "Super Hardcore", "Super Hardcore", "Super Hardcore"],
  ["Gem Rush", "Gem Rush", "Serbuan Permata", "Serbuan Permata", "ကျောက်မျက်ပွဲ", "Gem Rush"],
  ["Custom battle", "Pasadyang laban", "Pertempuran tersuai", "Pertempuran kustom", "စိတ်ကြိုက်တိုက်ပွဲ", "ການຕໍ່ສູ້ກຳນົດເອງ"],
  ["DEPLOY", "I-DEPLOY", "SEBARKAN", "SEBARKAN", "ချထားရန်", "ວາງກຳລັງ"],
  ["CUSTOM", "PASADYA", "TERSUAI", "KUSTOM", "စိတ်ကြိုက်", "ກຳນົດເອງ"],
  ["ZOOM", "ZUM", "ZUM", "ZUM", "ဇူး", "ຊູມ"],
  ["ABANDON RUN", "IWAN ANG TAKBO", "TINGGALKAN LARIAN", "TINGGALKAN PUTARAN", "ပွဲကို စွန့်ပစ်", "ປະຖິ້ມການແລ່ນ"],
  ["Abandon", "Iwan", "Tinggalkan", "Tinggalkan", "စွန့်ပစ်ရန်", "ປະຖິ້ມ"],
  // battle HUD words
  ["ROUND", "IKOT", "PUSINGAN", "PUTARAN", "အချီ", "ຮອບ"],
  ["WAVE", "ALON", "GELOMBANG", "GELOMBANG", "လှိုင်း", "ຄື້ນ"],
  ["LIVES", "BUHAY", "NYAWA", "NYAWA", "အသက်", "ຊີວິດ"],
  ["GOLD", "GINTO", "EMAS", "EMAS", "ရွှေ", "ຄຳ"],
  ["GEMS", "HIYAS", "PERMATA", "PERMATA", "ကျောက်မျက်", "ອັນມະນີ"],
  ["Enemies", "Mga Kalaban", "Musuh", "Musuh", "ရန်သူများ", "ສັດຕູ"],
  ["Rewards", "Gantimpala", "Ganjaran", "Hadiah", "ဆုလာဘ်များ", "ລາງວັນ"],
  ["Settings", "Mga Setting", "Tetapan", "Pengaturan", "ဆက်တင်များ", "ການຕັ້ງຄ່າ"],
  // settings: audio & display
  ["Master Volume", "Pangunahing Volume", "Kelantangan Utama", "Kelantangan Utama", "ပင်မ အသံအတိုးအကျယ်", "ລະດັບສຽງຫຼັກ"],
  ["Volume Booster", "Volume Booster", "Penguat Kelantangan", "Penguat Volume", "အသံ အားဖြည့်", "ເພີ່ມສຽງ"],
  ["Battle SFX", "Sound effect sa laban", "SFX Pertempuran", "SFX Pertempuran", "တိုက်ပွဲ SFX", "SFX ການຕໍ່ສູ້"],
  ["Bloom", "Bloom", "Bloom", "Bloom", "Bloom", "Bloom"],
  ["Dynamic Shadows", "Dinamikong Anino", "Bayang Dinamik", "Bayangan Dinamis", "ပြောင်းလဲနိုင်သော အရိပ်", "ເງົາແບບໄດນາມິກ"],
  ["Screen Shake", "Pagyanig ng Screen", "Goncangan Skrin", "Getaran Layar", "မျက်နှာပြင် လှုပ်ခါမှု", "ການສັ່ນໜ້າຈໍ"],
  ["Damage Numbers", "Numero ng Pinsala", "Nombor Kerosakan", "Angka Kerusakan", "ဒဏ်ရာ နံပါတ်များ", "ຕົວເລກ damage"],
  ["Reduced Motion", "Bawasan ang Galaw", "Kurangkan Gerakan", "Kurangi Gerakan", "လှုပ်ရှားမှု လျှော့ချ", "ຫຼຸດການເຄື່ອນໄຫວ"],
  ["Power Saving Mode", "Mode Pagtitipid ng Kuryente", "Mod Penjimatan Kuasa", "Mode Hemat Daya", "ပါဝါ သက်သာမုဒ်", "ໂໝດປະຢັດພະລັງງານ"],
  ["Hide Wave Cleared", "Itago ang Wave Cleared", "Sembunyikan Gelombang Selesai", "Sembunyikan Gelombang Selesai", "wave ပြီးကြောင်း ဖုံးရန်", "ເຊື່ອງ Wave Cleared"],
  ["Liquid Glass UI", "Liquid Glass UI", "UI Kaca Cecair", "UI Kaca Cair", "Liquid Glass UI", "Liquid Glass UI"],
  ["Camera Motion Blur", "Motion Blur ng Kamera", "Motion Blur Kamera", "Motion Blur Kamera", "ကင်မရာ motion blur", "Motion Blur ກ້ອງ"],
  ["Camera shake", "Pagyanig ng kamera", "Goncangan kamera", "Getaran kamera", "ကင်မရာ လှုပ်ခါမှု", "ການສັ່ນກ້ອງ"],
  ["Pixel Ratio", "Pixel Ratio", "Nisbah Piksel", "Rasio Piksel", "ပစ်ဆယ်အချိုး", "ອັດຕາ Pixel"],
  ["Upscale", "I-upscale", "Naik Skala", "Upscale", "အရွယ်ချဲ့", "ຂະຫຍາຍ"],
  ["Native", "Native", "Asli", "Asli", "မူရင်း", "ເນຍຕິບ"],
  ["Smooth", "Makinis", "Lancar", "Halus", "ချောမွေ့", "ລຽບ"],
  ["Sharp", "Matalas", "Tajam", "Tajam", "ထင်ရှား", "ແຫຼມ"],
  ["Interpolation Method", "Paraan ng Interpolation", "Kaedah Interpolasi", "Metode Interpolasi", "interpolation နည်းလမ်း", "ວິທີ interpolation"],
  ["Linear", "Linear", "Linear", "Linear", "လိုင်းနီယာ", "ເສັ້ນຊື່"],
  ["Hermite", "Hermite", "Hermite", "Hermite", "Hermite", "Hermite"],
  ["Max Frame Rate", "Pinakamataas na Frame Rate", "Kadar Bingkai Maksimum", "Frame Rate Maksimum", "အမြင့်ဆုံး frame နှုန်း", "ອັດຕາເຟຣມສູງສຸດ"],
  ["Effect Quality", "Kalidad ng Epekto", "Kualiti Kesan", "Kualitas Efek", "effect အရည်အသွေး", "ຄຸນນະພາບເອັບເຟັກ"],
  ["Fullscreen", "Buong Screen", "Skrin Penuh", "Layar Penuh", "မျက်နှာပြင်အပြည့်", "ເຕັມຈໍ"],
  ["Language select", "Pumili ng wika", "Pilih bahasa", "Pilih bahasa", "ဘာသာစကား ရွေးချယ်ရန်", "ເລືອກພາສາ"],
  // Round 4 features
  ["EXPERIMENTAL", "EKSPERIMENTAL", "EKSPERIMEN", "EKSPERIMEN", "စမ်းသပ်ချက်", "ທົດລອງ"],
  ["Frame-time readout", "Ipakita ang oras ng frame", "Papar masa bingkai", "Tampilkan waktu frame", "frame အချိန် ပြသမှု", "ສະແດງເວລາເຟຣມ"],
  ["Advanced Frame Interpolation", "Advanced Frame Interpolation", "Interpolasi Bingkai Lanjutan", "Interpolasi Frame Lanjutan", "အဆင့်မြင့် frame interpolation", "Frame Interpolation ຂັ້ນສູງ"],
  ["Motion Blur Strength", "Lakas ng Motion Blur", "Kekuatan Motion Blur", "Kekuatan Motion Blur", "motion blur အား", "ຄວາມແຮງ Motion Blur"],
  ["100% is the tuned default. Above 100% the smear gets heavy and can hide enemies.", "100% ang nakatakdang default. Kapag higit sa 100%, nagiging mabigat ang smear at maaari nitong itago ang mga kalaban.", "100% ialah lalai yang ditala. Melebihi 100%, kesan kabur menjadi berat dan boleh menyembunyikan musuh.", "100% adalah default yang sudah disetel. Di atas 100%, efek buram menjadi berat dan dapat menyembunyikan musuh.", "100% သည် ညှိထားသော မူလတန်ဖိုး ဖြစ်သည်။ 100% ကျော်လျှင် ပျိုးစင် ဖျော့ဖျော့ လေးလံပြီး ရန်သူကို ဖုံးကွယ်နိုင်သည်။", "100% ແມ່ນຄ່າເລີ່ມຕົ້ນທີ່ປັບແລ້ວ. ເກີນ 100% ການເບລອຈະໜັກ ແລະອາດບັງສັດຕູ."],
  ["Super Performance Booster", "Super Performance Booster", "Penguat Prestasi Super", "Penguat Performa Super", "စူပါ စွမ်းဆောင်ရည် မြှင့်တင်ကိရိယာ", "ຕົວເລັ່ງປະສິດທິພາບ Super"],
  ["Cuts the heaviest effects, skips motion blur and bloom, and caps the arena at 60 FPS", "Binabawasan ang pinakamabibigat na epekto, nilalaktawan ang motion blur at bloom, at nililimitahan sa 60 FPS ang arena", "Kurangkan kesan paling berat, langkau motion blur dan bloom, dan hadkan arena kepada 60 FPS", "Kurangi efek paling berat, lewati motion blur dan bloom, dan batasi arena hingga 60 FPS", "အလေးပေးဆုံး effect များကို လျှော့ချပြီး motion blur နှင့် bloom ကို ကျော်ကာ arena ကို 60 FPS ဖြင့် ကန့်သတ်သည်", "ຫຼຸດ effect ທີ່ໜັກທີ່ສຸດ, ຂ້າມ motion blur ແລະ bloom ແລະຈຳກັດ arena ທີ່ 60 FPS"],
  ["Edison bulb", "Bombilyang Edison", "Mentol Edison", "Lampu Edison", "Edison မီးလုံး", "ຫຼອດໄຟ Edison"],
  ["Carbon filament warms in steps", "Ang carbon filament ay uminit nang unti-unti", "Filamen karbon memanas secara bertahap", "Filamen karbon menghangat bertahap", "ကာဗွန် ဖိလမင့် တဖြည်းဖြည်း ပူလာသည်", "ເສັ້ນໄສ້ carbon ຮ້ອນຂຶ້ນເທື່ອລະຂັ້ນ"],
  ["Interface language", "Wika ng interface", "Bahasa antara muka", "Bahasa antarmuka", "interface ဘာသာစကား", "ພາສາ interface"],
];

const NEW_INDEX: Partial<Record<NewLanguage, number>> = { fil: 1, ms: 2, id: 3, my: 4, lo: 5 };
const NEW_TABLE: Partial<Record<NewLanguage, Map<string, string>>> = {};
for (const row of NEW_ROWS) {
  for (const lang of NEW_LANGUAGES) {
    const idx = NEW_INDEX[lang];
    if (idx === undefined) continue;
    const value = row[idx];
    if (!value || value === row[0]) continue;
    let map = NEW_TABLE[lang];
    if (!map) NEW_TABLE[lang] = map = new Map();
    if (!map.has(row[0])) map.set(row[0], value);
  }
}

/** Look up one English interface string in the newer-language table. */
export function lookupNewRow(text: string, lang: NewLanguage): string | undefined {
  if ((MORE_LANGUAGES as string[]).includes(lang)) return lookupMoreRow(text, lang as MoreLanguage);
  return NEW_TABLE[lang]?.get(text);
}
