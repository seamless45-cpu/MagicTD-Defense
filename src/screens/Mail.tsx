import { useMemo, useState } from "react";
import { MAIL_KIND } from "../game/data";
import {
  claimAllMail,
  claimMail,
  cloneSave,
  deleteMail,
  inbox,
  lootLines,
  mailItem,
  openMail,
  unclaimedMail,
  type SaveData,
} from "../game/save";
import { sfx } from "../game/audio";
import { RewardClaim, CoinIcon, GemIcon, TokenIcon, ChipIcon, type ClaimData } from "../components/ui";

/**
 * The mailbox.
 *
 * Messages are static rows in `data.ts`; the save only remembers which ones have
 * been read, which attachments were taken, and which were thrown away. That
 * means a new message ships by adding a row — nothing here needs to change.
 */
export default function Mail({
  save,
  mutate,
  push,
}: {
  save: SaveData;
  mutate: (fn: (s: SaveData) => void) => void;
  push: (m: string, c?: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimData | null>(null);

  const messages = useMemo(() => inbox(save), [save]);
  const ready = useMemo(() => unclaimedMail(save), [save]);

  const read = (id: string) => {
    sfx.click();
    const wasRead = save.mail.read.includes(id);
    setOpen(id);
    if (!wasRead) mutate((s) => openMail(s, id));
  };

  const doClaim = (id: string) => {
    const m = mailItem(save, id);
    if (!m || !ready.includes(id)) return;
    // roll on a draft so the loot is ready synchronously for the reward card,
    // then commit through mutate — the claimed-guard does the real work
    const draft = cloneSave(save);
    const loot = claimMail(draft, id);
    if (!loot) {
      sfx.error();
      return push("Nothing to collect here", "#ff4d5e");
    }
    mutate((s) => {
      claimMail(s, id);
    });
    sfx.chest();
    setClaim({
      title: m.subject.toUpperCase(),
      subtitle: `From ${m.from}`,
      lines: lootLines(loot),
      color: m.color,
      chest: false,
    });
    push("Attachment collected", m.color);
  };

  const doClaimAll = () => {
    if (!ready.length) {
      sfx.error();
      push("Nothing to collect", "#ff4d5e");
      return;
    }
    const draft = cloneSave(save);
    const loot = claimAllMail(draft);
    if (!loot) {
      sfx.error();
      return push("Nothing to collect", "#ff4d5e");
    }
    mutate((s) => {
      claimAllMail(s);
    });
    sfx.chestCrack();
    setClaim({
      title: "ALL ATTACHMENTS",
      subtitle: `${ready.length} message${ready.length === 1 ? "" : "s"} cleared`,
      lines: lootLines(loot),
      color: "#ffcf4d",
    });
  };

  const doDelete = (id: string) => {
    sfx.click();
    mutate((s) => deleteMail(s, id));
    if (open === id) setOpen(null);
    push("Message deleted", "#8fb0ff");
  };

  const cur = open ? mailItem(save, open) : null;
  const curReady = cur ? ready.includes(cur.id) : false;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="panel flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderColor: "rgba(53,224,255,0.4)" }}>
        <div className="min-w-0">
          <div className="font-disp text-xl text-[#35e0ff]">MAILBOX</div>
          <div className="text-[12px] font-semibold text-[var(--dim)]">
            <span className="num">{messages.length}</span> messages ·{" "}
            <span className="num" style={{ color: ready.length ? "#8effc4" : "var(--dim)" }}>
              {ready.length}
            </span>{" "}
            attachments waiting
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`btn px-4 py-2 text-[12.5px] ${ready.length ? "btn-cyan" : ""}`}
            data-testid="mail-claim-all"
            disabled={!ready.length}
            onClick={doClaimAll}
          >
            COLLECT ALL {ready.length > 0 && <b className="num">· {ready.length}</b>}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---- list ---- */}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto scroll-thin pr-1" data-testid="mail-list">
          {messages.length === 0 && (
            <div className="panel px-4 py-6 text-center text-[13px] font-semibold text-[var(--dim)]">
              Inbox empty. The Watch will send word when something happens.
            </div>
          )}
          {[...messages].reverse().map((m) => {
            const kind = MAIL_KIND[m.kind];
            const isReady = ready.includes(m.id);
            const opened = save.mail.read.includes(m.id);
            const claimed = save.mail.claimed.includes(m.id);
            return (
              <div
                key={m.id}
                data-mail={m.id}
                data-ready={isReady ? "1" : "0"}
                className={`mail-row ${open === m.id ? "on" : ""} ${isReady ? "ready" : ""}`}
                style={{ borderColor: open === m.id ? m.color : undefined }}
                onClick={() => read(m.id)}
              >
                <span className="mail-row-glyph" style={{ borderColor: kind.color, color: kind.color }}>
                  {kind.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: kind.color }}>
                      {kind.label}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--line2)]">{m.age}</span>
                    {!opened && <span className="mail-dot" />}
                  </div>
                  <div className="truncate text-[14px] font-bold" style={{ color: opened ? "var(--txt)" : m.color }}>
                    {m.subject}
                  </div>
                  <div className="truncate text-[11.5px] font-semibold text-[var(--dim)]">{m.from}</div>
                </div>
                {isReady && <span className="mail-tag">REWARD</span>}
                {claimed && !isReady && <span className="mail-tag done">TAKEN</span>}
              </div>
            );
          })}
        </div>

        {/* ---- reader ---- */}
        <div className="panel flex min-h-0 flex-col p-4" style={{ borderColor: cur ? cur.color + "88" : undefined }}>
          {!cur ? (
            <div className="grid flex-1 place-items-center text-center text-[13px] font-semibold text-[var(--dim)]">
              Pick a message to read it.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <span className="mail-row-glyph" style={{ borderColor: MAIL_KIND[cur.kind].color, color: MAIL_KIND[cur.kind].color }}>
                  {MAIL_KIND[cur.kind].glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold tracking-[0.24em]" style={{ color: MAIL_KIND[cur.kind].color }}>
                    {MAIL_KIND[cur.kind].label} · {cur.age}
                  </div>
                  <div className="font-disp text-lg leading-tight" style={{ color: cur.color }}>
                    {cur.subject}
                  </div>
                  <div className="text-[11.5px] font-semibold text-[var(--dim)]">From {cur.from}</div>
                </div>
              </div>
              <p className="mt-3 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-[13px] font-semibold leading-snug text-[var(--txt)]/85">
                {cur.body}
              </p>

              {cur.reward && (
                <div className="mt-3 rounded-lg border border-[#ffcf4d55] bg-black/30 px-3 py-2">
                  <div className="text-[10px] font-bold tracking-[0.24em] text-[#ffcf4d]">ATTACHED</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] font-bold">
                    {!!cur.reward.gold && (
                      <span className="inline-flex items-center gap-1 text-[#ffcf4d]">
                        <CoinIcon size={15} /> <span className="num">{cur.reward.gold}</span>
                      </span>
                    )}
                    {!!cur.reward.gems && (
                      <span className="inline-flex items-center gap-1 text-[#35e0ff]">
                        <GemIcon size={15} /> <span className="num">{cur.reward.gems}</span>
                      </span>
                    )}
                    {!!cur.reward.tokens && (
                      <span className="inline-flex items-center gap-1 text-[#ff4fd8]">
                        <TokenIcon size={15} /> <span className="num">{cur.reward.tokens}</span>
                      </span>
                    )}
                    {!!cur.reward.chips && (
                      <span className="inline-flex items-center gap-1 text-[#8fe9ff]">
                        <ChipIcon size={15} /> <span className="num">{cur.reward.chips} modules</span>
                      </span>
                    )}
                    {!!cur.reward.frags && (
                      <span className="text-[#c9a7ff]">
                        <span className="num">{cur.reward.frags}</span> random tower fragments
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-4">
                {cur.reward ? (
                  <button
                    className={`btn flex-1 py-2 text-[13px] ${curReady ? "btn-gold" : ""}`}
                    data-testid="mail-claim"
                    disabled={!curReady}
                    onClick={() => doClaim(cur.id)}
                  >
                    {curReady ? "COLLECT" : "COLLECTED"}
                  </button>
                ) : (
                  <span className="flex-1 self-center text-[11.5px] font-semibold text-[var(--dim)]">
                    Nothing attached to this one.
                  </span>
                )}
                <button className="btn px-3 py-2 text-[12px]" onClick={() => doDelete(cur.id)} data-testid="mail-delete">
                  DELETE
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {claim && <RewardClaim data={claim} onClose={() => setClaim(null)} />}
    </div>
  );
}
