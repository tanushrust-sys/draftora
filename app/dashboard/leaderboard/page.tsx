'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crown, Flame, Medal, Sparkles, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

type LeaderboardFilter = 'weekly' | 'all_time' | 'suburb';

type LeaderboardRow = {
  userId: string;
  username: string;
  rank: number;
  xp: number;
  streak: number;
  level: number;
  isCurrentUser: boolean;
};

const WEEKLY_SPECIAL_MENTION_XP = 2000;

type LeaderboardResponse = {
  filter: LeaderboardFilter;
  requestedFilter: LeaderboardFilter;
  scopeLabel: string;
  weekStartISO: string;
  currentUserWeeklyXp: number;
  top: LeaderboardRow[];
  currentUser: LeaderboardRow | null;
  currentUserInTop50: boolean;
};

const TAB_LABELS: Record<Exclude<LeaderboardFilter, 'suburb'>, string> = {
  weekly: 'Weekly',
  all_time: 'All Time',
};

function rankTone(rank: number) {
  if (rank === 1) return { border: '#f9c74f', glow: 'rgba(249, 199, 79, 0.48)', bg: 'linear-gradient(145deg, #3b2c0a 0%, #7a5a12 42%, #c4912f 100%)' };
  if (rank === 2) return { border: '#d6dbe7', glow: 'rgba(214, 219, 231, 0.44)', bg: 'linear-gradient(145deg, #2a3140 0%, #53627f 48%, #c4cbde 100%)' };
  if (rank === 3) return { border: '#d39a5e', glow: 'rgba(211, 154, 94, 0.42)', bg: 'linear-gradient(145deg, #3b2718 0%, #744728 48%, #bd7f49 100%)' };
  return { border: 'var(--t-brd)', glow: 'transparent', bg: 'var(--t-card)' };
}

function avatarFromName(name: string) {
  return (name || 'U').slice(0, 1).toUpperCase();
}

export default function LeaderboardPage() {
  const { session, profile } = useAuth();
  const suburbLabel = (profile as { suburb?: string | null } | null)?.suburb?.trim() || 'Your Area';
  const [filter, setFilter] = useState<LeaderboardFilter>('weekly');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    setLoading(true);
    setError('');
    fetch(`/api/leaderboard?filter=${encodeURIComponent(filter)}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as LeaderboardResponse & { error?: string };
        if (!res.ok) throw new Error(payload.error || 'Could not load leaderboard.');
        return payload;
      })
      .then((payload) => {
        if (!alive) return;
        setData(payload);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Could not load leaderboard.');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [filter, session?.access_token]);

  const topThree = useMemo(() => (data?.top ?? []).filter((row) => row.rank <= 3), [data?.top]);
  const listRows = useMemo(() => (data?.top ?? []).filter((row) => row.rank >= 4), [data?.top]);
  const youOutsideTop = !!data?.currentUser && !data.currentUserInTop50 && data.currentUser.rank > 50;
  const showWeeklyMentions = (data?.filter ?? filter) === 'weekly';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', padding: 'clamp(0.95rem, 2.3vw, 1.8rem) clamp(0.78rem, 2.6vw, 2rem) 5rem' }}>
      <div style={{ maxWidth: 1220, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
        <section className="lb-hero">
          <div className="lb-hero-glow lb-hero-glow--a" />
          <div className="lb-hero-glow lb-hero-glow--b" />
          <div className="lb-hero-head">
            <div>
              <p className="lb-kicker">Competitive Arena</p>
              <h1 className="lb-title">Leaderboard</h1>
              <p className="lb-sub">Climb weekly, dominate all-time, and battle your local zone.</p>
            </div>
            <div className="lb-week-xp">
              <span>Weekly XP</span>
              <strong>{data?.currentUserWeeklyXp?.toLocaleString() ?? '0'}</strong>
            </div>
          </div>

          <div className="lb-tabs">
            {(Object.keys(TAB_LABELS) as Array<Exclude<LeaderboardFilter, 'suburb'>>).map((key) => (
              <button key={key} type="button" className="lb-tab" data-active={filter === key} onClick={() => setFilter(key)}>
                {TAB_LABELS[key]}
              </button>
            ))}
            <button type="button" className="lb-tab" data-active={filter === 'suburb'} onClick={() => setFilter('suburb')}>
              {suburbLabel}
            </button>
          </div>
        </section>

        {loading ? (
          <section className="lb-shell">
            <div className="lb-skeleton-grid">
              <div className="lb-skeleton lb-skeleton--hero" />
              <div className="lb-skeleton lb-skeleton--hero" />
              <div className="lb-skeleton lb-skeleton--hero" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="lb-skeleton lb-skeleton--row" />
            ))}
          </section>
        ) : error ? (
          <section className="lb-empty">
            <p>{error}</p>
          </section>
        ) : !data || data.top.length === 0 ? (
          <section className="lb-empty">
            <p>No leaderboard entries yet. Keep writing to claim your spot.</p>
          </section>
        ) : (
          <>
            <section className="lb-top3">
              {topThree.map((row) => {
                const tone = rankTone(row.rank);
                return (
                  <article key={row.userId} className={`lb-podium lb-podium--${row.rank}`} style={{ ['--lb-rank-border' as string]: tone.border, ['--lb-rank-glow' as string]: tone.glow, ['--lb-rank-bg' as string]: tone.bg }}>
                    <div className="lb-podium-rank">
                      {row.rank === 1 ? <Crown size={18} /> : row.rank === 2 ? <Medal size={18} /> : <Trophy size={18} />}
                      <span>#{row.rank}</span>
                    </div>
                    <div className="lb-podium-avatar">{avatarFromName(row.username)}</div>
                    <h3>{row.username}</h3>
                    {showWeeklyMentions && row.xp > WEEKLY_SPECIAL_MENTION_XP ? (
                      <span className="lb-special-mention">Special Mention</span>
                    ) : null}
                    <p>{row.xp.toLocaleString()} XP</p>
                    <div className="lb-podium-meta">
                      <span><Flame size={13} /> {row.streak}d</span>
                      <span><Zap size={13} /> Lv {row.level}</span>
                    </div>
                    {row.rank === 1 ? <span className="lb-legendary-shimmer" /> : null}
                  </article>
                );
              })}
            </section>

            <section className="lb-shell">
              <div className="lb-list-head">
                <h2>{data.scopeLabel} Rankings</h2>
                <span>Top 50</span>
              </div>
              {listRows.map((row, index) => (
                <article key={row.userId} className="lb-row" style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}>
                  <div className="lb-row-rank">#{row.rank}</div>
                  <div className="lb-row-user">
                    <span className="lb-row-avatar">{avatarFromName(row.username)}</span>
                    <span className="lb-row-name-wrap">
                      <span className="lb-row-name">{row.username}</span>
                      {showWeeklyMentions && row.xp > WEEKLY_SPECIAL_MENTION_XP ? (
                        <span className="lb-special-mention lb-special-mention--mini">Special Mention</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="lb-row-stat"><Sparkles size={13} /> {row.xp.toLocaleString()} XP</div>
                  <div className="lb-row-stat"><Flame size={13} /> {row.streak}d</div>
                  <div className="lb-row-stat"><Zap size={13} /> Lv {row.level}</div>
                </article>
              ))}

              {youOutsideTop && data.currentUser ? (
                <div className="lb-you-wrap">
                  <p className="lb-you-line">You are #{data.currentUser.rank} in {data.scopeLabel}</p>
                  <article className="lb-row lb-row--you">
                    <div className="lb-row-rank">#{data.currentUser.rank}</div>
                    <div className="lb-row-user">
                      <span className="lb-row-avatar">{avatarFromName(data.currentUser.username)}</span>
                      <span className="lb-row-name-wrap">
                        <span className="lb-row-name">{data.currentUser.username}</span>
                        {showWeeklyMentions && data.currentUser.xp > WEEKLY_SPECIAL_MENTION_XP ? (
                          <span className="lb-special-mention lb-special-mention--mini">Special Mention</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="lb-row-stat"><Sparkles size={13} /> {data.currentUser.xp.toLocaleString()} XP</div>
                    <div className="lb-row-stat"><Flame size={13} /> {data.currentUser.streak}d</div>
                    <div className="lb-row-stat"><Zap size={13} /> Lv {data.currentUser.level}</div>
                  </article>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .lb-hero {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid color-mix(in srgb, var(--t-acc) 36%, var(--t-brd));
          background: linear-gradient(145deg, color-mix(in srgb, var(--t-card) 76%, var(--t-acc) 24%) 0%, color-mix(in srgb, var(--t-card2) 84%, var(--t-acc) 16%) 100%);
          padding: 1rem;
        }
        .lb-hero-glow { position: absolute; border-radius: 999px; pointer-events: none; filter: blur(24px); opacity: 0.42; }
        .lb-hero-glow--a { width: 200px; height: 200px; right: -30px; top: -80px; background: color-mix(in srgb, var(--t-acc) 58%, transparent); }
        .lb-hero-glow--b { width: 170px; height: 170px; left: -40px; bottom: -80px; background: color-mix(in srgb, var(--t-mod-rewards) 54%, transparent); }
        .lb-hero-head { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .lb-kicker { margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.16em; color: var(--t-acc); text-transform: uppercase; }
        .lb-title { margin: 0.35rem 0 0; color: var(--t-tx); font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 950; letter-spacing: -0.03em; }
        .lb-sub { margin: 0.4rem 0 0; color: var(--t-tx2); font-size: 13px; max-width: 500px; }
        .lb-week-xp { min-width: 140px; border-radius: 14px; border: 1px solid var(--t-brd); background: color-mix(in srgb, var(--t-card2) 88%, var(--t-acc) 12%); padding: 0.6rem 0.75rem; display: grid; gap: 3px; align-content: center; }
        .lb-week-xp span { color: var(--t-tx3); font-size: 11px; font-weight: 700; }
        .lb-week-xp strong { color: var(--t-tx); font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em; }
        .lb-tabs { position: relative; z-index: 1; margin-top: 0.8rem; display: flex; gap: 0.45rem; flex-wrap: wrap; }
        .lb-tab { border: 1px solid var(--t-brd); border-radius: 999px; background: color-mix(in srgb, var(--t-card2) 92%, white 8%); color: var(--t-tx2); padding: 0.45rem 0.8rem; font-size: 12px; font-weight: 850; cursor: pointer; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
        .lb-tab:hover { transform: translateY(-1px); }
        .lb-tab[data-active="true"] { color: white; border-color: color-mix(in srgb, var(--t-acc) 60%, transparent); background: linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 78%, black 22%) 0%, color-mix(in srgb, var(--t-mod-rewards) 70%, black 30%) 100%); box-shadow: 0 10px 20px color-mix(in srgb, var(--t-acc) 32%, transparent); }

        .lb-top3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.66rem; }
        .lb-podium { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid var(--lb-rank-border); background: var(--lb-rank-bg); box-shadow: 0 12px 28px var(--lb-rank-glow); padding: 0.8rem; display: grid; justify-items: center; text-align: center; gap: 0.38rem; }
        .lb-podium-rank { display: inline-flex; align-items: center; gap: 6px; padding: 0.2rem 0.56rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.34); background: rgba(10, 12, 18, 0.35); color: #fff; font-size: 11px; font-weight: 900; }
        .lb-podium-avatar { width: 56px; height: 56px; border-radius: 15px; display: grid; place-items: center; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.34); font-size: 1.2rem; color: #fff; font-weight: 900; }
        .lb-podium h3 { margin: 0.2rem 0 0; color: #fff; font-size: 1rem; font-weight: 900; letter-spacing: -0.01em; }
        .lb-podium p { margin: 0; color: rgba(255,255,255,0.9); font-size: 0.85rem; font-weight: 800; }
        .lb-special-mention {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.36);
          background: rgba(17, 24, 39, 0.28);
          color: #fff8db;
          font-size: 0.66rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.12rem 0.42rem;
        }
        .lb-special-mention--mini {
          border-color: color-mix(in srgb, var(--t-warning) 42%, transparent);
          background: color-mix(in srgb, var(--t-warning) 18%, var(--t-card2));
          color: color-mix(in srgb, var(--t-warning) 76%, #3a1f00);
          font-size: 0.58rem;
          padding: 0.1rem 0.34rem;
        }
        .lb-podium-meta { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .lb-podium-meta span { display: inline-flex; gap: 5px; align-items: center; color: rgba(255,255,255,0.92); font-size: 0.75rem; font-weight: 800; }
        .lb-podium--1 { transform: translateY(-2px); }
        .lb-legendary-shimmer { position: absolute; inset: -1px; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0.06) 64%, transparent 100%); animation: lb-shimmer 3.4s linear infinite; }

        .lb-shell { border-radius: 20px; border: 1px solid var(--t-brd); background: linear-gradient(160deg, color-mix(in srgb, var(--t-card) 94%, white 6%) 0%, var(--t-card) 100%); padding: 0.75rem; display: grid; gap: 0.48rem; }
        .lb-list-head { display: flex; justify-content: space-between; gap: 0.65rem; align-items: center; padding: 0.25rem 0.2rem 0.4rem; }
        .lb-list-head h2 { margin: 0; font-size: 0.98rem; color: var(--t-tx); font-weight: 900; letter-spacing: -0.01em; }
        .lb-list-head span { color: var(--t-tx3); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
        .lb-row { border-radius: 13px; border: 1px solid color-mix(in srgb, var(--t-brd) 70%, var(--t-acc) 30%); background: linear-gradient(145deg, color-mix(in srgb, var(--t-card2) 94%, var(--t-acc) 6%) 0%, color-mix(in srgb, var(--t-card2) 88%, var(--t-acc) 12%) 100%); padding: 0.6rem; display: grid; grid-template-columns: 58px minmax(128px, 1.4fr) repeat(3, minmax(70px, 0.8fr)); gap: 0.46rem; align-items: center; animation: lb-in 0.44s ease both; }
        .lb-row:hover { border-color: color-mix(in srgb, var(--t-acc) 55%, var(--t-brd)); box-shadow: 0 12px 22px color-mix(in srgb, var(--t-acc) 16%, transparent); transform: translateY(-1px); transition: .2s ease; }
        .lb-row-rank { color: var(--t-tx2); font-size: 0.84rem; font-weight: 900; }
        .lb-row-user { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .lb-row-name-wrap { min-width: 0; display: flex; align-items: center; gap: 6px; }
        .lb-row-avatar { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 30%, transparent) 0%, color-mix(in srgb, var(--t-mod-rewards) 22%, transparent) 100%); border: 1px solid color-mix(in srgb, var(--t-acc) 30%, var(--t-brd)); color: var(--t-tx); display: grid; place-items: center; font-size: 0.82rem; font-weight: 900; flex-shrink: 0; }
        .lb-row-name { color: var(--t-tx); font-size: 0.86rem; font-weight: 820; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lb-row-stat { color: var(--t-tx2); font-size: 0.77rem; font-weight: 760; display: inline-flex; align-items: center; gap: 5px; justify-self: start; }
        .lb-row--you { border-color: color-mix(in srgb, var(--t-acc) 64%, transparent); background: linear-gradient(145deg, color-mix(in srgb, var(--t-acc) 18%, var(--t-card2)) 0%, color-mix(in srgb, var(--t-mod-rewards) 14%, var(--t-card2)) 100%); }
        .lb-you-wrap { margin-top: 0.22rem; padding-top: 0.52rem; border-top: 1px dashed color-mix(in srgb, var(--t-brd) 70%, var(--t-acc) 30%); display: grid; gap: 0.4rem; }
        .lb-you-line { margin: 0; color: var(--t-acc); font-size: 0.78rem; font-weight: 850; }

        .lb-empty { border-radius: 16px; border: 1px dashed var(--t-brd); background: var(--t-card); padding: 1.4rem 1rem; color: var(--t-tx3); text-align: center; font-size: 0.88rem; }
        .lb-skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.55rem; }
        .lb-skeleton { border-radius: 14px; border: 1px solid var(--t-brd); background: linear-gradient(110deg, color-mix(in srgb, var(--t-card2) 92%, white 8%) 12%, color-mix(in srgb, var(--t-card2) 82%, white 18%) 32%, color-mix(in srgb, var(--t-card2) 92%, white 8%) 52%); background-size: 190% 100%; animation: lb-loading 1.3s linear infinite; }
        .lb-skeleton--hero { height: 150px; }
        .lb-skeleton--row { height: 56px; }

        @keyframes lb-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lb-loading { from { background-position: 100% 0; } to { background-position: -100% 0; } }
        @keyframes lb-shimmer { from { transform: translateX(-120%); } to { transform: translateX(120%); } }

        @media (max-width: 860px) {
          .lb-row { grid-template-columns: 50px minmax(120px, 1fr) repeat(2, minmax(64px, 0.8fr)); }
          .lb-row-stat:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  );
}
