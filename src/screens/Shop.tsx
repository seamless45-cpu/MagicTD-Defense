import { useState } from "react";
import type { SaveData } from "../game/save";
import { randFrag } from "../game/save";
import { sfx } from "../game/audio";
import { CHESTS, TOWERS, TOWER_BY_ID } from "../game/data";
import { CoinIcon, GemIcon, Modal, TokenIcon, TowerIcon } from "../components/ui";
import { ChestSVG } from "./Menus";

interface Reward {
  gold: number;
  gems: number;
  tokens: number;
  frags: { id: string; n: number }[];
}

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

  const chest = CHESTS.find((c) => c.id === opening);

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

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto scroll-thin pr-1">
      <div>
        <div className="font-disp text-2xl text-[#ffcf4d]">Shop</div>
        <p className="text-sm font-semibold text-[var(--dim)]">Open chests for fragments & gold. Fragments unlock and upgrade towers.</p>
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

      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">GEMS & GOLD</div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { n: "Pouch of Gold", amt: "1,500", p: "200" },
            { n: "Gold Hoard", amt: "10,000", p: "1,200" },
            { n: "Gem Cluster", amt: "50", p: "400" },
            { n: "Vault Pass", amt: "10,000 + 100", p: "1,000" },
          ].map((p) => (
            <div key={p.n} className="panel relative flex flex-col items-center overflow-hidden p-4 opacity-80">
              <div className="flex items-center gap-2">
                {p.amt.includes("50") || p.n === "Vault Pass" ? <GemIcon size={30} /> : <CoinIcon size={30} />}
              </div>
              <div className="font-disp mt-1 text-base text-[var(--txt)]">{p.n}</div>
              <div className="text-sm font-bold text-[var(--dim)]">{p.amt}</div>
              <button
                className="btn mt-3 w-full py-2 text-sm"
                onClick={() => { sfx.error(); push("Store integration coming soon", "#ff4d5e"); }}
              >
                ${p.p}
              </button>
              <span className="pointer-events-none absolute right-2 top-2 rotate-12 rounded border border-[var(--line2)] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-[var(--dim)]">
                PLACEHOLDER
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold tracking-[0.25em] text-[var(--cyan)]">LEGENDARY TOWERS</div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TOWERS.filter((t) => t.rarity === "legendary").map((t) => (
            <div key={t.id} className="panel relative flex flex-col items-center p-4 opacity-80">
              <TowerIcon def={t} size={72} locked />
              <div className="font-disp mt-1 text-base text-[#ffb324]">{t.name}</div>
              <p className="mt-1 line-clamp-3 text-center text-xs font-semibold text-[var(--dim)]">{t.desc}</p>
              <button
                className="btn mt-3 w-full py-2 text-sm"
                onClick={() => { sfx.error(); push("Legendary tower sales coming soon", "#ff4d5e"); }}
              >
                Coming Soon
              </button>
              <span className="pointer-events-none absolute right-2 top-2 rotate-12 rounded border border-[var(--line2)] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-[var(--dim)]">
                PLACEHOLDER
              </span>
            </div>
          ))}
        </div>
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
