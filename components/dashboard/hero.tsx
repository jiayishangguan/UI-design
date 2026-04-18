import Link from "next/link";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";

export function Hero({ levelLabel }: { levelLabel: string }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div className="relative py-12 animate-fade-up">
        <div className="glass-orb animate-drift -left-10 top-10 h-32 w-32" />
        <div className="glass-orb animate-pulse-soft left-[42%] top-40 h-20 w-20" />
        <p className="text-sm uppercase tracking-[0.22em] text-[#a8d2b1]/70">Campus sustainability protocol</p>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight text-white md:text-7xl">
          Greener habits, shared by the whole campus
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/60">
          CampusSwap gives students a calm, welcoming place to record meaningful actions, earn recognition for
          sustainability efforts, and turn everyday choices into visible progress for the community.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/submit">
            <Button>Submit Activity</Button>
          </Link>
          <Link href="/swap">
            <Button variant="secondary">Open Swap</Button>
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Verify</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Let submissions move through a clear review flow, so trust is built step by step rather than assumed.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Swap</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Convert earned value with reserve-aware pricing that feels measured, not overwhelming.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Redeem</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Bring digital contribution back into campus life through practical rewards and recognition.
            </p>
          </div>
        </div>
      </div>
      <div className="animate-fade-up [animation-delay:120ms]">
        <Card className="relative overflow-hidden">
          <div className="animate-pulse-soft absolute -right-14 top-8 h-40 w-40 rounded-full bg-[#6e9f79]/12 blur-3xl" />
          <div className="glass-orb animate-drift bottom-10 left-8 h-24 w-24" />
          <div className="animate-float relative z-10">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Member snapshot</p>
            <p className="mt-4 font-serif text-4xl text-white">{levelLabel}</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              Your dashboard brings together profile readiness, token balances, and community participation in one soft,
              readable view.
            </p>
            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">System focus</p>
                <p className="mt-2 text-sm text-white/70">A low-noise interface shaped for campus participation, not speculative trading.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">Profile model</p>
                <p className="mt-2 text-sm text-white/70">Wallet-first identity with lightweight profile support for rewards, trust, and outreach.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
