/**
 * Interface strings for ten more languages: Arabic, Turkish, Polish, Hindi,
 * Dutch, Bangla, Punjabi, Vietnamese, Khmer and Isan (north-east Thai, written
 * in Thai script). Each row is [English, ar, tr, pl, hi, nl, bn, pa, vi, km,
 * isan], keyed by the English text the DOM translator sees. Anything not listed
 * falls back to English.
 */
export type MoreLanguage = "ar" | "tr" | "pl" | "hi" | "nl" | "bn" | "pa" | "vi" | "km" | "isan";
export const MORE_LANGUAGES: MoreLanguage[] = ["ar", "tr", "pl", "hi", "nl", "bn", "pa", "vi", "km", "isan"];

/** Arabic is written right to left */
export const RTL_LANGUAGES: string[] = ["ar"];

const MORE_INDEX: Record<MoreLanguage, number> = { ar: 1, tr: 2, pl: 3, hi: 4, nl: 5, bn: 6, pa: 7, vi: 8, km: 9, isan: 10 };

const MORE_ROWS: string[][] = [

  ["Home", "الرئيسية", "Ana Sayfa", "Start", "होम", "Home", "হোম", "ਹੋਮ", "Trang chủ", "ទំព័រដើម", "เฮือนหลัก"],
  ["Shop", "المتجر", "Mağaza", "Sklep", "दुकान", "Winkel", "দোকান", "ਦੁਕਾਨ", "Cửa hàng", "ហាង", "ร้านค้า"],
  ["Towers", "الأبراج", "Kuleler", "Wieże", "टावर", "Torens", "টাওয়ার", "ਟਾਵਰ", "Tháp", "ប៉ម", "หอคอย"],
  ["Specials", "الأحداث الخاصة", "Özel", "Specjalne", "विशेष", "Speciaal", "বিশেষ", "ਖ਼ਾਸ", "Đặc biệt", "ពិសេស", "พิเศษ"],
  ["Mail", "البريد", "Posta", "Poczta", "मेल", "Post", "মেইল", "ਮੇਲ", "Thư", "សារ", "หนังสือ"],
  ["Season", "الموسم", "Sezon", "Sezon", "सीज़न", "Seizoen", "মৌসুম", "ਸੀਜ਼ਨ", "Mùa", "រដូវកាល", "ฤดูกาล"],
  ["Command Center", "مركز القيادة", "Komuta Merkezi", "Centrum dowodzenia", "कमांड सेंटर", "Commandocentrum", "কমান্ড সেন্টার", "ਕਮਾਂਡ ਸੈਂਟਰ", "Trung tâm chỉ huy", "មជ្ឈមណ្ឌលបញ្ជា", "ศูนย์บัญชาการ"],
  ["Settings", "الإعدادات", "Ayarlar", "Ustawienia", "सेटिंग्स", "Instellingen", "সেটিংস", "ਸੈਟਿੰਗਾਂ", "Cài đặt", "ការកំណត់", "ตั้งค่า"],
  ["Language", "اللغة", "Dil", "Język", "भाषा", "Taal", "ভাষা", "ਭਾਸ਼ਾ", "Ngôn ngữ", "ភាសា", "ภาษา"],
  ["Choose the interface language", "اختر لغة الواجهة", "Arayüz dilini seçin", "Wybierz język interfejsu", "इंटरफ़ेस की भाषा चुनें", "Kies de interfacetaal", "ইন্টারফেসের ভাষা বেছে নিন", "ਇੰਟਰਫੇਸ ਦੀ ਭਾਸ਼ਾ ਚੁਣੋ", "Chọn ngôn ngữ giao diện", "ជ្រើសរើសភាសាចំណុចប្រទាក់", "เลือกภาษาหน้าจอ"],
  ["Interface Theme", "سمة الواجهة", "Arayüz Teması", "Motyw interfejsu", "इंटरफ़ेस थीम", "Interfacethema", "ইন্টারফেস থিম", "ਇੰਟਰਫੇਸ ਥੀਮ", "Chủ đề giao diện", "ទីមចំណុចប្រទាក់", "ธีมหน้าจอ"],
  ["Install App", "تثبيت التطبيق", "Uygulamayı Yükle", "Zainstaluj aplikację", "ऐप इंस्टॉल करें", "App installeren", "অ্যাপ ইনস্টল করুন", "ਐਪ ਇੰਸਟਾਲ ਕਰੋ", "Cài đặt ứng dụng", "ដំឡើងកម្មវិធី", "ติดตั้งแอ็ป"],
  ["Installed", "مثبت", "Yüklendi", "Zainstalowano", "इंस्टॉल हो गया", "Geïnstalleerd", "ইনস্টল হয়েছে", "ਇੰਸਟਾਲ ਹੋ ਗਈ", "Đã cài đặt", "បានដំឡើង", "ติดตั้งแล้ว"],
  ["Install", "تثبيت", "Yükle", "Zainstaluj", "इंस्टॉल करें", "Installeren", "ইনস্টল", "ਇੰਸਟਾਲ ਕਰੋ", "Cài đặt", "ដំឡើង", "ติดตั้ง"],
  ["Back", "رجوع", "Geri", "Wstecz", "वापस", "Terug", "ফিরে যান", "ਵਾਪਸ", "Quay lại", "ត្រឡប់", "กลับ"],
  ["Close", "إغلاق", "Kapat", "Zamknij", "बंद करें", "Sluiten", "বন্ধ করুন", "ਬੰਦ ਕਰੋ", "Đóng", "បិទ", "ปิด"],
  ["Cancel", "إلغاء", "İptal", "Anuluj", "रद्द करें", "Annuleren", "বাতিল", "ਰੱਦ ਕਰੋ", "Hủy", "បោះបង់", "ยกเลิก"],
  ["Save", "حفظ", "Kaydet", "Zapisz", "सहेजें", "Opslaan", "সংরক্ষণ", "ਸੇਵ ਕਰੋ", "Lưu", "រក្សាទុក", "เซฟ"],
  ["Confirm", "تأكيد", "Onayla", "Potwierdź", "पुष्टि करें", "Bevestigen", "নিশ্চিত করুন", "ਪੱਕਾ ਕਰੋ", "Xác nhận", "បញ្ជាក់", "ยืนยัน"],
  ["Continue", "متابعة", "Devam", "Dalej", "जारी रखें", "Doorgaan", "চালিয়ে যান", "ਜਾਰੀ ਰੱਖੋ", "Tiếp tục", "បន្ត", "ไปต่อ"],
  ["Remove", "إزالة", "Kaldır", "Usuń", "हटाएँ", "Verwijderen", "সরান", "ਹਟਾਓ", "Gỡ bỏ", "លុប", "เอาออก"],
  ["Send", "إرسال", "Gönder", "Wyślij", "भेजें", "Verzenden", "পাঠান", "ਭੇਜੋ", "Gửi", "ផ្ញើ", "ส่ง"],
  ["Pause", "إيقاف مؤقت", "Duraklat", "Pauza", "रोकें", "Pauze", "বিরতি", "ਰੋਕੋ", "Tạm dừng", "ផ្អាក", "พัก"],
  ["Resume", "استئناف", "Devam Et", "Wznów", "फिर शुरू करें", "Hervatten", "চালু রাখুন", "ਜਾਰੀ ਰੱਖੋ", "Tiếp tục", "បន្ត", "ไปต่อ"],
  ["PAUSED", "متوقف مؤقتًا", "DURAKLATILDI", "PAUZA", "रुका हुआ", "GEPAUZEERD", "বিরতি", "ਰੁਕਿਆ ਹੋਇਆ", "ĐÃ TẠM DỪNG", "បានផ្អាក", "พักอยู่"],
  ["Play", "تشغيل", "Oynat", "Graj", "चलाएँ", "Spelen", "চালান", "ਚਲਾਓ", "Chơi", "លេង", "เล่น"],
  ["Upgrade", "ترقية", "Yükselt", "Ulepsz", "अपग्रेड", "Upgraden", "আপগ্রেড", "ਅੱਪਗ੍ਰੇਡ", "Nâng cấp", "ដំឡើងកម្រិត", "อัพ"],
  ["Collect", "جمع", "Topla", "Odbierz", "लें", "Innen", "সংগ্রহ", "ਇਕੱਠਾ ਕਰੋ", "Nhận", "ទទួល", "เก็บ"],
  ["Victory", "النصر", "Zafer", "Zwycięstwo", "जीत", "Overwinning", "জয়", "ਜਿੱਤ", "Chiến thắng", "ជ័យជម្នះ", "ชนะแล้ว"],
  ["Defeat", "الهزيمة", "Yenilgi", "Porażka", "हार", "Nederlaag", "পরাজয়", "ਹਾਰ", "Thất bại", "ចាញ់", "แพ้แล้ว"],
  ["Enter battle", "ادخل المعركة", "Savaşa gir", "Wejdź do bitwy", "युद्ध में प्रवेश करें", "Naar gevecht", "যুদ্ধে যান", "ਲੜਾਈ ਵਿੱਚ ਜਾਓ", "Vào trận", "ចូលសមរភូមិ", "เข้าสู้"],
  ["Battle", "معركة", "Savaş", "Bitwa", "युद्ध", "Gevecht", "যুদ্ধ", "ਲੜਾਈ", "Trận đấu", "សមរភូមិ", "สู้"],
  ["Endless", "لا نهاية", "Sonsuz", "Bez końca", "अंतहीन", "Eindeloos", "অন্তহীন", "ਅੰਤਹੀਣ", "Vô tận", "គ្មានទីបញ្ចប់", "บ่มีที่สิ้นสุด"],
  ["Gauntlet", "التحدي", "Meydan Okuma", "Wyzwanie", "चुनौती", "Uitdaging", "চ্যালেঞ্জ", "ਚੁਣੌਤੀ", "Thử thách", "ការប្រកួតប្រជែង", "ท้าทาย"],
  ["Sandbox", "ساحة التجربة", "Deneme Alanı", "Piaskownica", "सैंडबॉक्स", "Zandbak", "স্যান্ডবক্স", "ਸੈਂਡਬਾਕਸ", "Hộp cát", "ប្រអប់ខ្សាច់", "ลานทดลอง"],
  ["Hardcore", "الصعب", "Zorlu", "Hardcore", "हार्डकोर", "Hardcore", "হার্ডকোর", "ਹਾਰਡਕੋਰ", "Khó", "ហាតខរ", "ฮาร์ดคอร์"],
  ["Super Hardcore", "الصعب جدًا", "Süper Zorlu", "Super Hardcore", "सुपर हार्डकोर", "Super Hardcore", "সুপার হার্ডকোর", "ਸੁਪਰ ਹਾਰਡਕੋਰ", "Siêu khó", "ស៊ុបពើហាតខរ", "ซูเปอร์ฮาร์ดคอร์"],
  ["Gem Rush", "اندفاع الجواهر", "Mücevher Koşusu", "Szał klejnotów", "रत्न दौड़", "Edelsteenrush", "রত্ন রাশ", "ਰਤਨ ਦੌੜ", "Săn ngọc", "ប្រណាំងត្បូង", "แข่งเพชร"],
  ["Custom battle", "معركة مخصصة", "Özel savaş", "Bitwa własna", "कस्टम युद्ध", "Eigen gevecht", "কাস্টম যুদ্ধ", "ਕਸਟਮ ਲੜਾਈ", "Trận tùy chỉnh", "សមរភូមិផ្ទាល់ខ្លួន", "สู้เอง"],
  ["DEPLOY", "نشر", "YERLEŞTİR", "ROZMIEŚĆ", "तैनात करें", "PLAATSEN", "বসান", "ਤਾਇਨਾਤ ਕਰੋ", "TRIỂN KHAI", "ដាក់", "วางกอง"],
  ["CUSTOM", "مخصص", "ÖZEL", "WŁASNE", "कस्टम", "EIGEN", "কাস্টম", "ਕਸਟਮ", "TÙY CHỈNH", "ផ្ទាល់ខ្លួន", "เอง"],
  ["ZOOM", "تكبير", "YAKINLAŞTIR", "ZOOM", "ज़ूम", "ZOOM", "জুম", "ਜ਼ੂਮ", "THU PHÓNG", "ពង្រីក", "ซูม"],
  ["ABANDON RUN", "إنهاء المحاولة", "TURU BIRAK", "PORZUĆ PRZEBIEG", "रन छोड़ें", "RUN OPGEVEN", "রান ছেড়ে দিন", "ਰਨ ਛੱਡੋ", "BỎ CUỘC", "បោះបង់ការលេង", "ยอมแพ้รอบนี้"],
  ["Abandon", "إنهاء", "Bırak", "Porzuć", "छोड़ें", "Opgeven", "ছেড়ে দিন", "ਛੱਡੋ", "Bỏ cuộc", "បោះបង់", "ยอมแพ้"],
  ["ROUND", "الجولة", "TUR", "RUNDA", "राउंड", "RONDE", "রাউন্ড", "ਰਾਊਂਡ", "VÒNG", "ជុំ", "รอบ"],
  ["WAVE", "الموجة", "DALGA", "FALA", "वेव", "GOLFT", "ওয়েভ", "ਵੇਵ", "ĐỢT", "រលក", "คลื่น"],
  ["LIVES", "الأرواح", "CAN", "ŻYCIA", "जीवन", "LEVENS", "জীবন", "ਜਾਨਾਂ", "MẠNG", "ជីវិត", "ชีวิต"],
  ["GOLD", "ذهب", "ALTIN", "ZŁOTO", "सोना", "GOUD", "সোনা", "ਸੋਨਾ", "VÀNG", "មាស", "ทอง"],
  ["GEMS", "جواهر", "MÜCEVHER", "KLEJNOTY", "रत्न", "EDELSTENEN", "রত্ন", "ਰਤਨ", "NGỌC", "ត្បូង", "เพชร"],
  ["Enemies", "الأعداء", "Düşmanlar", "Wrogowie", "दुश्मन", "Vijanden", "শত্রু", "ਦੁਸ਼ਮਣ", "Kẻ địch", "សត្រូវ", "ศัตรู"],
  ["Rewards", "المكافآت", "Ödüller", "Nagrody", "इनाम", "Beloningen", "পুরস্কার", "ਇਨਾਮ", "Phần thưởng", "រង្វាន់", "ของรางวัล"],
  ["Master Volume", "مستوى الصوت الرئيسي", "Ana Ses", "Główna głośność", "मुख्य वॉल्यूम", "Hoofdvolume", "মূল ভলিউম", "ਮੁੱਖ ਆਵਾਜ਼", "Âm lượng chính", "កម្រិតសំឡេងមេ", "เสียงรวม"],
  ["Volume Booster", "معزز الصوت", "Ses Güçlendirici", "Wzmacniacz głośności", "वॉल्यूम बूस्टर", "Volumeversterker", "ভলিউম বুস্টার", "ਵਾਲੀਅਮ ਬੂਸਟਰ", "Tăng âm lượng", "ឧបករណ៍បង្កើនសំឡេង", "เพิ่มเสียง"],
  ["Battle SFX", "مؤثرات المعركة", "Savaş Efektleri", "Efekty bitwy", "युद्ध ध्वनि प्रभाव", "Gevechtsgeluiden", "যুদ্ধের শব্দ", "ਲੜਾਈ ਦੇ ਪ੍ਰਭਾਵ", "Hiệu ứng trận đấu", "បក្ខភាពសមរភូមិ", "เสียงเอฟเฟกต์การสู้"],
  ["Bloom", "وهج", "Parlama", "Poświata", "ब्लूम", "Gloed", "ব্লুম", "ਬਲੂਮ", "Phát sáng", "ពន្លឺរស្មី", "แสงฟุ้ง"],
  ["Dynamic Shadows", "ظلال ديناميكية", "Dinamik Gölgeler", "Dynamiczne cienie", "डायनामिक छायाएँ", "Dynamische schaduwen", "গতিশীল ছায়া", "ਡਾਇਨਾਮਿਕ ਪਰਛਾਵੇਂ", "Bóng động", "ស្រមោលថាមវន្ត", "เงาไดนามิก"],
  ["Screen Shake", "اهتزاز الشاشة", "Ekran Sarsıntısı", "Wstrząsy ekranu", "स्क्रीन कंपन", "Schermtrilling", "স্ক্রিন কাঁপুনি", "ਸਕ੍ਰੀਨ ਹਿੱਲਣਾ", "Rung màn hình", "ញ័រអេក្រង់", "จอสั่น"],
  ["Damage Numbers", "أرقام الضرر", "Hasar Sayıları", "Liczby obrażeń", "हानि संख्या", "Schadecijfers", "ক্ষতির সংখ্যা", "ਨੁਕਸਾਨ ਦੇ ਅੰਕ", "Số sát thương", "លេខខូចខាត", "ตัวเลขดาเมจ"],
  ["Reduced Motion", "تقليل الحركة", "Azaltılmış Hareket", "Ograniczony ruch", "कम गति", "Minder beweging", "কম নড়াচড়া", "ਘੱਟ ਹਰਕਤ", "Giảm chuyển động", "កាត់បន្ថយចលនា", "ลดการขยับ"],
  ["Power Saving Mode", "وضع توفير الطاقة", "Güç Tasarrufu Modu", "Tryb oszczędzania energii", "पावर सेविंग मोड", "Energiebesparende modus", "পাওয়ার সেভিং মোড", "ਪਾਵਰ ਬਚਤ ਮੋਡ", "Chế độ tiết kiệm pin", "របៀបសន្សំថាមពល", "โหมดประหยัดพลัง"],
  ["Hide Wave Cleared", "إخفاء رسالة إنهاء الموجة", "Dalga Temizlendi Yazısını Gizle", "Ukryj info o wyczyszczeniu fali", "वेव साफ़ संदेश छिपाएँ", "Golf-gewist-melding verbergen", "ওয়েভ শেষের বার্তা লুকান", "ਵੇਵ ਸਾਫ਼ ਸੁਨੇਹਾ ਲੁਕਾਓ", "Ẩn thông báo hết đợt", "លាក់សារបញ្ចប់រលក", "ซ่อนข้อความจบคลื่น"],
  ["Liquid Glass UI", "واجهة الزجاج السائل", "Sıvı Cam Arayüz", "Interfejs szklany", "लिक्विड ग्लास UI", "Vloeibaar glas-UI", "লিকুইড গ্লাস UI", "ਲਿਕਵਿਡ ਗਲਾਸ UI", "Giao diện kính lỏng", "UI កញ្ចក់រលាយ", "หน้าจอกระจกเหลว"],
  ["Camera Motion Blur", "ضبابية حركة الكاميرا", "Kamera Hareket Bulanıklığı", "Rozmycie ruchu kamery", "कैमरा मोशन ब्लर", "Cameravervaging", "ক্যামেরা মোশন ব্লার", "ਕੈਮਰਾ ਮੋਸ਼ਨ ਬਲਰ", "Mờ chuyển động camera", "ព្រិលចលនាកាមេរ៉ា", "ภาพเบลอตอนกล้องขยับ"],
  ["Camera shake", "اهتزاز الكاميرا", "Kamera sarsıntısı", "Drganie kamery", "कैमरा कंपन", "Cameratrilling", "ক্যামেরা কাঁপুনি", "ਕੈਮਰਾ ਹਿੱਲਣਾ", "Rung camera", "ញ័រកាមេរ៉ា", "กล้องสั่น"],
  ["Pixel Ratio", "نسبة البكسل", "Piksel Oranı", "Proporcja pikseli", "पिक्सल अनुपात", "Pixelverhouding", "পিক্সেল অনুপাত", "ਪਿਕਸਲ ਅਨੁਪਾਤ", "Tỉ lệ điểm ảnh", "សមាមាត្រភីកសែល", "อัตราส่วนพิกเซล"],
  ["Upscale", "تكبير الصورة", "Büyütme", "Skalowanie", "अपस्केल", "Opschalen", "আপস্কেল", "ਅੱਪਸਕੇਲ", "Phóng to", "ពង្រីក", "ขยายภาพ"],
  ["Native", "أصلي", "Yerel", "Natywne", "मूल", "Native", "স্বাভাবিক", "ਮੂਲ", "Gốc", "ដើម", "ตามต้นฉบับ"],
  ["Smooth", "ناعم", "Yumuşak", "Gładkie", "चिकना", "Zacht", "মসৃণ", "ਸਮੂਥ", "Mượt", "រលូន", "นุ่ม"],
  ["Sharp", "حاد", "Keskin", "Ostre", "तीखा", "Scherp", "তীক্ষ্ণ", "ਤਿੱਖਾ", "Sắc nét", "ច្បាស់", "คม"],
  ["Interpolation Method", "طريقة الاستيفاء", "Enterpolasyon Yöntemi", "Metoda interpolacji", "इंटरपोलेशन विधि", "Interpolatiemethode", "ইন্টারপোলেশন পদ্ধতি", "ਇੰਟਰਪੋਲੇਸ਼ਨ ਢੰਗ", "Phương pháp nội suy", "វិធីអ៊ីនធើប៉ូឡាស្យុង", "วิธีปรับภาพ"],
  ["Linear", "خطي", "Doğrusal", "Liniowa", "लीनियर", "Lineair", "লিনিয়ার", "ਲੀਨੀਅਰ", "Tuyến tính", "លីនេអ៊ែរ", "เส้นตรง"],
  ["Hermite", "هيرميت", "Hermite", "Hermite", "हर्माइट", "Hermite", "হার্মাইট", "ਹਰਮਾਈਟ", "Hermite", "ហឺមីត", "เฮอร์ไมต์"],
  ["Max Frame Rate", "أقصى معدل إطارات", "En Yüksek Kare Hızı", "Maks. liczba klatek", "अधिकतम फ़्रेम दर", "Max. beeldsnelheid", "সর্বোচ্চ ফ্রেম রেট", "ਵੱਧ ਤੋਂ ਵੱਧ ਫ੍ਰੇਮ ਰੇਟ", "Tốc độ khung hình tối đa", "អត្រាហ្វ្រេមអតិបរមា", "เฟรมสูงสุด"],
  ["Effect Quality", "جودة التأثيرات", "Efekt Kalitesi", "Jakość efektów", "प्रभाव गुणवत्ता", "Effectkwaliteit", "ইফেক্টের মান", "ਇਫੈਕਟ ਕੁਆਲਟੀ", "Chất lượng hiệu ứng", "គុណភាពឥទ្ធិពល", "คุณภาพเอฟเฟกต์"],
  ["Fullscreen", "ملء الشاشة", "Tam Ekran", "Pełny ekran", "फ़ुलस्क्रीन", "Volledig scherm", "ফুলস্ক্রিন", "ਫੁੱਲ ਸਕਰੀਨ", "Toàn màn hình", "ពេញអេក្រង់", "เต็มจอ"],
  ["Language select", "اختيار اللغة", "Dil seçimi", "Wybór języka", "भाषा चुनें", "Taalkeuze", "ভাষা নির্বাচন", "ਭਾਸ਼ਾ ਚੋਣ", "Chọn ngôn ngữ", "ជ្រើសភាសា", "เลือกภาษา"],
  ["EXPERIMENTAL", "تجريبي", "DENEYSEL", "EKSPERYMENTALNE", "प्रायोगिक", "EXPERIMENTEEL", "পরীক্ষামূলক", "ਪ੍ਰਯੋਗਾਤਮਕ", "THỬ NGHIỆM", "ពិសោធន៍", "ทดลอง"],
  ["Frame-time readout", "عرض زمن الإطار", "Kare süresi göstergesi", "Odczyt czasu klatki", "फ़्रेम समय दिखाएँ", "Frametijd tonen", "ফ্রেম সময় দেখান", "ਫ੍ਰੇਮ ਸਮਾਂ ਦਿਖਾਓ", "Hiện thời gian khung hình", "ហ្វ្រេមពេលវេលា", "โชว์เวลาเฟรม"],
  ["Advanced Frame Interpolation", "استيفاء الإطارات المتقدم", "Kare Enterpolasyonu", "Zaawansowana interpolacja klatek", "उन्नत फ़्रेम इंटरपोलेशन", "Geavanceerde frame-interpolatie", "উন্নত ফ্রেম ইন্টারপোলেশন", "ਐਡਵਾਂਸਡ ਫ੍ਰੇਮ ਇੰਟਰਪੋਲੇਸ਼ਨ", "Nội suy khung hình nâng cao", "អ៊ីនធើប៉ូឡាស្យុងហ្វ្រេមកម្រិតខ្ពស់", "ปรับภาพขั้นสูง"],
  ["Motion Blur Strength", "قوة ضبابية الحركة", "Hareket Bulanıklığı Gücü", "Siła rozmycia ruchu", "मोशन ब्लर की तीव्रता", "Sterkte bewegingsvervaging", "মোশন ব্লারের তীব্রতা", "ਮੋਸ਼ਨ ਬਲਰ ਦੀ ਤਾਕਤ", "Cường độ mờ chuyển động", "កម្រិតព្រិលចលនា", "ความแรงภาพเบลอ"],
  ["100% is the tuned default. Above 100% the smear gets heavy and can hide enemies.", "100% هي القيمة الافتراضية المضبوطة. فوق 100% يصبح التمويه ثقيلًا وقد يخفي الأعداء.", "%100 ayarlanmış varsayılandır. %100'ün üzerinde iz çok ağırlaşır ve düşmanları gizleyebilir.", "100% to dostrojona wartość domyślna. Powyżej 100% rozmycie staje się ciężkie i może zasłaniać wrogów.", "100% ट्यून किया गया डिफ़ॉल्ट है। 100% से ऊपर धुंधलापन भारी हो जाता है और दुश्मनों को छिपा सकता है।", "100% is de afgestelde standaard. Boven 100% wordt het uitsmeren zwaar en kan het vijanden verbergen.", "১০০% হলো নির্ধারিত ডিফল্ট। ১০০%-এর উপরে ব্লার অতিরিক্ত ভারী হয় এবং শত্রু আড়াল করতে পারে।", "100% ਟਿਊਨ ਕੀਤੀ ਡਿਫਾਲਟ ਹੈ। 100% ਤੋਂ ਉੱਪਰ ਧੁੰਦਲਾਪਨ ਭਾਰੀ ਹੋ ਜਾਂਦਾ ਹੈ ਅਤੇ ਦੁਸ਼ਮਣ ਲੁਕਾ ਸਕਦਾ ਹੈ।", "100% là mức mặc định đã tinh chỉnh. Trên 100% vệt mờ quá nặng và có thể che kẻ địch.", "100% គឺជាលំនាំដើមដែលបានកែសម្រួល។ លើសពី 100% ការព្រិលនឹងធ្ងន់ពេក ហើយអាចបិទបាំងសត្រូវ។", "100% คือค่ามาตรฐาน. เกิน 100% ภาพจะเบลอหนัก อาจบังศัตรู."],
  ["Super Performance Booster", "معزز الأداء الفائق", "Süper Performans Artırıcı", "Super wzmacniacz wydajności", "सुपर परफ़ॉर्मेंस बूस्टर", "Super prestatieversneller", "সুপার পারফরম্যান্স বুস্টার", "ਸੁਪਰ ਪਰਫਾਰਮੈਂਸ ਬੂਸਟਰ", "Tăng hiệu năng tối đa", "ឧបករណ៍បង្កើនដំណើរការខ្ពស់", "เพิ่มประสิทธิภาพสุดๆ"],
  ["Cuts the heaviest effects, skips motion blur and bloom, and caps the arena at 60 FPS", "يقلل أثقل المؤثرات ويتخطى ضبابية الحركة والوهج ويحد المعركة عند 60 إطارًا في الثانية", "En ağır efektleri azaltır, hareket bulanıklığını ve parlamayı atlar, arenayı 60 FPS ile sınırlar", "Wyłącza najcięższe efekty, pomija rozmycie ruchu i poświatę oraz ogranicza arenę do 60 FPS", "सबसे भारी प्रभाव कम करता है, मोशन ब्लर और ब्लूम छोड़ता है, और अरेना को 60 FPS पर सीमित करता है", "Schakelt de zwaarste effecten uit, slaat bewegingsvervaging en gloed over en begrenst de arena tot 60 FPS", "সবচেয়ে ভারী ইফেক্ট কমায়, মোশন ব্লার ও ব্লুম বাদ দেয় এবং অ্যারেনাকে ৬০ FPS-এ সীমিত রাখে", "ਸਭ ਤੋਂ ਭਾਰੀ ਇਫੈਕਟ ਘਟਾਉਂਦਾ ਹੈ, ਮੋਸ਼ਨ ਬਲਰ ਅਤੇ ਬਲੂਮ ਛੱਡਦਾ ਹੈ, ਅਤੇ ਅਖਾੜੇ ਨੂੰ 60 FPS ਤੱਕ ਸੀਮਤ ਕਰਦਾ ਹੈ", "Giảm các hiệu ứng nặng nhất, bỏ mờ chuyển động và phát sáng, giới hạn đấu trường ở 60 FPS", "គួរកាត់បន្ថយឥទ្ធិពលធ្ងន់បំផុត រំលងព្រិលចលនា និងពន្លឺ ហើយកំណត់អារេណាទៅ 60 FPS", "ตัดเอฟเฟกต์หนักสุด ข้ามภาพเบลอกับแสงฟุ้ง จำกัดสนามที่ 60 FPS"],
  ["Edison bulb", "مصباح إديسون", "Edison ampulü", "Żarówka Edisona", "एडिसन बल्ब", "Edisonlamp", "এডিসন বাল্ব", "ਐਡੀਸਨ ਬਲਬ", "Bóng đèn Edison", "អំពូល Edison", "หลอดเอดิสัน"],
  ["Carbon filament warms in steps", "يسخن فتيل الكربون تدريجيًا", "Karbon filaman adım adım ısınır", "Włókno węglowe nagrzewa się stopniowo", "कार्बन फ़िलामेंट धीरे-धीरे गर्म होता है", "Koolstofdraad warmt in stappen op", "কার্বন ফিলামেন্ট ধাপে ধাপে গরম হয়", "ਕਾਰਬਨ ਫਿਲਾਮੈਂਟ ਹੌਲੀ-ਹੌਲੀ ਗਰਮ ਹੁੰਦਾ ਹੈ", "Sợi carbon nóng lên từng bước", "ខ្សែកាបូនឡើងកំដៅជាជំហានៗ", "ไส้คาร์บอนค่อยๆ ร้อนขึ้น"],
  ["Interface language", "لغة الواجهة", "Arayüz dili", "Język interfejsu", "इंटरफ़ेस भाषा", "Interfacetaal", "ইন্টারফেসের ভাষা", "ਇੰਟਰਫੇਸ ਭਾਸ਼ਾ", "Ngôn ngữ giao diện", "ភាសាចំណុចប្រទាក់", "ภาษาหน้าจอ"],
];

const MORE_TABLE = new Map<MoreLanguage, Map<string, string>>();
for (const lang of MORE_LANGUAGES) MORE_TABLE.set(lang, new Map());
for (const row of MORE_ROWS) {
  for (const lang of MORE_LANGUAGES) {
    const value = row[MORE_INDEX[lang]];
    if (value && value !== row[0]) MORE_TABLE.get(lang)!.set(row[0], value);
  }
}

/** Look up one English interface string in the ten-language table. */
export function lookupMoreRow(text: string, lang: MoreLanguage): string | undefined {
  return MORE_TABLE.get(lang)?.get(text);
}
