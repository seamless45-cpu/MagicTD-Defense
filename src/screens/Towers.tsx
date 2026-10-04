import { useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import { sfx } from "../game/audio";
import {
  TOWERS,
  RARITY,
  ROMAN,
  MAX_MENU_LEVEL,
  MAX_BATTLE_LEVEL,
  upgradeGoldCost,
  upgradeFragCost,
  ascentAllCost,
  awakenCost,
  type TowerDef,
} from "../game/data";
import { CoinIcon, TokenIcon, TowerIcon } from "../components/ui";

interface Drag {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
}

export default function Towers({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shakeCard, setShakeCard] = useState<string | null>(null);

  const startDrag = (id: string, e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    const d: Drag = { id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  // Listen on the window so a drag keeps working once the pointer leaves the panel.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nd = {
        ...d,
        x: e.clientX,
        y: e.clientY,
        moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8,
      };
      dragRef.current = nd;
      setDrag(nd);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDrag(null);
      if (!d.moved) {
        // treat as click: toggle lineup
        toggleLineup(d.id);
        return;
      }
      for (let i = 0; i < 6; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          addLineup(d.id, i);
          return;
        }
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  });

  const deny = (msg: string) => {
    sfx.error();
    push(msg, "#ff4d5e");
  };

  const addLineup = (id: string, slot?: number) => {
    const lv = save.levels[id];
    if (!lv) {
      deny(`${TOWER_BY_NAME(id)} is locked`);
      return;
    }
    if (save.lineup.includes(id)) {
      deny("Already in lineup");
      return;
    }
    if (save.lineup.length >= 6) {
      deny("Lineup is full (6 max)");
      return;
    }
    sfx.place();
    mutate((s) => {
      const l = [...s.lineup];
      if (slot !== undefined && slot < l.length) l.splice(slot, 0, id);
      else l.push(id);
      s.lineup = l;
    });
    push(`${TOWER_BY_NAME(id)} added to lineup`, "#3dff8e");
  };

  const toggleLineup = (id: string) => {
    if (save.lineup.includes(id)) {
      sfx.click();
      mutate((s) => {
        s.lineup = s.lineup.filter((x) => x !== id);
      });
      push(`${TOWER_BY_NAME(id)} removed from lineup`, "#9d93d6");
      return;
    }
    addLineup(id);
  };

  const canShake = (id: string) => {
    setShakeCard(id);
    setTimeout(() => setShakeCard(null), 350);
  };

  const doUpgrade = (def: TowerDef) => {
    const lv = save.levels[def.id] || 0;
    if (lv >= MAX_MENU_LEVEL) return deny("Max level reached");
    const gold = upgradeGoldCost(lv);
    const fr = upgradeFragCost(lv);
    const have = save.frags[def.id] || 0;
    if (save.gold < gold || have < fr) {
      canShake(def.id);
      return deny(`Need ${gold} gold + ${fr} ${def.name} fragments`);
    }
    sfx.coin();
    mutate((s) => {
      s.gold -= gold;
      s.frags[def.id] -= fr;
      s.levels[def.id] += 1;
    });
    push(`${def.name} upgraded to Lv ${lv + 1}`, "#ffcf4d");
  };

  const doUnlock = (def: TowerDef) => {
    const cost = def.unlockFrags;
    const have = save.frags[def.id] || 0;
    if (have < cost) {
      canShake(def.id);
      return deny(`Need ${cost} ${def.name} fragments to unlock`);
    }
    sfx.awaken();
    mutate((s) => {
      s.frags[def.id] -= cost;
      s.levels[def.id] = 1;
    });
    push(`${def.name} unlocked!`, RARITY[def.rarity].color);
  };

  const doAscentAll = () => {
    const unlocked = Object.entries(save.levels).filter(([, l]) => l > 0);
    const maxed = unlocked.every(([, l]) => l >= MAX_MENU_LEVEL);
    if (maxed) return deny("All towers at max level");
    const avg = unlocked.reduce((a, [, l]) => a + l, 0) / unlocked.length;
    const cost = ascentAllCost(avg);
    if (save.gold < cost) return deny(`Ascent All needs ${cost} gold`);
    sfx.awaken();
    mutate((s) => {
      s.gold -= cost;
      for (const id of Object.keys(s.levels)) {
        if (s.levels[id] > 0 && s.levels[id] < MAX_MENU_LEVEL) s.levels[id] += 1;
      }
    });
    push("ASCENT — all towers leveled up!", "#35e0ff");
  };

  const doAwaken = (def: TowerDef, slot: 0 | 1) => {
    const lv = save.levels[def.id];
    const needLv = slot === 0 ? 10 : 15;
    if (lv < needLv) return deny(`Awakening ${slot === 0 ? "1" : "2"} unlocks at Lv ${needLv}`);
    const cur = save.awn[def.id]?.[slot] || 0;
    if (cur >= 5) return deny("Awakening maxed (V)");
    const cost = awakenCost(cur + 1);
    if (save.tokens < cost) return deny(`Need ${cost} Magic Tokens`);
    sfx.awaken();
    mutate((s) => {
      s.tokens -= cost;
      const a = s.awn[def.id] || [0, 0];
      a[slot] += 1;
      s.awn[def.id] = a as [number, number];
    });
    push(`${def.name} · ${slot === 0 ? def.awk1!.name : def.awk2!.name} → Tier ${ROMAN[cur + 1]}`, "#ff4fd8");
  };

  const unlocked = Object.entries(save.levels).filter(([, l]) => l > 0);
  const avg = unlocked.length ? unlocked.reduce((a, [, l]) => a + l, 0) / unlocked.length : 0;
  const ascCost = ascentAllCost(avg);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* LINEUP — visible on top */}
      <div className="panel shrink-0 p-3" style={{ borderColor: "rgba(255,207,77,0.4)" }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold tracking-[0.25em] text-[#ffcf4d]">BATTLE LINEUP · {save.lineup.length}/6</div>
          <div className="text-xs font-semibold text-[var(--dim)]">Tap a tower or drag it onto a slot · taken into every battle</div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const id = save.lineup[i];
            const def = id ? TOWERS.find((t) => t.id === id)! : null;
            return (
              <div
                key={i}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className="slot-dash flex h-[74px] min-w-[84px] flex-1 items-center justify-center gap-1.5 px-2"
                style={def ? { borderColor: RARITY[def.rarity].color, background: "rgba(8,5,26,0.5)" } : undefined}
              >
                {def ? (
                  <div className="flex items-center gap-1.5">
                    <TowerIcon def={def} size={46} />
                    <div className="leading-tight">
                      <div className="max-w-[72px] truncate text-[13px] font-bold" style={{ color: RARITY[def.rarity].color }}>
                        {def.name}
                      </div>
                      <div className="text-[11px] font-bold text-[var(--dim)]">Lv {save.levels[def.id]} · tap to remove</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold tracking-widest text-[var(--line2)]">EMPTY</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TOWER GRID */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto scroll-thin pr-1 md:grid-cols-3 xl:grid-cols-5">
        {TOWERS.map((def, i) => {
          const lv = save.levels[def.id] || 0;
          const locked = lv === 0;
          const rc = RARITY[def.rarity];
          const gold = lv > 0 ? upgradeGoldCost(lv) : 0;
          const fr = lv > 0 ? upgradeFragCost(lv) : 0;
          const have = save.frags[def.id] || 0;
          const inLine = save.lineup.includes(def.id);
          return (
            <div
              key={def.id}
              className={`panel anim-pop flex flex-col p-3 ${shakeCard === def.id ? "anim-shake" : ""}`}
              style={{ animationDelay: `${i * 40}ms`, borderColor: rc.color + (locked ? "44" : "77"), cursor: locked ? "default" : "grab" }}
              onPointerDown={locked ? undefined : (e) => startDrag(def.id, e)}
            >
              <div className="flex items-start gap-2">
                <TowerIcon def={def} size={54} locked={locked} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold" style={{ color: rc.color }}>{def.name}</div>
                  <span
                    className="mt-0.5 inline-block rounded px-1.5 py-px text-[10px] font-bold tracking-widest"
                    style={{ background: rc.color + "22", color: rc.color, border: `1px solid ${rc.color}55` }}
                  >
                    {rc.name.toUpperCase()}
                  </span>
                  <div className="mt-1 text-[12px] font-bold text-[var(--dim)]">
                    {locked ? <span className="text-[#ff4d5e]">LOCKED</span> : <>Lv {lv}/{MAX_MENU_LEVEL}</>}
                  </div>
                </div>
              </div>
              <p className="mt-1.5 line-clamp-2 min-h-[28px] text-[11px] font-semibold leading-tight text-[var(--dim)]">
                {locked ? `Unlock with ${def.unlockFrags} fragments (from chests).` : def.desc}
              </p>
              {!locked && (
                <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[var(--dim)]">Frags: <span className="text-[var(--txt)]">{have}</span>{lv < MAX_MENU_LEVEL ? ` / ${fr} next` : ""}</span>
                  <span className="text-[var(--dim)]">Battle Lv 1–{MAX_BATTLE_LEVEL}</span>
                </div>
              )}

              {/* Awakenings for exotic legendaries */}
              {!locked && def.exotic && (
                <div className="mt-2 space-y-1.5">
                  {([0, 1] as const).map((slot) => {
                    const spec = slot === 0 ? def.awk1! : def.awk2!;
                    const needLv = slot === 0 ? 10 : 15;
                    const tier = save.awn[def.id]?.[slot] || 0;
                    const avail = lv >= needLv;
                    return (
                      <div key={slot} className="rounded-md border border-[#ff4fd855] bg-[#2a0b33]/60 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#ff9be9]">
                            {slot === 0 ? "1st" : "2nd"} Awakening · {spec.name}
                          </span>
                          <span className="font-disp text-[13px]" style={{ color: tier > 0 ? "#ff4fd8" : "var(--line2)" }}>
                            {tier > 0 ? ROMAN[tier] : "—"}
                          </span>
                        </div>
                        {avail ? (
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold text-[var(--dim)]">
                              {awkText(def, slot, tier)}
                            </span>
                            {tier < 5 ? (
                              <button
                                className="btn flex items-center gap-1 px-2 py-0.5 text-[11px]"
                                onClick={(e) => { e.stopPropagation(); doAwaken(def, slot); }}
                              >
                                <TokenIcon size={12} /> {awakenCost(tier + 1)}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-[#ff4fd8]">MAX</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-[var(--dim)]">Unlocks at Lv {needLv}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-auto pt-2" onPointerDown={(e) => e.stopPropagation()}>
                {locked ? (
                  <button
                    className="btn w-full py-1.5 text-[12px]"
                    style={{ borderColor: have >= def.unlockFrags ? "#3dff8e88" : undefined }}
                    onClick={() => doUnlock(def)}
                  >
                    Unlock · {def.unlockFrags} frags ({have})
                  </button>
                ) : (
                  <button
                    className={`btn flex w-full items-center justify-center gap-1.5 py-1.5 text-[12px] ${lv < MAX_MENU_LEVEL && save.gold >= gold && have >= fr ? "btn-gold" : ""}`}
                    disabled={lv >= MAX_MENU_LEVEL}
                    onClick={() => doUpgrade(def)}
                  >
                    {lv >= MAX_MENU_LEVEL ? "MAX LEVEL" : (<><CoinIcon size={13} /> {gold} · {fr} frag · Upgrade</>)}
                  </button>
                )}
                {!locked && (
                  <button
                    className="btn mt-1 w-full py-1 text-[11px]"
                    style={inLine ? { borderColor: "#ff4d5e88", color: "#ff8f9a" } : { borderColor: "#3dff8e55", color: "#8effc4" }}
                    onClick={() => toggleLineup(def.id)}
                  >
                    {inLine ? "In Lineup — Remove" : "Add to Lineup"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ASCENT ALL */}
      <div className="panel flex shrink-0 items-center justify-between gap-4 px-4 py-3" style={{ borderColor: "rgba(53,224,255,0.4)" }}>
        <div>
          <div className="font-disp text-base text-[#35e0ff]">Ascent All</div>
          <div className="text-[12px] font-semibold text-[var(--dim)]">Upgrade every unlocked tower +1 level. No fragments required.</div>
        </div>
        <button
          className="btn btn-cyan flex items-center gap-2 px-6 py-2.5"
          disabled={save.gold < ascCost}
          onClick={doAscentAll}
        >
          <CoinIcon size={16} /> {ascCost}
        </button>
      </div>

      {/* drag ghost */}
      {drag && drag.moved && (
        <div className="pointer-events-none fixed z-[95]" style={{ left: drag.x - 28, top: drag.y - 28 }}>
          <TowerIcon def={TOWERS.find((t) => t.id === drag.id)!} size={56} />
        </div>
      )}
    </div>
  );
}

function TOWER_BY_NAME(id: string) {
  return TOWERS.find((t) => t.id === id)?.name ?? id;
}

function awkText(def: TowerDef, slot: 0 | 1, tier: number): string {
  const t = Math.max(0, tier - 1);
  if (def.id === "lightning") {
    const s = slot === 0 ? def.awk1! : def.awk2!;
    if (slot === 0) return tier > 0 ? `${s.chance[t] * 100}% · +${s.mult[t] * 100}% dmg, always crit` : "No tier";
    return tier > 0 ? `${s.chance[t] * 100}% · ${s.mult[t]}–${s.mult2![t]} extra bolts` : "No tier";
  }
  if (def.id === "hellstorm") {
    const s = slot === 0 ? def.awk1! : def.awk2!;
    if (slot === 0) return tier > 0 ? `+${s.mult[t] * 100}% crit · +1% atk/kill (cap ${s.mult2![t]})` : "No tier";
    return tier > 0 ? `Merge burst: ${s.mult[t]} beams · Party ${s.mult2![t] * 100}% dmg` : "No tier";
  }
  return "";
}
