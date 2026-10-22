import { useState } from "react";
import { SEASON_LENGTH_DAYS, SEASON_TIERS, SEASON_POINTS_PER_TROPHY, SEASON_POINTS_PER_WIN, seasonNumber, seasonProgress } from "../game/data";
import {
  claimSeasonTier,
  cloneSave,
  lootLines,
  seasonPointsFor,
  seasonReady,
  seasonTier,
  type SaveData,
} from "../game/save";
import { sfx } from "../game/audio";
import { ChipIcon, CoinIcon, GemIcon, RewardClaim, TokenIcon, TrophyIcon, type ClaimData } from "../components/ui";

/** days / hours left in the current 30-day season, for the header countdown */
function seasonClock(now = Date.now()) {
  const left = (1 - seasonProgress(now)) * SEASON_LENGTH_DAYS * 86400000;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return { d, h, m };
}

/**
 * The season track.
 *
 * Season points are derived, not stored: trophies ×1 plus wins ×12, recomputed
 * every render. Only the claimed tiers live in the save, so the track can never
 * drift out of sync with the ladder it is built from.
 */
export default function Season({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [claim, setClaim] = useState<ClaimData | null>(null);

  const points = seasonPointsFor(save);
  const tier = seasonTier(save);
  const ready = seasonReady(save);
  const num = seasonNumber();
  const clock = seasonClock();
  const next = SEASON_TIERS[tier + 1];
  const intoPct = next
    ? Math.max(0, Math.min(1, (points - SEASON_TIERS[tier < 0 ? 0 : tier].at) / (next.at - SEASON_TIERS[tier < 0 ? 0 : tier].at)))
    : 1;

  const take = (idx: number) => {
    const t = SEASON_TIERS[idx];
    if (!t) return;
    if (save.season.number !== num) {
      sfx.error();
      push("That season has closed", "#ff4d5e");
      return;
    }
    const claimed = save.season.claimed.includes(idx);
    if (claimed || idx > tier) {
      sfx.error();
      push(claimed ? "Tier already collected" : "Tier not reached yet", "#ff4d5e");
      return;
    }
    // roll on a draft so the crate's contents are ready for the reward card,
    // then commit through mutate — claimSeasonTier guards the real write
    const draft = cloneSave(save);
    const loot = claimSeasonTier(draft, idx);
    if (!loot) {
      sfx.error();
      return push("Those rewards are already banked", "#ff4d5e");
    }
    mutate((s) => {
      claimSeasonTier(s, idx);
    });
    sfx.chest();
    setClaim({
      title: t.name.toUpperCase(),
      subtitle: `Season ${num} · tier ${idx + 1}`,
      lines: lootLines(loot),
      color: t.color,
      chest: false,
    });
    push(`${t.name} rewards collected`, t.color);
  };

  const takeAll = () => {
    if (!ready) {
      sfx.error();
      push("No crates ready", "#ff4d5e");
      return;
    }
    const draft = cloneSave(save);
    let n = 0;
    for (let i = 0; i <= tier; i++) if (claimSeasonTier(draft, i)) n++;
    mutate((s) => {
      for (let i = 0; i <= tier; i++) claimSeasonTier(s, i);
    });
    sfx.chestCrack();
    push(`${n} season crate${n === 1 ? "" : "s"} collected`, "#ffcf4d");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* ---- header: season number, countdown, progress ---- */}
      <div className="panel shrink-0 p-4" style={{ borderColor: "rgba(255,79,216,0.45)" }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.32em] text-[#ff9be9]">RIFT SEASON</div>
            <div className="font-disp text-3xl leading-none text-[#ff4fd8]" style={{ textShadow: "0 0 24px rgba(255,79,216,.5)" }}>
              SEASON <span className="num">{num}</span>
            </div>
            <div className="mt-1 text-[12px] font-semibold text-[var(--dim)]">
              Ends in <b className="num text-[#ffcf4d]">{clock.d}d {clock.h}h {clock.m}m</b> · trophies and wins feed the track
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.24em] text-[var(--dim)]">SEASON POINTS</div>
            <div className="font-disp text-3xl leading-none text-[#35e0ff]" data-testid="season-points">
              <span className="num">{points.toLocaleString("en-US")}</span>
            </div>
            <div className="text-[11px] font-semibold text-[var(--dim)]">
              <TrophyIcon size={13} /> <span className="num">{save.trophies}</span> × {SEASON_POINTS_PER_TROPHY} +{" "}
              <span className="num">{save.wins}</span> wins × {SEASON_POINTS_PER_WIN}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
            <span style={{ color: tier >= 0 ? SEASON_TIERS[tier].color : "var(--dim)" }} data-testid="season-tier-name">
              {tier >= 0 ? SEASON_TIERS[tier].name.toUpperCase() : "UNRANKED"}
            </span>
            <span className="text-[var(--dim)]">
              {next ? (
                <>
                  <span className="num">{Math.max(0, next.at - points)}</span> points to {next.name}
                </>
              ) : (
                "TRACK COMPLETE"
              )}
            </span>
          </div>
          <div className="season-track">
            <div className="season-track-fill" style={{ width: `${Math.round(intoPct * 100)}%` }} />
            {SEASON_TIERS.map((t, i) => (
              <span
                key={t.at}
                className={`season-tick ${i <= tier ? "on" : ""}`}
                style={{ left: `${(t.at / SEASON_TIERS[SEASON_TIERS.length - 1].at) * 100}%`, color: t.color }}
                title={`${t.name} · ${t.at}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11.5px] font-semibold text-[var(--dim)]">
            <span className="num" style={{ color: ready ? "#8effc4" : "var(--dim)" }}>{ready}</span> crate
            {ready === 1 ? "" : "s"} waiting
          </div>
          <button className={`btn px-4 py-2 text-[12.5px] ${ready ? "btn-cyan" : ""}`} data-testid="season-claim-all" disabled={!ready} onClick={takeAll}>
            COLLECT READY
          </button>
        </div>
      </div>

      {/* ---- the track itself, tier by tier ---- */}
      <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto scroll-thin pr-1 sm:grid-cols-2 xl:grid-cols-3" data-testid="season-tiers">
        {SEASON_TIERS.map((t, i) => {
          const claimed = save.season.claimed.includes(i) && save.season.number === num;
          const reached = i <= tier;
          return (
            <div
              key={t.at}
              data-tier={i}
              data-ready={reached && !claimed ? "1" : "0"}
              className={`season-tier ${reached ? "on" : ""} ${claimed ? "done" : ""}`}
              style={{ borderColor: reached ? t.color : undefined }}
            >
              <div className="flex items-center justify-between">
                <span className="season-tier-i num" style={{ color: t.color }}>
                  {i + 1}
                </span>
                <span className="season-tier-need num">{t.at} pts</span>
              </div>
              <div className="season-tier-name" style={{ color: reached ? t.color : "var(--dim)" }}>
                {t.name}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-bold">
                {!!t.gold && (
                  <span className="inline-flex items-center gap-1 text-[#ffcf4d]">
                    <CoinIcon size={13} /> <span className="num">{t.gold.toLocaleString("en-US")}</span>
                  </span>
                )}
                {!!t.gems && (
                  <span className="inline-flex items-center gap-1 text-[#35e0ff]">
                    <GemIcon size={13} /> <span className="num">{t.gems}</span>
                  </span>
                )}
                {!!t.tokens && (
                  <span className="inline-flex items-center gap-1 text-[#ff4fd8]">
                    <TokenIcon size={13} /> <span className="num">{t.tokens}</span>
                  </span>
                )}
                {!!t.chips && (
                  <span className="inline-flex items-center gap-1 text-[#8fe9ff]">
                    <ChipIcon size={13} /> <span className="num">{t.chips}</span>
                  </span>
                )}
                {!!t.frags && (
                  <span className="text-[#c9a7ff]">
                    <span className="num">{t.frags}</span> frags
                  </span>
                )}
              </div>
              <button
                className={`mt-2 w-full rounded-lg px-2 py-1.5 text-[11.5px] font-bold uppercase tracking-wide transition ${
                  reached && !claimed ? "cta-banner" : "btn"
                }`}
                data-testid={`season-tier-${i}`}
                disabled={!reached || claimed}
                onClick={() => take(i)}
              >
                {claimed ? "COLLECTED" : reached ? "COLLECT" : <span className="num">LOCKED · {t.at} PTS</span>}
              </button>
            </div>
          );
        })}
      </div>

      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </div>
  );
}
