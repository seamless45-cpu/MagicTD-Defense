import { useLayoutEffect } from "react";
import { lookupInterface } from "./i18nTable";
import { t as translateExtra, type Language } from "./i18nExtras";

/**
 * Interface translation. Every visible string in the app goes through one
 * shared path: the DOM is walked (and kept in sync with a MutationObserver), so
 * text inside any component is translated without wrapping each screen. Canvas
 * labels and the toast log call `tr()` directly, which reads the same language.
 */

const TH: Record<string, string> = {
  Home: "หน้าหลัก", Shop: "ร้านค้า", Towers: "ป้อม", Specials: "กิจกรรม", Guild: "กิลด์", Mail: "จดหมาย", Season: "ซีซัน",
  "Command Center": "ศูนย์บัญชาการ", "Settings": "การตั้งค่า", "Install App": "ติดตั้งแอป", "Installed": "ติดตั้งแล้ว", "Install": "ติดตั้ง",
  "AUDIO": "เสียง", "OPTIONS": "ตัวเลือก", "APP": "แอป", "DISPLAY": "การแสดงผล", "FONT": "แบบอักษร", "Language": "ภาษา", "Choose the interface language": "เลือกภาษาของอินเทอร์เฟซ",
  "Interface Theme": "ธีมอินเทอร์เฟซ", "Choose the arena control-room palette": "เลือกชุดสีของสนาม", "Master Volume": "ระดับเสียงหลัก", "Volume Booster": "เพิ่มระดับเสียง",
  "Battle SFX": "เสียงเอฟเฟกต์การต่อสู้", "Rich FX": "เอฟเฟกต์พิเศษ", Bloom: "แสงเรือง", "Dynamic Shadows": "เงาไดนามิก", "Anti-aliasing": "ลดรอยหยัก", "Damage Numbers": "ตัวเลขความเสียหาย", "Screen Shake": "สั่นหน้าจอ", "Camera Motion Blur": "ภาพเบลอจากการเคลื่อนไหว", "Battlefield Guides": "เส้นช่วยบนสนาม", "Auto-Start Waves": "เริ่มเวฟอัตโนมัติ", "Reduced Motion": "ลดการเคลื่อนไหว", "Performance HUD": "แสดงประสิทธิภาพ", "Advanced Frame Interpolation": "ปรับภาพเคลื่อนไหวขั้นสูง", "Power Saving Mode": "โหมดประหยัดพลังงาน", "Liquid Glass UI": "อินเทอร์เฟซกระจกเหลว",
  "Pixel Ratio": "ความละเอียดพิกเซล", "Max Frame Rate": "อัตราเฟรมสูงสุด", "Effect Quality": "คุณภาพเอฟเฟกต์", "Interpolation Method": "วิธีแทรกเฟรม", "Fullscreen": "เต็มหน้าจอ", "Toggle mechanism": "รูปแบบสวิตช์", "Choose how the switch looks and warms up when turned on.": "เลือกรูปลักษณ์และกลไกการติดสว่างของสวิตช์",
  "Fluorescent tube": "หลอดฟลูออเรสเซนต์", "Flicker-start glow": "ติดด้วยการกะพริบ", "Incandescent bulb": "หลอดไส้", "Warm filament fade": "ไส้หลอดค่อย ๆ อุ่น", "LED bulb": "หลอด LED", "Instant diode": "ติดทันที", Halogen: "ฮาโลเจน", "Quartz flash-on": "แฟลชหลอดควอตซ์",
  "Today’s Event": "กิจกรรมวันนี้", "Today's Event": "กิจกรรมวันนี้", "Daily Reward": "รางวัลประจำวัน", "Claim Bonus": "รับโบนัส", "Already claimed": "รับไปแล้ว", "Lineup weak — visit Towers": "ทีมยังไม่พร้อม — ไปที่ป้อม",
  Battle: "ต่อสู้", Endless: "ไม่สิ้นสุด", Gauntlet: "บททดสอบ", "Gem Rush": "เร่งล่าอัญมณี", Hardcore: "ฮาร์ดคอร์", "Super Hardcore": "ฮาร์ดคอร์ขั้นสุด", "Solo defense · 12 rounds": "ป้องกันเดี่ยว · 12 รอบ", "12 rounds · 10× HP": "12 รอบ · พลังชีวิตศัตรู 10 เท่า", "12 rounds · 10× enemy HP": "12 รอบ · พลังชีวิตศัตรู 10 เท่า", "12 rounds · one life": "12 รอบ · ชีวิตเดียว", "710× enemy HP, 75% faster enemies and 10× rewards. One leak ends the run.": "พลังชีวิตศัตรู 710 เท่า เร็วขึ้น 75% รางวัล 10 เท่า เสียชีวิตหนึ่งครั้งจบเกม",
  "Enter battle": "เข้าสู่การต่อสู้", "Victory": "ชนะ", Defeat: "พ่ายแพ้", "COLLECT & RETURN": "รับรางวัลและกลับ", "Skip boss cutscene": "ข้ามฉากบอส", "SUMMON": "เรียกศัตรู", "SPEED": "ความเร็ว", "BOSS": "บอส", "ROUND": "รอบ", "WAVE": "เวฟ", "kills": "กำจัด", "lives": "ชีวิต", "Hardcore · 10× HP · 5× rewards · +25% speed": "ฮาร์ดคอร์ · พลังชีวิต 10 เท่า · รางวัล 5 เท่า · เร็วขึ้น 25%", "Super Hardcore · 710× HP · 10× rewards · +75% speed · 1 life": "ฮาร์ดคอร์ขั้นสุด · พลังชีวิต 710 เท่า · รางวัล 10 เท่า · เร็วขึ้น 75% · 1 ชีวิต",
  "Save": "บันทึก", "Cancel": "ยกเลิก", "Back": "กลับ", "Close": "ปิด", "Confirm": "ยืนยัน", "Collect": "รับรางวัล", "Upgrade": "อัปเกรด", "Play": "เล่น", Pause: "หยุดชั่วคราว", Resume: "เล่นต่อ",
};

let uiLanguage: Language = "en";

/** Language used by code that cannot read it from React state (canvas, timers). */
export function currentUiLanguage(): Language {
  return uiLanguage;
}

/** Translate one interface string; returns the input unchanged when no translation exists. */
export function tr(text: string): string {
  if (uiLanguage === "en" || !text) return text;
  const parts = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const key = parts ? parts[2] : text;
  if (!key) return text;
  const translated = translateKey(key, uiLanguage);
  if (translated === undefined || translated === key) return text;
  return (parts ? parts[1] : "") + translated + (parts ? parts[3] : "");
}

function translateKey(key: string, language: Language): string | undefined {
  // shared interface table first, then the curated Thai list, then the extras dictionaries
  const shared = lookupInterface(key, language);
  if (shared) return shared;
  if (language === "th" && TH[key]) return TH[key];
  const extra = translateExtra(key, language);
  return extra !== key ? extra : undefined;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);
const TRANSLATED_ATTRS = ["title", "aria-label", "placeholder", "alt"] as const;

// For every node we remember the English source and the text we last wrote.
// If the live value differs from what we wrote, React changed it, so the
// source is refreshed. This keeps the translation correct across re-renders.
const textState = new WeakMap<Text, { source: string; applied: string }>();
const attrState = new WeakMap<Element, Map<string, { source: string; applied: string }>>();

function translateText(node: Text, language: Language) {
  if (node.parentElement && SKIP_TAGS.has(node.parentElement.tagName)) return;
  const current = node.nodeValue ?? "";
  if (!current.trim()) return;
  let state = textState.get(node);
  if (!state || state.applied !== current) {
    state = { source: current, applied: current };
    textState.set(node, state);
  }
  const desired = language === "en" ? state.source : tr(state.source);
  if (desired !== current) {
    node.nodeValue = desired;
    state.applied = desired;
  }
}

function translateElement(el: Element, language: Language) {
  for (const attr of TRANSLATED_ATTRS) {
    const current = el.getAttribute(attr);
    if (current === null || !current.trim()) continue;
    let map = attrState.get(el);
    if (!map) attrState.set(el, (map = new Map()));
    let state = map.get(attr);
    if (!state || state.applied !== current) {
      state = { source: current, applied: current };
      map.set(attr, state);
    }
    const desired = language === "en" ? state.source : tr(state.source);
    if (desired !== current) {
      el.setAttribute(attr, desired);
      state.applied = desired;
    }
  }
}

function translateSubtree(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root as Text, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (SKIP_TAGS.has(el.tagName)) return;
    translateElement(el, language);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text, language);
    else translateElement(n as Element, language);
    n = walker.nextNode();
  }
}

/**
 * Keeps the whole app in the selected language. Call from the top-level component
 * with the user's language; it runs before paint for every language change.
 */
export function useUiLanguage(language: Language) {
  uiLanguage = language;
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    uiLanguage = language;
    document.documentElement.lang = language;
    const body = document.body;
    translateSubtree(body, language);
    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === "characterData") {
          translateSubtree(rec.target, language);
        } else if (rec.type === "attributes" && rec.target.nodeType === Node.ELEMENT_NODE) {
          translateElement(rec.target as Element, language);
        } else {
          rec.addedNodes.forEach((n) => translateSubtree(n, language));
        }
      }
    });
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRS],
    });
    return () => observer.disconnect();
  }, [language]);
}
