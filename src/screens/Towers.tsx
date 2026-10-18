import { Fragment, useEffect, useRef, useState } from "react";
import type { SaveData } from "../game/save";
import {
  bumpTask,
  critBonus,
  crystalLevel,
  nextCrystalCost,
  towerUpgrades,
  totalCrystalLevels,
  upgradeCrystal,
} from "../game/save";
import { sfx } from "../game/audio";
import {
  TOWERS,
  TOWER_BY_ID,
  RARITY,
  ROMAN,
  MAX_MENU_LEVEL,
  MAX_BATTLE_LEVEL,
  AWAKENING_MAX_TIER,
  upgradeGoldCost,
  upgradeFragCost,
  ascentAllCost,
  awakenCost,
  critBonusFrom,
  fmtCritPct,
  towerStatRows,
  CRYSTALS,
  CRYSTAL_MAX_LEVEL,
  crystalBonus,
  crystalBuffText,
  type CrystalId,
  type TowerDef,
  monthlyEventBonus,
  monthlyEventForDate,
} from "../game/data";
import {
  Ceremony,
  CoinIcon,
  CrystalIcon,
  GemIcon,
  PotionIcon,
  TokenIcon,
  TowerIcon,
  UpgradeCeremony,
  type CeremonyData,
  type UpgradeData,
} from "../components/ui";

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
  /** the scroll strip the rotation chips live in (drag-to-reorder drop zone) */
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [shakeCard, setShakeCard] = useState<string | null>(null);
  const [twFilter, setTwFilter] = useState<"all" | "line" | "locked" | "ready">("all");
  /** tower id shown in the preview panel (clicking a card opens it) */
  const [preview, setPreview] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<CeremonyData | null>(null);
  /** the tower section has two vaults now: the roster and the crystal vault */
  const [section, setSection] = useState<"towers" | "crystals">("towers");
  /** crystal card whose upgrade just landed (drives the pop animation) */
  const [justUpgraded, setJustUpgraded] = useState<CrystalId | null>(null);

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
      // dropped on a chip -> that exact slot
      for (let i = 0; i < slotRefs.current.length; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          addLineup(d.id, i);
          return;
        }
      }
      // dropped anywhere else on the rotation strip -> nearest slot by position
      const strip = stripRef.current;
      if (strip) {
        const r = strip.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          let at = 0;
          for (let i = 0; i < slotRefs.current.length; i++) {
            const el = slotRefs.current[i];
            if (!el) continue;
            const c = el.getBoundingClientRect();
            if (e.clientX > c.left + c.width / 2) at = i + 1;
          }
          addLineup(d.id, at);
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
    const at = save.lineup.indexOf(id);
    // the rotation is only a preference — the first six entries are what the
    // in-battle ascent bar shows, but every unlocked tower can be summoned
    // whether it is listed here or not, so there is no cap to enforce.
    if (at >= 0 && slot === undefined) {
      deny(`${TOWER_BY_NAME(id)} is already in the rotation`);
      return;
    }
    sfx.place();
    mutate((s) => {
      const l = s.lineup.filter((x) => x !== id);
      if (slot !== undefined && slot < l.length) l.splice(slot, 0, id);
      else l.push(id);
      s.lineup = l;
    });
    push(
      at >= 0 ? `${TOWER_BY_NAME(id)} moved to #${(slot ?? save.lineup.length - 1) + 1}` : `${TOWER_BY_NAME(id)} added to the rotation`,
      "#3dff8e"
    );
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

  const [upg, setUpg] = useState<UpgradeData | null>(null);

  const canShake = (id: string) => {
    setShakeCard(id);
    setTimeout(() => setShakeCard(null), 350);
  };

  const monthUpgMul = monthlyEventBonus(monthlyEventForDate().id).upgradeCostMul;

  const doUpgrade = (def: TowerDef) => {
    const lv = save.levels[def.id] || 0;
    if (lv >= MAX_MENU_LEVEL) return deny("Max level reached");
    const gold = Math.round(upgradeGoldCost(lv) * monthUpgMul);
    const fr = upgradeFragCost(lv);
    const have = save.frags[def.id] || 0;
    if (save.gold < gold || have < fr) {
      canShake(def.id);
      return deny(`Need ${gold} gold + ${fr} ${def.name} fragments`);
    }
    sfx.coin();
    // capture the before/after stats so the flourish can show the real deltas
    const before = towerStatRows(def, Math.max(1, lv));
    const after = towerStatRows(def, lv + 1);
    // the merged crit stat: this upgrade adds CRIT_DMG_PER_UPGRADE to the pool
    const critFrom = fmtCritPct(critBonusFrom(save.levels));
    const critTo = fmtCritPct(critBonusFrom({ ...save.levels, [def.id]: lv + 1 }));
    mutate((s) => {
      s.gold -= gold;
      s.frags[def.id] -= fr;
      s.levels[def.id] += 1;
      bumpTask(s, "upgrade", 1);
      bumpTask(s, "spend", gold);
    });
    sfx.awaken();
    setUpg({
      title: def.name,
      kind: "tower",
      tower: def,
      color: RARITY[def.rarity].color,
      fromLv: lv,
      toLv: lv + 1,
      note: lv + 1 === MAX_MENU_LEVEL ? "MAX LEVEL" : "LEVEL UP",
      stats: [
        // crit damage is account-wide now, so every upgrade shows what it added
        { label: "Crit Damage", from: critFrom, to: critTo },
        ...after
          .map((r, i) => ({ label: r.label, from: before[i]?.value ?? r.value, to: r.value }))
          .filter((r) => r.from !== r.to)
          .slice(0, 3),
      ],
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
    if (cur >= AWAKENING_MAX_TIER) return deny(`Awakening maxed (${ROMAN[AWAKENING_MAX_TIER]})`);
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

  const doUpgradeCrystal = (id: CrystalId) => {
    const def = CRYSTALS.find((c) => c.id === id)!;
    const lv = crystalLevel(save, id);
    if (lv >= def.max) return deny(`${def.name} is already maxed`);
    const cost = nextCrystalCost(save, id);
    if (save.potions < cost) return deny(`Need ${cost} crystal potions`);
    // roll the upgrade on a draft, then commit it in one mutate so the save
    // write and the React state change can never disagree
    const next = JSON.parse(JSON.stringify(save)) as SaveData;
    if (!upgradeCrystal(next, id)) return;
    mutate((s) => {
      Object.assign(s, next);
    });
    sfx.awaken();
    setJustUpgraded(id);
    setTimeout(() => setJustUpgraded(null), 600);
    push(`${def.name} crystal Lv ${lv + 1} · ${crystalBuffText(def, lv + 1)}`, def.color);
  };

  const crystalSummary = crystalBonus(save.crystals);

  const unlocked = Object.entries(save.levels).filter(([, l]) => l > 0);
  const avg = unlocked.length ? unlocked.reduce((a, [, l]) => a + l, 0) / unlocked.length : 0;

  /** what the rarity-grouped grid shows under the current filter */
  const twVisible = TOWERS.filter((def) => {
    const lv = save.levels[def.id] || 0;
    if (twFilter === "line") return save.lineup.includes(def.id);
    if (twFilter === "locked") return lv === 0;
    if (twFilter === "ready") {
      const fr = lv > 0 ? upgradeFragCost(lv) : def.unlockFrags;
      return lv > 0 && lv < MAX_MENU_LEVEL && (save.frags[def.id] || 0) >= fr;
    }
    return true;
  });
  const ascCost = ascentAllCost(avg);
  const pv = preview ? TOWER_BY_ID[preview] : null;

  return (
    /* ONE scroll surface for the whole tab. The grid is 61 cells tall and used to
       live in its own nested scroll box (grid inside a fixed-height flex column
       with a pinned footer), which meant the box was never tall enough to reach
       the last rows on a phone. Now the page itself scrolls, the grid is free to
       be as tall as it likes and the filter row sticks to the top of it. */
    <div className="tower-page flex h-full flex-col gap-2.5 overflow-y-auto scroll-thin pb-6 pr-1">
      {/* SECTION SWITCH — the Towers tab is now two vaults: the tower roster
          and the crystal vault that feeds it account-wide buffs. */}
      <div className="flex flex-wrap items-center gap-1.5" data-testid="tower-sections">
        {(
          [
            ["towers", "TOWERS", `#ffcf4d`],
            ["crystals", "CRYSTALS", `#b98bff`],
          ] as const
        ).map(([id, label, color]) => (
          <button
            key={id}
            data-testid={`tower-section-${id}`}
            className={`tab-btn ${section === id ? "on" : ""}`}
            style={section === id ? { color } : undefined}
            onClick={() => {
              sfx.uiTab();
              setSection(id);
            }}
          >
            {label}
            {id === "crystals" && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-[#b98bff]">
                <PotionIcon size={13} />
                <b className="num">{save.potions}</b>
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-black/35 px-2 py-1 text-[11px] font-bold text-[var(--dim)]">
          <CrystalIcon size={14} color="#b98bff" />
          <span className="num" style={{ color: "#b98bff" }}>{totalCrystalLevels(save)}</span> crystal levels
        </span>
      </div>

      {section === "towers" && (
        <>
      {/* The rotation strip and the filter row ride along on top of the scroll:
          the strip is the drop target for drag-to-rotation, so it has to stay
          reachable while the grid (61 cells) scrolls underneath it. */}
      <div className="towers-sticky sticky top-0 z-30 flex flex-col gap-2">
        {/* SUMMON ROTATION — one horizontal strip that never wraps, so the grid
            below keeps its height no matter how many towers are queued. Order
            decides which towers a summon reaches for first. */}
        <div className="tile tile-gold p-2" data-testid="lineup-row">
          <div className="flex items-center gap-2">
            <div className="rota-head shrink-0" title="Summons draw from the top of this list">
              <span className="rota-head-t">SUMMON ROTATION</span>
              <span className="rota-head-n num">{save.lineup.length}</span>
            </div>
            <div className="rota-strip scroll-thin" ref={stripRef}>
              {save.lineup.map((id, i) => {
                const def = TOWER_BY_ID[id];
                if (!def) return null;
                const rc = RARITY[def.rarity];
                return (
                  <div
                    key={id}
                    ref={(el) => {
                      slotRefs.current[i] = el;
                    }}
                    className="tw-chip"
                    style={{ borderColor: rc.color, background: "rgba(8,5,26,0.55)" }}
                    title={`#${i + 1} in the rotation · ${def.name}`}
                  >
                    <span className="tw-chip-i num">{i + 1}</span>
                    <TowerIcon def={def} size={26} />
                    <span className="tw-chip-name" style={{ color: rc.color }}>{def.name}</span>
                    <span className="tw-chip-lv num">{save.levels[def.id]}</span>
                    <button
                      className="tw-chip-x"
                      data-testid={`chip-x-${id}`}
                      title="Remove from rotation"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => toggleLineup(id)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {save.lineup.length === 0 && (
                <span className="self-center text-[11.5px] font-semibold text-[var(--line2)]">
                  Empty — summons pick at random until you set an order.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FILTERS + CRIT BAND — pinned under the rotation strip so the counts,
            the filters and the merged crit total never scroll away from the grid */}
        <div className="tw-filters flex flex-wrap items-center gap-1.5" data-testid="tw-filters">
          {(
            [
              ["all", "ALL"],
              ["line", "IN ROTATION"],
              ["locked", "LOCKED"],
              ["ready", "READY"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              data-testid={"tw-filter-" + id}
              className={"chip chip-btn" + (twFilter === id ? " on" : "")}
              onClick={() => {
                sfx.click();
                setTwFilter(id);
              }}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] font-bold tracking-[0.14em] text-[var(--dim)]">
            <span className="num">{twVisible.length}</span>/<span className="num">{TOWERS.length}</span>
          </span>
          {/* MERGED CRIT DAMAGE — folded into this row so it costs no height */}
          <div className="crit-band ml-auto" data-testid="crit-band" title="Every tower upgrade on the account pools into your crit damage">
            <span className="crit-band-icon">✦</span>
            <span className="crit-band-label">CRIT DAMAGE</span>
            <span className="crit-band-val">
              <span className="num" data-testid="crit-total">{fmtCritPct(critBonus(save))}</span>
            </span>
            <span className="crit-band-x">
              ×{(1 + critBonus(save)).toFixed(2)}
            </span>
            <span className="crit-band-sub">
              <span className="num" data-testid="crit-upgrades">{towerUpgrades(save)}</span> merged
            </span>
          </div>
        </div>
      </div>

      {/* TOWER GRID — one flat grid of icons in rarity order (legendary first),
          each rarity introduced by its own header row. Cells carry the icon, the
          level underneath and an outline in the tower's rarity colour. No
          buttons, no descriptions: tap a cell for the full sheet, drag it onto
          the rotation bar to reorder. The grid is a direct child of the scroll
          surface, so it is allowed to be all 61 cells tall. */}
      <div className="tower-scroll stagger grid content-start gap-1 pr-1" data-testid="tower-grid">
        {(["legendary", "epic", "decent", "normal"] as const).map((rarity) => {
          const group = twVisible.filter((def) => def.rarity === rarity);
          if (!group.length) return null;
          const rc = RARITY[rarity];
          return (
            <Fragment key={rarity}>
              <div className="tw-group-head col-span-full" style={{ color: rc.color }}>
                <i style={{ background: rc.color }} />
                {rarity.toUpperCase()}
                <span className="num">· {group.length}</span>
              </div>
              {group.map((def, i) => {
                const lv = save.levels[def.id] || 0;
                const locked = lv === 0;
                const fr = lv > 0 ? upgradeFragCost(lv) : def.unlockFrags;
                const have = save.frags[def.id] || 0;
                const inLine = save.lineup.includes(def.id);
                const awoken = (save.awn[def.id]?.[0] || 0) + (save.awn[def.id]?.[1] || 0);
                const maxed = lv >= MAX_MENU_LEVEL;
                const ready = have >= fr;
                return (
                  <button
                    key={def.id}
                    data-tower={def.id}
                    data-locked={locked ? "1" : "0"}
                    title={def.name + " — " + (locked ? "locked, needs " + def.unlockFrags + " fragments" : "Lv " + lv + (maxed ? " (max)" : ""))}
                    className={"tw-cell " + (shakeCard === def.id ? "anim-shake " : "") + (inLine ? "in-line " : "") + "anim-pop"}
                    style={{
                      animationDelay: i * 12 + "ms",
                      borderColor: locked ? "#4a3a9688" : rc.color,
                      boxShadow: locked ? "none" : "0 0 0 1px " + rc.color + "22, 0 6px 16px -10px " + rc.color + "aa",
                    }}
                    onPointerDown={(e) => startDrag(def.id, e)}
                  >
                    <span className="tw-cell-art">
                      <TowerIcon def={def} size={42} locked={locked} />
                    </span>
                    <span className="tw-cell-lv" style={{ color: locked ? "var(--dim)" : rc.color }}>
                      {locked ? "LOCKED" : maxed ? "MAX" : "LV " + lv}
                    </span>
                    <span className="tw-cell-frag" style={{ color: locked ? "var(--dim)" : ready ? "#8effc4" : "var(--dim)" }}>
                      <GemIcon size={11} />
                      <b className="num">{have}</b>
                      {!maxed && <i>/{fr}</i>}
                    </span>
                    {awoken > 0 && <span className="tw-cell-awk">✦{awoken}</span>}
                    {inLine && <span className="tw-cell-line">✓</span>}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      {twVisible.length === 0 && (
        <div className="col-span-full py-8 text-center text-[12px] font-bold tracking-[0.18em] text-[var(--dim)]">
          NOTHING MATCHES THIS FILTER
        </div>
      )}
      </div>

      <section className="tile p-3" data-testid="tower-scenes">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="font-disp text-lg text-[#ff9be9]">SCENES</div><div className="text-xs font-semibold text-[var(--dim)]">Starfall Sanctum · +20% crit damage while owned</div></div>
          {save.scenes.includes("starfall") ? <span className="chip text-[#8effc4]">OWNED · +20% CRIT DMG</span> : <button className="btn btn-cyan flex items-center gap-1.5 px-3 py-2 text-xs" disabled={save.gems < 1500} onClick={() => { mutate((s) => { if (!s.scenes.includes("starfall") && s.gems >= 1500) { s.gems -= 1500; s.scenes.push("starfall"); } }); push("STARFALL SANCTUM UNLOCKED · +20% CRIT DAMAGE", "#ff9be9"); }}><GemIcon size={14}/> 1,500</button>}
        </div>
      </section>

      {/* ASCENT ALL — a compact one-line bar rather than a second panel */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#35e0ff66] bg-[#0d1330]/70 px-2.5 py-1.5" data-testid="ascent-all">
        <div className="min-w-0 flex-1">
          <div className="font-disp text-[15px] leading-none text-[#35e0ff]">Ascent All</div>
          <div className="truncate text-[10.5px] font-semibold text-[var(--dim)]">Every unlocked tower +1 level · no fragments</div>
        </div>
        <button
          className="btn btn-cyan flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12px]"
          disabled={save.gold < ascCost}
          onClick={doAscentAll}
        >
          <CoinIcon size={14} /> {ascCost}
        </button>
      </div>
        </>
      )}

      {section === "crystals" && (
        <CrystalVault
          save={save}
          summary={crystalSummary}
          justUpgraded={justUpgraded}
          onUpgrade={doUpgradeCrystal}
        />
      )}

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

      {upg && <UpgradeCeremony data={upg} onClose={() => setUpg(null)} />}
      {ceremony && <Ceremony data={ceremony} onClose={() => setCeremony(null)} />}
    </div>
  );
}

/**
 * CRYSTAL VAULT — the second vault inside the Towers tab. Six crystals, each
 * one a small permanent account buff, each level paid for in crystal potions.
 * Nothing here touches gold or fragments: potions are the only currency.
 */
function CrystalVault({
  save,
  summary,
  justUpgraded,
  onUpgrade,
}: {
  save: SaveData;
  summary: ReturnType<typeof crystalBonus>;
  justUpgraded: CrystalId | null;
  onUpgrade: (id: CrystalId) => void;
}) {
  const active: { label: string; value: string; color: string }[] = [];
  if (summary.atk > 0) active.push({ label: "Tower ATK", value: `+${(summary.atk * 100).toFixed(1)}%`, color: "#ff4d5e" });
  if (summary.aspd > 0) active.push({ label: "ATK Speed", value: `+${(summary.aspd * 100).toFixed(1)}%`, color: "#c44dff" });
  if (summary.crit > 0) active.push({ label: "Crit Chance", value: `+${(summary.crit * 100).toFixed(1)}%`, color: "#3fb6ff" });
  if (summary.sp > 0) active.push({ label: "SP Gain", value: `+${(summary.sp * 100).toFixed(1)}%`, color: "#3dff8e" });
  if (summary.gold > 0) active.push({ label: "Run Gold", value: `+${(summary.gold * 100).toFixed(1)}%`, color: "#ffcf4d" });
  if (summary.lives > 0) active.push({ label: "Start Lives", value: `+${summary.lives}`, color: "#9fe8ff" });

  return (
    <div className="flex flex-col gap-2.5" data-testid="crystal-vault">
      <div className="tile tile-gold holo p-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold tracking-[0.3em] text-[#b98bff]">CRYSTAL VAULT</div>
            <div className="font-disp text-2xl leading-none text-white">
              <span className="num" style={{ color: "#b98bff" }}>{totalCrystalLevels(save)}</span>
              <span className="text-[var(--dim)]"> / {CRYSTALS.reduce((a, c) => a + c.max, 0)} LEVELS</span>
            </div>
            <p className="mt-1 max-w-xl text-[12px] font-semibold text-[var(--dim)]">
              Every crystal is a small permanent buff for the whole account. Each upgrade costs crystal
              potions — never gold, never fragments. Potions drop from runs, daily events and monthly crates.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#5b3b8c] bg-black/45 px-3 py-2 text-[15px] font-bold text-[#b98bff]" data-testid="potion-balance">
            <PotionIcon size={22} />
            <span className="num">{save.potions}</span>
            <span className="text-[11px] tracking-wider text-[var(--dim)]">POTIONS</span>
          </div>
        </div>
        {active.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="crystal-summary">
            {active.map((a) => (
              <span key={a.label} className="pill-dark text-[10.5px] font-bold" style={{ borderColor: a.color + "66", color: a.color }}>
                {a.label} <b className="num">{a.value}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="crystal-grid">
        {CRYSTALS.map((def) => {
          const lv = crystalLevel(save, def.id);
          const maxed = lv >= def.max;
          const cost = nextCrystalCost(save, def.id);
          const afford = save.potions >= cost;
          return (
            <div
              key={def.id}
              className={`crystal-card tile relative flex gap-2.5 p-2.5 ${justUpgraded === def.id ? "anim-pop" : ""}`}
              data-crystal={def.id}
              style={{ borderColor: lv > 0 ? def.color + "aa" : undefined, boxShadow: lv > 0 ? `0 0 22px -14px ${def.color}` : undefined }}
            >
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border"
                style={{ borderColor: def.color + "66", background: `radial-gradient(circle at 35% 25%, ${def.color}33, rgba(0,0,0,0.5))` }}
              >
                <CrystalIcon size={30} color={def.color} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-disp text-[17px] leading-none" style={{ color: def.color }}>{def.name}</span>
                  <span className="num text-[10.5px] font-bold text-[var(--dim)]">
                    LV {lv}/{def.max}
                  </span>
                </div>
                <div className="truncate text-[11px] font-semibold text-[var(--dim)]">{def.desc}</div>
                <div className="mt-1 text-[11.5px] font-bold" style={{ color: lv > 0 ? "#8effc4" : "var(--line2)" }}>
                  {crystalBuffText(def, lv)}
                </div>
                <div className="task-bar mt-1.5">
                  <span
                    className="task-bar-fill"
                    style={{ width: `${(lv / def.max) * 100}%`, background: `linear-gradient(90deg,${def.color},#ffffff)` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b98bff]">
                    <PotionIcon size={13} />
                    {maxed ? "MAX" : `${cost} / ${save.potions}`}
                  </span>
                  <button
                    className={`btn flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px] ${!maxed && afford ? "btn-cyan" : ""}`}
                    data-testid={`crystal-upgrade-${def.id}`}
                    disabled={maxed || !afford}
                    onClick={() => onUpgrade(def.id)}
                  >
                    {maxed ? "MAX LEVEL" : (<><PotionIcon size={12} /> UPGRADE</>)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--dim)]">
        Max level per crystal is {CRYSTAL_MAX_LEVEL} (Diamond stops at 10). Costs climb 22% a level.
        Potions come from run payouts, the daily event streak, daily tasks, and the monthly track.
      </div>
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
  const gold = Math.round(upgradeGoldCost(Math.max(1, lv)) * monthlyEventBonus(monthlyEventForDate().id).upgradeCostMul);
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
          {/* every tower in the game has two awakening paths now — the old
              "exotic only" gate left 27 of them showing a dead panel */}
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
                      <span className="text-[11px] font-bold text-[var(--dim)]">{tier > 0 ? awkText(def, slot, tier) : "Not awakened yet"}</span>
                      {avail ? (
                        tier < AWAKENING_MAX_TIER ? (
                          <button className="btn flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px]" onClick={() => onAwaken(slot)}>
                            <TokenIcon size={12} /> {cost} · Tier {ROMAN[tier + 1]}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-[#ff4fd8]">MAX TIER {ROMAN[AWAKENING_MAX_TIER]}</span>
                        )
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-[var(--line2)]">Lv {needLv} needed</span>
                      )}
                    </div>
                    {tier < AWAKENING_MAX_TIER && avail && <div className="mt-1 text-[10px] font-semibold text-[#ffd5f5]">Next · Tier {ROMAN[tier + 1]}: {awkText(def, slot, tier + 1)}</div>}
                  </div>
                );
            })}
          </div>
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
  // bespoke kits (demon, heavenly, honor…) spell their own tier line out
  if (s.fmt) return `Tier ${ROMAN[tier]} · ${s.fmt(s.mult[t], s.mult2?.[t])}`;
  if (s.chance[t] === 0) return `+${Math.round(s.mult[t] * 100)}% crit · cap ${s.mult2?.[t] ?? s.mult[t]}`;
  const base = `${Math.round(s.chance[t] * 100)}% chance · +${Math.round(s.mult[t] * 100)}% power`;
  return s.mult2 ? `${base} (${s.mult2[t]}x)` : base;
}
