import * as React from "react";
import { t as translateExtra, type Language } from "./i18nExtras";

const TH: Record<string, string> = {
  Home: "หน้าหลัก", Shop: "ร้านค้า", Towers: "ป้อม", Specials: "กิจกรรม", Guild: "กิลด์", Mail: "จดหมาย", Season: "ซีซัน",
  "Command Center": "ศูนย์บัญชาการ", "Settings": "การตั้งค่า", "Install App": "ติดตั้งแอป", "Installed": "ติดตั้งแล้ว", "Install": "ติดตั้ง",
  "AUDIO": "เสียง", "OPTIONS": "ตัวเลือก", "APP": "แอป", "DISPLAY": "การแสดงผล", "FONT": "แบบอักษร", "Language": "ภาษา", "Choose the interface language": "เลือกภาษาของอินเทอร์เฟซ",
  "Interface Theme": "ธีมอินเทอร์เฟซ", "Choose the arena control-room palette": "เลือกชุดสีของสนาม", "Master Volume": "ระดับเสียงหลัก", "Volume Booster": "เพิ่มระดับเสียง",
  "Battle SFX": "เสียงเอฟเฟกต์การต่อสู้", "Rich FX": "เอฟเฟกต์พิเศษ", Bloom: "แสงเรือง", "Dynamic Shadows": "เงาไดนามิก", "Anti-aliasing": "ลดรอยหยัก", "Damage Numbers": "ตัวเลขความเสียหาย", "Screen Shake": "สั่นหน้าจอ", "Camera Motion Blur": "ภาพเบลอจากการเคลื่อนไหว", "Battlefield Guides": "เส้นช่วยบนสนาม", "Auto-Start Waves": "เริ่มเวฟอัตโนมัติ", "Reduced Motion": "ลดการเคลื่อนไหว", "Performance HUD": "แสดงประสิทธิภาพ", "Advanced Frame Interpolation": "ปรับภาพเคลื่อนไหวขั้นสูง", "Power Saving Mode": "โหมดประหยัดพลังงาน", "Liquid Glass UI": "อินเทอร์เฟซกระจกเหลว",
  "Pixel Ratio": "ความละเอียดพิกเซล", "Max Frame Rate": "อัตราเฟรมสูงสุด", "Effect Quality": "คุณภาพเอฟเฟกต์", "Interpolation Method": "วิธีแทรกเฟรม", "Fullscreen": "เต็มหน้าจอ", "Toggle mechanism": "รูปแบบสวิตช์", "Choose how the switch looks and warms up when turned on.": "เลือกรูปลักษณ์และกลไกการติดสว่างของสวิตช์",
  "Fluorescent tube": "หลอดฟลูออเรสเซนต์", "Flicker-start glow": "ติดด้วยการกะพริบ", "Incandescent bulb": "หลอดไส้", "Warm filament fade": "ไส้หลอดค่อย ๆ อุ่น", "LED bulb": "หลอด LED", "Instant diode": "ติดทันที", Halogen: "ฮาโลเจน", "Quartz flash-on": "แฟลชหลอดควอตซ์",
  "Today’s Event": "กิจกรรมวันนี้", "Today's Event": "กิจกรรมวันนี้", "Daily Reward": "รางวัลประจำวัน", "Claim Bonus": "รับโบนัส", "Already claimed": "รับไปแล้ว", "Lineup weak — visit Towers": "ทีมยังไม่พร้อม — ไปที่ป้อม",
  Battle: "ต่อสู้", Endless: "ไม่สิ้นสุด", Gauntlet: "บททดสอบ", "Gem Rush": "เร่งล่าอัญมณี", Hardcore: "ฮาร์ดคอร์", "Super Hardcore": "ฮาร์ดคอร์ขั้นสุด", "Solo defense · 12 rounds": "ป้องกันเดี่ยว · 12 รอบ", "12 rounds · 10× HP": "12 รอบ · พลังชีวิตศัตรู 10 เท่า", "12 rounds · 10× enemy HP": "12 รอบ · พลังชีวิตศัตรู 10 เท่า", "12 rounds · one life": "12 รอบ · ชีวิตเดียว", "Double spawns, 10× enemy HP, enemies immune to crits, 25% faster enemies — and 120× the rewards.": "ศัตรูเกิดเป็นคู่ พลังชีวิต 10 เท่า ไม่ติดคริติคอล เร็วขึ้น 25% และรางวัล 120 เท่า", "710× enemy HP, 75% faster enemies and 720× rewards. One leak ends the run.": "พลังชีวิตศัตรู 710 เท่า เร็วขึ้น 75% รางวัล 720 เท่า เสียชีวิตหนึ่งครั้งจบเกม", "Enemies move 25% faster. Survive for 120× rewards. Standard lives.": "ศัตรูเคลื่อนที่เร็วขึ้น 25% รับรางวัล 120 เท่า มีจำนวนชีวิตปกติ",
  "Enter battle": "เข้าสู่การต่อสู้", "Victory": "ชนะ", Defeat: "พ่ายแพ้", "COLLECT & RETURN": "รับรางวัลและกลับ", "Skip boss cutscene": "ข้ามฉากบอส", "SUMMON": "เรียกศัตรู", "SPEED": "ความเร็ว", "BOSS": "บอส", "ROUND": "รอบ", "WAVE": "เวฟ", "kills": "กำจัด", "lives": "ชีวิต", "Hardcore · 10× HP · 120× rewards · +25% speed": "ฮาร์ดคอร์ · พลังชีวิต 10 เท่า · รางวัล 120 เท่า · เร็วขึ้น 25%", "Super Hardcore · 710× HP · 720× rewards · +75% speed · 1 life": "ฮาร์ดคอร์ขั้นสุด · พลังชีวิต 710 เท่า · รางวัล 720 เท่า · เร็วขึ้น 75% · 1 ชีวิต",
  "Save": "บันทึก", "Cancel": "ยกเลิก", "Back": "กลับ", "Close": "ปิด", "Confirm": "ยืนยัน", "Collect": "รับรางวัล", "Upgrade": "อัปเกรด", "Play": "เล่น", Pause: "หยุดชั่วคราว", Resume: "เล่นต่อ",
};

function localizeNode(node: React.ReactNode, language: Language): React.ReactNode {
  if (language === "en") return node;
  if (typeof node === "string") return language === "th" ? (TH[node] ?? translateExtra(node, language)) : translateExtra(node, language);
  if (Array.isArray(node)) return node.map((child, i) => <React.Fragment key={i}>{localizeNode(child, language)}</React.Fragment>);
  if (!React.isValidElement(node)) return node;
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.props as Record<string, unknown>)) {
    if (key === "children") props.children = localizeNode(value as React.ReactNode, language);
    else if ((key === "aria-label" || key === "title" || key === "placeholder" || key === "sub" || key === "body" || key === "label" || key === "desc") && typeof value === "string") props[key] = language === "th" ? (TH[value] ?? translateExtra(value, language)) : translateExtra(value, language);
  }
  return React.cloneElement(node, props);
}

/** Translate exact, shared interface strings while leaving user/game-generated text intact. */
export function LocalizedTree({ language, children }: { language: Language; children: React.ReactNode }) {
  return <>{localizeNode(children, language)}</>;
}
