import { useState } from "react";
import type { SaveData } from "../game/save";
import { randFrag } from "../game/save";
import { sfx } from "../game/audio";
import { CHESTS, TOWERS, TOWER_BY_ID, RARITY, type Rarity } from "../game/data";
import { CoinIcon, GemIcon, Modal, TokenIcon, TowerIcon } from "../components/ui";
import { ChestSVG } from "./Menus";

interface Reward {
  gold: number;
  gems: number;
  tokens: number;
  frags: { id: string; n: number }[];
}

/** gold price of one fragment of each rarity */
const FRAG_PRICE: Record<Rarity, number> = { normal: 120, decent: 320, epic: 750, legendary: 1400 };

const TOKEN_PACKS = [
  { tokens: 1, gems: 1 },
  { tokens: 5, gems: 4 },
  { tokens: 12, gems: 9 },
];

function rollReward(chestId: string): Reward {
  const c = CHESTS.find((x) => x.id === chestId)!;
  const gold = c.gold[0] + Math.floor(Math.random() * (c.gold[1] - c.gold[0]));
  const nFrags = c.frags[0] + Math.floor(Math.random() * (c.frags[1] - c.frags[0] + 1));
  const frags: { id: string; n: number }[] = [];
  for (let i = 0; i < nFrags; i++) {
    const id = randFrag(c.id === "legendary" ? 1 : c.id === "epic" ? 0.45 : c.id === "silver" ? 0.15 : 0);
    const ex = frags.find((f) => f.id === id);
    if (ex) ex.n++;
    else frags.push({ id, n: 1 });
  }
  let gems = 0;
  let tokens = 0;
  if (c.id === "epic" && Math.random() < 0.25) gems = 1;
  if (c.id === "legendary") {
    if (Math.random() < 0.6) gems = 1 + (Math.random() < 0.4 ? 1 : 0);
    if (Math.random() < 0.3) tokens = 1;
  }
  return { gold, gems, tokens, frags };
}

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
  const [reward, setReward] = useState<Reward | null>(null);
  const [fragPick, setFragPick] = useState<string>(TOWERS[0].id);
  const [fragQty, setFragQty] = useState<1 | 5>(1);

  const chest = CHESTS.find((c) => c.id === opening);
  const picked = TOWER_BY_ID[fragPick];
  const unit = FRAG_PRICE[picked.rarity];
  const fragCost = unit * fragQty;

  const tryBuy = (id: string) => {
    const c = CHESTS.find((x) => x.id === id)!;
    if (c.gem === 1 ? save.gems < c.cost : save.gold < c.cost) {
      sfx.error();
      push(c.gem === 1 ? "Not enough gems" : "Not enough gold", "#ff4d5e");
      return;
    }
    sfx.chest();
    mutate((s) => {
      if (c.gem === 1) s.gems -= c.cost;
      else s.gold -= c.cost;
    });
    setOpening(id);
    setStage("closed");
    setReward(null);
    setTimeout(() => setStage("shaking"), 500);
  };

  const buyFrags = () => {
    if (save.gold < fragCost) {
      sfx.error();
      push(`Need ${fragCost} gold`, "#ff4d5e");
      return;
    }
    sfx.buy();
    mutate((s) => {
      s.gold -= fragCost;
      s.frags[picked.id] = (s.frags[picked.id] || 0) + fragQty;
    });
    push(`+${fragQty} ${picked.name} fragments`, RARITY[picked.rarity].color);
  };

  const buyTokens = (tokens: number, gems: number) => {
    if (save.gems < gems) {
      sfx.error();
      push("Not enough gems", "#ff4d5e");
      return;
    }
    sfx.token();
    mutate((s) => {
      s.gems -= gems;
      s.tokens += tokens;
    });
    push(`+${tokens} Magic Tokens`, "#ff4fd8");
  };

  const collect = () => {
    if (!reward) return;
    mutate((s) => {
      s.gold += reward.gold;
      s.gems += reward.gems;
      s.tokens += reward.tokens;
      reward.frags.forEach((f) => {
        s.frags[f.id] = (s.frags[f.id] || 0) + f.n;
      });
    });
    sfx.coin();
    push(
      `+${reward.gold} gold` +
        (reward.gems ? ` · +${reward.gems} gems` : "") +
        (reward.tokens ? ` · +${reward.tokens} tokens` : "") +
        ` · ${reward.frags.length} frag${reward.frags.length > 1 ? "s" : ""}`,
      "#ffcf4d"
    );
    setOpening(null);
  };

  const legendaries = TOWERS.filter((t) => t.rarity === "legendary");

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto scroll-thin pr-1">
      <div>
        <div className="font-disp text-2xl text-[#ffcf4d]">Shop</div>
        <p className="text-sm font-semibold text-[var(--dim)]">
          Open chests for random rewards, trade gold for the fragments you actually need, or burn gems on Magic Tokens.
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">CHESTS</div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CHESTS.map((c, i) => {
            const afford = c.gem === 1 ? save.gems >= c.cost : save.gold >= c.cost;
            return (
              <div key={c.id} className="panel anim-pop flex flex-col items-center p-4" style={{ animationDelay: `${i * 60}ms`, borderColor: c.color + "66" }}>
                <ChestSVG color={c.color} size={92} />
                <div className="font-disp mt-1 text-base" style={{ color: c.color }}>{c.name}</div>
                <div className="mt-0.5 h-4 text-xs font-bold text-[var(--dim)]">
                  {c.gold[0]}–{c.gold[1]}g · {c.frags[0]}–{c.frags[1]} frags
                </div>
                <button
                  className={`btn mt-3 w-full py-2 text-sm ${afford ? "btn-gold" : ""}`}
                  disabled={!afford}
                  onClick={() => tryBuy(c.id)}
                >
                  {c.gem === 1 ? (
                    <span className="inline-flex items-center gap-1.5"><GemIcon size={15} /> {c.cost}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5"><CoinIcon size={15} /> {c.cost}</span>
                  )}
                </button>
              </div>
            );
          })}
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
        <div className="panel p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TOWERS.map((t) => {
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
                      <span className="text-[#ffcf4d]">{FRAG_PRICE[t.rarity]}</span>g · have {save.frags[t.id] || 0}
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

      {/* TOKEN EXCHANGE */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">MAGIC TOKEN EXCHANGE</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TOKEN_PACKS.map((p) => {
            const afford = save.gems >= p.gems;
            return (
              <div key={p.tokens} className="panel flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <TokenIcon size={30} />
                  <div>
                    <div className="font-disp text-lg text-[#ff4fd8]">×{p.tokens}</div>
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
          Tokens fuel awakenings in the Towers tab. Earn gems in Battle, Party and Endless runs.
        </p>
      </div>

      {/* LEGENDARY VAULT */}
      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">LEGENDARY VAULT</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {legendaries.map((t) => (
            <div key={t.id} className="panel flex flex-col items-center p-3" style={{ borderColor: RARITY.legendary.color + "55" }}>
              <TowerIcon def={t} size={64} locked={(save.levels[t.id] || 0) === 0} />
              <div className="font-disp mt-1 text-center text-[14px] text-[#ffb324]">{t.name}</div>
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

      {chest && (
        <Modal w={420} onClose={stage === "reward" ? () => setOpening(null) : undefined}>
          <div className="flex flex-col items-center">
            <div className="font-disp text-2xl" style={{ color: chest.color }}>{chest.name}</div>
            {stage !== "reward" ? (
              <>
                <div className="my-4" style={stage === "shaking" ? { animation: "shake 0.28s ease infinite" } : undefined}>
                  <ChestSVG color={chest.color} size={150} />
                </div>
                <button
                  className="btn btn-gold px-8 py-2.5"
                  disabled={stage !== "shaking"}
                  onClick={() => {
                    setReward(rollReward(chest.id));
                    setStage("reward");
                    sfx.gem();
                  }}
                >
                  {stage === "shaking" ? "Smash Open!" : "Warming up..."}
                </button>
              </>
            ) : (
              reward && (
                <div className="anim-pop mt-3 w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {reward.gold > 0 && (
                      <span className="chip text-lg text-[#ffcf4d]"><CoinIcon /> +{reward.gold}</span>
                    )}
                    {reward.gems > 0 && (
                      <span className="chip text-lg text-[#35e0ff]"><GemIcon /> +{reward.gems}</span>
                    )}
                    {reward.tokens > 0 && (
                      <span className="chip text-lg text-[#ff4fd8]"><TokenIcon /> +{reward.tokens}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {reward.frags.map((f) => (
                      <div key={f.id} className="chip">
                        <TowerIcon def={TOWER_BY_ID[f.id]} size={26} />
                        <span className="text-[13px]">{TOWER_BY_ID[f.id].name} ×{f.n}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-gold mt-4 w-full py-2.5" onClick={collect}>
                    Collect
                  </button>
                  <button className="btn mt-2 w-full py-2 text-sm" onClick={() => setOpening(null)}>
                    Close
                  </button>
                </div>
              )
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
