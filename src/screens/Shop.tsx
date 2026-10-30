import { useState } from "react";
import type { SaveData } from "../game/save";
import { bumpQuest, bumpTask, grantLoot, lootLines, rollChest, type ChestLoot } from "../game/save";
import { sfx } from "../game/audio";
import { CHESTS, CHIPS, HERO_BY_ID, TOWERS, TOWER_BY_ID, RARITY, eventBonus, eventForDate, monthlyEventBonus, monthlyEventForDate, type Rarity } from "../game/data";
import { ChipIcon, CoinIcon, ClaimChest, GemIcon, Modal, RewardClaim, ShardIcon, TokenIcon, TowerIcon, type ClaimData } from "../components/ui";

/** gold price of one fragment of each rarity */
const FRAG_PRICE: Record<Rarity, number> = { normal: 120, decent: 320, epic: 750, legendary: 1400, mystical: 999999 };

// gem prices scaled up hard (balance patch: magic token exchange +16x again)
const TOKEN_PACKS = [
  { tokens: 1, gems: 32 },
  { tokens: 5, gems: 128 },
  { tokens: 12, gems: 272 },
  { tokens: 200, gems: 2000 },
];

export default function Shop({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const [stage, setStage] = useState<"closed" | "shaking" | "reward">("closed");
  const [loot, setLoot] = useState<ChestLoot | null>(null);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [fragPick, setFragPick] = useState<string>(TOWERS[0].id);
  const [fragQty, setFragQty] = useState<1 | 5>(1);

  // the live weekday event discounts chests and sweetens the fragment rolls;
  // the monthly event stacks its own fragment perks on top
  const ev = eventForDate();
  const bonus = eventBonus(ev.id);
  const monthBonus = monthlyEventBonus(monthlyEventForDate().id);
  const priceOf = (c: (typeof CHESTS)[number]) => Math.max(1, Math.round(c.cost * bonus.chestPriceMul));

  const chest = CHESTS.find((c) => c.id === opening);
  const picked = TOWER_BY_ID[fragPick];
  const unit = FRAG_PRICE[picked.rarity];
  const fragCost = unit * fragQty;

  const tryBuy = (id: string) => {
    const c = CHESTS.find((x) => x.id === id)!;
    const cost = priceOf(c);
    if (c.gem === 1 ? save.gems < cost : save.gold < cost) {
      sfx.error();
      push(c.gem === 1 ? "Not enough gems" : "Not enough gold", "#ff5c70");
      return;
    }
    sfx.chest();
    mutate((s) => {
      if (c.gem === 1) s.gems -= cost;
      else s.gold -= cost;
      bumpQuest(s, "chests", 1);
      bumpTask(s, "chests", 1);
      if (c.gem !== 1) bumpTask(s, "spend", cost);
    });
    setOpening(id);
    setStage("closed");
    setLoot(null);
    setTimeout(() => setStage("shaking"), 500);
  };

  const buyFrags = () => {
    if (save.gold < fragCost) {
      sfx.error();
      push(`Need ${fragCost} gold`, "#ff5c70");
      return;
    }
    sfx.buy();
    mutate((s) => {
      bumpTask(s, "spend", fragCost);
      s.gold -= fragCost;
      s.frags[picked.id] = (s.frags[picked.id] || 0) + fragQty;
    });
    push(`+${fragQty} ${picked.name} fragments`, RARITY[picked.rarity].color);
  };

  const GOLD_GEM_BATCH = 1000;
  const GOLD_PER_GEM = 5;
  const exchangeGoldForGems = () => {
    const cost = GOLD_GEM_BATCH * GOLD_PER_GEM;
    if (save.gold < cost) { sfx.error(); push(`Need ${cost.toLocaleString()} gold`, "#ff5c70"); return; }
    sfx.gem();
    mutate((s) => { s.gold -= cost; s.gems += GOLD_GEM_BATCH; bumpTask(s, "spend", cost); });
    push(`Exchanged ${cost.toLocaleString()} gold for ${GOLD_GEM_BATCH} gems`, "#8ceaff");
  };
  const exchangeGemsForGold = () => {
    if (save.gems < GOLD_GEM_BATCH) { sfx.error(); push(`Need ${GOLD_GEM_BATCH} gems`, "#ff5c70"); return; }
    sfx.coin();
    mutate((s) => { s.gems -= GOLD_GEM_BATCH; s.gold += GOLD_GEM_BATCH * GOLD_PER_GEM; });
    push(`Exchanged ${GOLD_GEM_BATCH} gems for ${(GOLD_GEM_BATCH * GOLD_PER_GEM).toLocaleString()} gold`, "#ffd977");
  };

  const buyTokens = (tokens: number, gems: number) => {
    if (save.gems < gems) {
      sfx.error();
      push("Not enough gems", "#ff5c70");
      return;
    }
    sfx.token();
    mutate((s) => {
      s.gems -= gems;
      s.tokens += tokens;
    });
    push(`+${tokens} Magic Tokens`, "#b6a0ff");
  };

  /** roll + bank the chest, then hand the exact loot to the claim animation */
  const smash = () => {
    if (!chest) return;
    const rolled = rollChest(chest.id, bonus.chestFragBonus + monthBonus.chestFragBonus, bonus.fragBias + monthBonus.fragBias);
    setLoot(rolled);
    setStage("reward");
    sfx.gem();
    mutate((s) => grantLoot(s, rolled));
    setClaim({
      title: chest.name.toUpperCase(),
      subtitle: bonus.chestPriceMul < 1 ? `${ev.name} discount applied` : chest.blurb,
      color: chest.color,
      chest: true,
      lines: lootLines(rolled),
    });
  };

  const legendaries = TOWERS.filter((t) => t.rarity === "legendary");

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto scroll-thin pr-1">
      <div>
        <div className="font-disp text-2xl text-[#ffd977]">Shop</div>
        <p className="text-sm font-semibold text-[var(--dim)]">
          Open chests for random rewards, trade gold for the fragments you actually need, or burn gems on Magic Tokens.
        </p>
      </div>

      {/* live event banner */}
      <div className="tile event-card live flex flex-wrap items-center gap-3 p-3" style={{ borderColor: ev.color + "77" }}>
        <span className="live-dot shrink-0" style={{ background: ev.color }} />
        <div className="min-w-[180px] flex-1">
          <div className="font-disp text-base leading-none" style={{ color: ev.color }}>
            {ev.name}
          </div>
          <div className="text-[11.5px] font-semibold text-[var(--dim)]">{ev.perk}</div>
        </div>
        {bonus.chestPriceMul < 1 && (
          <span className="pill-dark text-[11px] text-[#5cffaa]">-{Math.round((1 - bonus.chestPriceMul) * 100)}% ON ALL CHESTS</span>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">CHESTS</div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {CHESTS.map((c, i) => {
            const cost = priceOf(c);
            const afford = c.gem === 1 ? save.gems >= cost : save.gold >= cost;
            const discounted = cost < c.cost;
            return (
              <div
                key={c.id}
                className="tile tile-hover anim-pop relative flex flex-col items-center p-4"
                style={{ animationDelay: `${i * 60}ms`, borderColor: c.color + "66" }}
                data-chest={c.id}
              >
                {discounted && (
                  <span className="badge-num absolute -right-1.5 -top-1.5" style={{ borderColor: "#5cffaa", color: "#5cffaa" }}>
                    SALE
                  </span>
                )}
                <ClaimChest color={c.color} size={88} stage="shut" />
                <div className="font-disp mt-1 text-center text-base" style={{ color: c.color }}>
                  {c.name}
                </div>
                <div className="mt-0.5 text-center text-[11px] font-bold text-[var(--dim)]">{c.blurb}</div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[10.5px] font-bold text-[var(--dim)]">
                  {c.gold[1] > 0 && <span className="text-[#ffd977]">{c.gold[0]}–{c.gold[1]}g</span>}
                  {c.special === "mystical" && <span className="text-[#ff315c]">65% · 5 Legendary / 35% · 1 Mystical</span>}
                  {c.frags[1] > 0 && (
                    <span>
                      · {c.frags[0]}–{c.frags[1]} frags
                    </span>
                  )}
                  {c.chips?.map((ch) => (
                    <span key={ch.id} className="inline-flex items-center gap-0.5">
                      · <ChipIcon id={ch.id} size={13} />
                      {ch.min}–{ch.max}
                    </span>
                  ))}
                  {c.heroShards && (
                    <span className="inline-flex items-center gap-0.5">
                      · <ShardIcon size={13} />
                      {c.heroShards[0]}–{c.heroShards[1]} shards
                    </span>
                  )}
                </div>
                <button className={`btn mt-3 w-full py-2 text-sm ${afford ? "btn-gold" : ""}`} disabled={!afford} onClick={() => tryBuy(c.id)}>
                  <span className="inline-flex items-center gap-1.5">
                    {c.gem === 1 ? <GemIcon size={15} /> : <CoinIcon size={15} />}
                    {cost.toLocaleString()}
                    {discounted && <s className="text-[10px] opacity-60">{c.cost.toLocaleString()}</s>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHIP MODULES */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">CHIP MODULES</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHIPS.map((c) => (
            <div key={c.id} className="tile flex items-center gap-3 p-3" style={{ borderColor: c.color + "44" }}>
              <ChipIcon id={c.id} size={34} />
              <div className="min-w-0 flex-1">
                <div className="font-disp text-[15px]" style={{ color: c.color }}>
                  {c.name}
                </div>
                <div className="text-[11px] font-semibold leading-snug text-[var(--dim)]">{c.desc}</div>
              </div>
              <span className="font-disp shrink-0 text-xl" style={{ color: c.color }}>
                {save.chips[c.id] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* HERO SHARDS */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">HERO SHARDS</div>
        <div className="tile flex flex-wrap gap-2 p-3">
          {Object.values(HERO_BY_ID).map((h) => (
            <span key={h.id} className="pill-dark text-[11px]" style={{ borderColor: h.color + "55", color: h.color }}>
              <ShardIcon size={15} color={h.color} />
              {h.name} <span className="num">{save.heroShards[h.id] || 0}</span>
            </span>
          ))}
          <span className="w-full text-[11px] font-semibold text-[var(--dim)]">
            Heroes Chests drop shards. Spend them on the Command Center to level a hero without gold.
          </span>
        </div>
      </div>

      {/* FRAGMENT EXCHANGE */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">FRAGMENT EXCHANGE</div>
          <div className="flex items-center gap-1">
            {[1, 5].map((q) => (
              <button
                key={q}
                className={`toggle ${fragQty === q ? "on" : ""}`}
                onClick={() => {
                  sfx.click();
                  setFragQty(q as 1 | 5);
                }}
              >
                ×{q}
              </button>
            ))}
          </div>
        </div>
        <div className="tile p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TOWERS.filter((t) => t.rarity !== "mystical").map((t) => {
              const on = t.id === fragPick;
              const rc = RARITY[t.rarity];
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    sfx.click();
                    setFragPick(t.id);
                  }}
                  className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition"
                  style={{
                    borderColor: on ? rc.color : "var(--line)",
                    background: on ? rc.color + "22" : "rgba(8,5,26,0.4)",
                  }}
                >
                  <TowerIcon def={t} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold" style={{ color: rc.color }}>{t.name}</div>
                    <div className="text-[10px] font-bold text-[var(--dim)]">
                      <span className="text-[#ffd977]">{FRAG_PRICE[t.rarity]}</span>g · have {save.frags[t.id] || 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <TowerIcon def={picked} size={40} />
              <div>
                <div className="font-disp text-base" style={{ color: RARITY[picked.rarity].color }}>
                  {picked.name} × {fragQty}
                </div>
                <div className="text-[11px] font-bold text-[var(--dim)]">
                  {FRAG_PRICE[picked.rarity]} gold each · unlocks at {picked.unlockFrags} fragments
                </div>
              </div>
            </div>
            <button
              className={`btn px-5 py-2 text-[13px] ${save.gold >= fragCost ? "btn-gold" : ""}`}
              disabled={save.gold < fragCost}
              onClick={buyFrags}
            >
              <span className="inline-flex items-center gap-1.5"><CoinIcon size={14} /> {fragCost}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GOLD ↔ GEM EXCHANGE */}
      <div data-testid="gold-gem-exchange">
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">GOLD ↔ GEM EXCHANGE</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="tile flex items-center justify-between gap-3 p-4">
            <div><div className="font-disp text-base text-[#8ceaff]">1,000 Gems</div><div className="text-[11px] font-semibold text-[var(--dim)]">Trade 5,000 gold · 5 gold per gem</div></div>
            <button className={`btn flex items-center gap-1.5 px-3 py-2 text-xs ${save.gold >= 5000 ? "btn-cyan" : ""}`} disabled={save.gold < 5000} onClick={exchangeGoldForGems}><CoinIcon size={14} /> 5,000 → 1,000 <GemIcon size={14} /></button>
          </div>
          <div className="tile flex items-center justify-between gap-3 p-4">
            <div><div className="font-disp text-base text-[#ffd977]">5,000 Gold</div><div className="text-[11px] font-semibold text-[var(--dim)]">Trade 1,000 gems · 5 gold per gem</div></div>
            <button className={`btn flex items-center gap-1.5 px-3 py-2 text-xs ${save.gems >= 1000 ? "btn-gold" : ""}`} disabled={save.gems < 1000} onClick={exchangeGemsForGold}><GemIcon size={14} /> 1,000 → 5,000 <CoinIcon size={14} /></button>
          </div>
        </div>
      </div>

      {/* TOKEN EXCHANGE */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">MAGIC TOKEN EXCHANGE</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TOKEN_PACKS.map((p) => {
            const afford = save.gems >= p.gems;
            return (
              <div key={p.tokens} className="tile flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <TokenIcon size={30} />
                  <div>
                    <div className="font-disp text-lg text-[#b6a0ff]">×{p.tokens}</div>
                    <div className="text-[11px] font-bold text-[var(--dim)]">Magic Tokens</div>
                  </div>
                </div>
                <button
                  className={`btn flex items-center gap-1.5 px-4 py-2 text-[13px] ${afford ? "btn-cyan" : ""}`}
                  disabled={!afford}
                  onClick={() => buyTokens(p.tokens, p.gems)}
                >
                  <GemIcon size={14} /> {p.gems}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--dim)]">
          Tokens fuel awakenings in the Towers tab. Earn gems in Battle and Endless runs.
        </p>
      </div>

      {/* LEGENDARY VAULT */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">LEGENDARY VAULT</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {legendaries.map((t) => (
            <div key={t.id} className="tile tile-hover flex flex-col items-center p-3" style={{ borderColor: RARITY.legendary.color + "55" }}>
              <TowerIcon def={t} size={64} locked={(save.levels[t.id] || 0) === 0} />
              <div className="font-disp mt-1 text-center text-[14px] text-[#ffc457]">{t.name}</div>
              <p className="mt-1 line-clamp-3 text-center text-[11px] font-semibold text-[var(--dim)]">{t.desc}</p>
              <div className="mt-2 text-[11px] font-bold text-[var(--dim)]">
                {(save.levels[t.id] || 0) > 0 ? `OWNED · Lv ${save.levels[t.id]}` : `Needs ${t.unlockFrags} frags (${save.frags[t.id] || 0})`}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--dim)]">
          Buy legendary fragments above, or crack Legendary Chests for a chance at one.
        </p>
      </div>
      <div className="h-2 shrink-0" />

      {chest && !claim && (
        <Modal w={420} onClose={stage === "reward" ? () => setOpening(null) : undefined}>
          <div className="flex flex-col items-center">
            <div className="font-disp text-2xl" style={{ color: chest.color }}>
              {chest.name}
            </div>
            <div className="my-4">
              <ClaimChest color={chest.color} size={150} stage={stage === "shaking" ? "shake" : "shut"} />
            </div>
            <button className="btn btn-gold px-8 py-2.5" disabled={stage !== "shaking"} onClick={smash}>
              {stage === "shaking" ? "Smash Open!" : "Warming up..."}
            </button>
          </div>
        </Modal>
      )}

      {claim && (
        <RewardClaim
          data={claim}
          onClose={() => {
            setClaim(null);
            setOpening(null);
            setLoot(null);
            sfx.coin();
            if (loot) push(`Banked ${lootLines(loot).length} reward${lootLines(loot).length === 1 ? "" : "s"}`, chest?.color || "#ffd977");
          }}
        />
      )}
    </div>
  );
}
