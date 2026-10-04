import { useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import { sfx } from "../game/audio";
import {
  TOWERS,
  TOWER_BY_ID,
  RARITY,
  ROMAN,
  MAX_MENU_LEVEL,
  MAX_BATTLE_LEVEL,
  upgradeGoldCost,
  upgradeFragCost,
  ascentAllCost,
  awakenCost,
  towerStatRows,
  type TowerDef,
} from "../game/data";
import { Ceremony, CoinIcon, TokenIcon, TowerIcon, type CeremonyData } from "../components/ui";

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
  /** tower id shown in the preview panel (clicking a card opens it) */
  const [preview, setPreview] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<CeremonyData | null>(null);

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
        // a plain tap opens the tower preview
        openPreview(d.id);
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

  const openPreview = (id: string) => {
    sfx.click();
    setPreview(id);
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
    if (lv + 1 === MAX_MENU_LEVEL) {
      sfx.ceremony();
      setCeremony({
        kind: "level",
        headline: def.name,
        sub: "MAX LEVEL REACHED",
        tier: `LV ${MAX_MENU_LEVEL}`,
        color: "#ffcf4d",
        desc: "Every menu level is banked. Now ascend it in battle.",
        tower: def,
      });
    }
  };

  const doUnlock = (def: TowerDef) => {
    const cost = def.unlockFrags;
    const have = save.frags[def.id] || 0;
    if (have < cost) {
      canShake(def.id);
      return deny(`Need ${cost} ${def.name} fragments to unlock`);
    }
    sfx.ceremony();
    mutate((s) => {
      s.frags[def.id] -= cost;
      s.levels[def.id] = 1;
    });
    setCeremony({
      kind: "unlock",
      headline: def.name,
      sub: `${RARITY[def.rarity].name.toUpperCase()} TOWER UNLOCKED`,
      color: RARITY[def.rarity].color,
      desc: def.desc,
      tower: def,
    });
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
    const spec = slot === 0 ? def.awk1! : def.awk2!;
    if (lv < needLv) return deny(`Awakening ${slot === 0 ? "1" : "2"} unlocks at Lv ${needLv}`);
    const cur = save.awn[def.id]?.[slot] || 0;
    if (cur >= 5) return deny("Awakening maxed (V)");
    const cost = awakenCost(cur + 1);
    if (save.tokens < cost) return deny(`Need ${cost} Magic Tokens`);
    mutate((s) => {
      s.tokens -= cost;
      const a = s.awn[def.id] || [0, 0];
      a[slot] += 1;
      s.awn[def.id] = a as [number, number];
    });
    // the ceremony only fires after the save write so it shows the new tier
    sfx.ceremony();
    setCeremony({
      kind: "awaken",
      headline: def.name,
      sub: `${slot === 0 ? "1st" : "2nd"} Awakening · ${spec.name}`,
      tier: `TIER ${ROMAN[cur + 1]}`,
      color: "#ff4fd8",
      desc: spec.desc,
      tower: def,
    });
  };

  const unlocked = Object.entries(save.levels).filter(([, l]) => l > 0);
  const avg = unlocked.length ? unlocked.reduce((a, [, l]) => a + l, 0) / unlocked.length : 0;
  const ascCost = ascentAllCost(avg);
  const pv = preview ? TOWER_BY_ID[preview] : null;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* LINEUP — visible on top */}
      <div className="panel shrink-0 p-3" style={{ borderColor: "rgba(255,207,77,0.4)" }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold tracking-[0.25em] text-[#ffcf4d]">BATTLE LINEUP · {save.lineup.length}/6</div>
          <div className="text-xs font-semibold text-[var(--dim)]">Tap a tower to preview it · drag it onto a slot · battle summons use this lineup</div>
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
          const fr = lv > 0 ? upgradeFragCost(lv) : 0;
          const have = save.frags[def.id] || 0;
          const inLine = save.lineup.includes(def.id);
          const awoken = (save.awn[def.id]?.[0] || 0) + (save.awn[def.id]?.[1] || 0);
          return (
            <div
              key={def.id}
              data-tower={def.id}
              className={`panel anim-pop flex flex-col p-3 ${shakeCard === def.id ? "anim-shake" : ""}`}
              style={{ animationDelay: `${i * 30}ms`, borderColor: rc.color + (locked ? "44" : "77"), cursor: "grab" }}
              onPointerDown={(e) => startDrag(def.id, e)}
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
                {awoken > 0 && (
                  <span className="shrink-0 rounded border border-[#ff4fd8aa] px-1 text-[10px] font-bold text-[#ff9be9]">
                    ✦{awoken}
                  </span>
                )}
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

              <div className="mt-auto flex flex-col gap-1 pt-2" onPointerDown={(e) => e.stopPropagation()}>
                <button className="btn w-full py-1.5 text-[12px]" onClick={() => openPreview(def.id)}>
                  Preview &amp; Upgrade
                </button>
                {!locked && (
                  <button
                    className="btn w-full py-1 text-[11px]"
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
          <TowerIcon def={TOWER_BY_ID[drag.id]} size={56} />
        </div>
      )}

      {/* TOWER PREVIEW */}
      {pv && (
        <TowerPreview
          def={pv}
          save={save}
          onClose={() => setPreview(null)}
          onUpgrade={() => doUpgrade(pv)}
          onUnlock={() => doUnlock(pv)}
          onToggleLineup={() => toggleLineup(pv.id)}
          onAwaken={(slot) => doAwaken(pv, slot)}
          stats={towerStatRows(pv, Math.max(1, save.levels[pv.id] || 1))}
        />
      )}

      {ceremony && <Ceremony data={ceremony} onClose={() => setCeremony(null)} />}
    </div>
  );
}

function TOWER_BY_NAME(id: string) {
  return TOWER_BY_ID[id]?.name ?? id;
}

function TowerPreview({
  def,
  save,
  stats,
  onClose,
  onUpgrade,
  onUnlock,
  onToggleLineup,
  onAwaken,
}: {
  def: TowerDef;
  save: SaveData;
  stats: ReturnType<typeof towerStatRows>;
  onClose: () => void;
  onUpgrade: () => void;
  onUnlock: () => void;
  onToggleLineup: () => void;
  onAwaken: (slot: 0 | 1) => void;
}) {
  const lv = save.levels[def.id] || 0;
  const locked = lv === 0;
  const rc = RARITY[def.rarity];
  const gold = upgradeGoldCost(Math.max(1, lv));
  const fr = upgradeFragCost(Math.max(1, lv));
  const have = save.frags[def.id] || 0;
  const inLine = save.lineup.includes(def.id);
  const maxed = lv >= MAX_MENU_LEVEL;
  const rows = stats;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel anim-pop max-h-[90vh] w-[620px] overflow-y-auto scroll-thin p-5"
        style={{ borderColor: rc.color + "aa" }}
        data-testid="tower-preview"
      >
        {/* name on top */}
        <div className="flex items-start gap-3">
          <TowerIcon def={def} size={70} locked={locked} />
          <div className="min-w-0 flex-1">
            <div className="font-disp truncate text-3xl" style={{ color: rc.color, textShadow: `0 0 22px ${rc.glow}` }}>
              {def.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-bold tracking-widest"
                style={{ background: rc.color + "22", color: rc.color, border: `1px solid ${rc.color}77` }}
              >
                {rc.name.toUpperCase()}
              </span>
              <span className="chip text-[12px] text-[var(--txt)]">
                {locked ? "LOCKED" : `Lv ${lv}/${MAX_MENU_LEVEL}`}
              </span>
              <span className="chip text-[12px] text-[var(--dim)]">
                {(def.target === "none" ? "Support" : def.target === "all" ? "Hits everyone" : "Front target")}
              </span>
            </div>
          </div>
          <button className="btn shrink-0 px-3 py-1 text-[12px]" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* description below the name */}
        <p className="mt-3 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-[13px] font-semibold leading-snug text-[var(--txt)]/85">
          {def.desc}
        </p>

        {/* stats with the next-upgrade delta */}
        <div className="mt-3">
          <div className="mb-1.5 text-[12px] font-bold tracking-[0.25em] text-[var(--cyan)]">
            STATS {locked ? "" : `· Lv ${lv} → ${maxed ? "MAX" : lv + 1}`}
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="row-card py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold text-[var(--dim)]">{r.label}</div>
                  <div className="text-[14px] font-bold text-[var(--txt)]">{r.value}</div>
                </div>
                {r.delta ? (
                  <div className="shrink-0 text-right">
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: r.better === "down" ? "#35e0ff" : "#3dff8e" }}
                    >
                      {r.delta}
                    </div>
                    {r.next && <div className="text-[11px] font-bold text-[var(--dim)]">→ {r.next}</div>}
                  </div>
                ) : (
                  <div className="shrink-0 text-[11px] font-bold text-[var(--line2)]">{r.maxed ? "MAX" : "—"}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* level upgrade */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2.5">
          <div>
            <div className="font-disp text-base text-[#ffcf4d]">Level Up</div>
            <div className="text-[12px] font-semibold text-[var(--dim)]">
              {locked
                ? `Unlock with ${def.unlockFrags} fragments (you have ${have})`
                : maxed
                  ? "Menu level maxed — ascend it in battle"
                  : `${gold} gold + ${fr} fragments (you have ${have})`}
            </div>
          </div>
          {locked ? (
            <button
              className="btn btn-gold px-5 py-2 text-[13px]"
              style={{ borderColor: have >= def.unlockFrags ? "#3dff8e88" : undefined }}
              onClick={onUnlock}
            >
              Unlock
            </button>
          ) : (
            <button
              className={`btn px-5 py-2 text-[13px] ${!maxed && save.gold >= gold && have >= fr ? "btn-gold" : ""}`}
              disabled={maxed}
              onClick={onUpgrade}
            >
              {maxed ? "MAX LEVEL" : (<span className="inline-flex items-center gap-1.5"><CoinIcon size={14} /> Upgrade</span>)}
            </button>
          )}
        </div>

        {/* ascent / awakening section */}
        <div className="mt-3 rounded-lg border border-[#ff4fd855] bg-[#2a0b33]/50 p-3">
          <div className="flex items-center justify-between">
            <div className="font-disp text-base text-[#ff9be9]">ASCENT · Awakenings</div>
            <span className="text-[11px] font-bold text-[var(--dim)]">
              Battle Lv 1–{MAX_BATTLE_LEVEL} · ×1.55 damage per level
            </span>
          </div>
          {def.exotic ? (
            <div className="mt-2 space-y-2">
              {([0, 1] as const).map((slot) => {
                const spec = slot === 0 ? def.awk1! : def.awk2!;
                const needLv = slot === 0 ? 10 : 15;
                const tier = save.awn[def.id]?.[slot] || 0;
                const avail = lv >= needLv;
                const cost = awakenCost(tier + 1);
                return (
                  <div key={slot} className="rounded-md border border-[#ff4fd855] bg-black/30 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-[#ff9be9]">
                        {slot === 0 ? "1st" : "2nd"} Awakening · {spec.name}
                      </span>
                      <span className="font-disp text-[15px]" style={{ color: tier > 0 ? "#ff4fd8" : "var(--line2)" }}>
                        {tier > 0 ? ROMAN[tier] : "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[var(--dim)]">{spec.desc}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[var(--dim)]">{awkText(def, slot, tier)}</span>
                      {avail ? (
                        tier < 5 ? (
                          <button className="btn flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px]" onClick={() => onAwaken(slot)}>
                            <TokenIcon size={12} /> {cost} · Tier {ROMAN[tier + 1]}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-[#ff4fd8]">MAX TIER</span>
                        )
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-[var(--line2)]">Lv {needLv} needed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] font-semibold text-[var(--dim)]">
              This tower has no awakening paths yet — it grows through levels and in-battle ascension instead.
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="btn flex-1 py-2 text-[13px]"
            style={inLine ? { borderColor: "#ff4d5e88", color: "#ff8f9a" } : { borderColor: "#3dff8e88", color: "#8effc4" }}
            disabled={locked}
            onClick={onToggleLineup}
          >
            {inLine ? "Remove from Lineup" : "Add to Lineup"}
          </button>
          <button className="btn btn-cyan flex-1 py-2 text-[13px]" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function awkText(def: TowerDef, slot: 0 | 1, tier: number): string {
  const s = slot === 0 ? def.awk1! : def.awk2!;
  if (tier <= 0) return "Not awakened yet";
  const t = Math.max(0, tier - 1);
  if (s.chance[t] === 0) return `+${Math.round(s.mult[t] * 100)}% crit · cap ${s.mult2?.[t] ?? s.mult[t]}`;
  const base = `${Math.round(s.chance[t] * 100)}% chance · +${Math.round(s.mult[t] * 100)}% power`;
  return s.mult2 ? `${base} (${s.mult2[t]}x)` : base;
}
