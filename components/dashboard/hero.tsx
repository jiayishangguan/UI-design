// The Hero component is a section of the dashboard that serves as an introduction to the CampusSwap platform. It includes a headline, a description, and a call-to-action for users to submit activities and open the swap. The component also features a member snapshot card that provides an overview of the user's profile and participation in the community. The design incorporates various visual elements such as glass orbs, gradients, and shadows to create an engaging and dynamic user interface. The Hero component is intended to capture the attention of users and encourage them to engage with the platform's features and benefits.
import Link from "next/link";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
// The Hero component is a section of the dashboard that serves as an introduction to the CampusSwap platform. It includes a headline, a description, and a call-to-action for users to submit activities and open the swap. The component also features a member snapshot card that provides an overview of the user's profile and participation in the community. The design incorporates various visual elements such as glass orbs, gradients, and shadows to create an engaging and dynamic user interface. The Hero component is intended to capture the attention of users and encourage them to engage with the platform's features and benefits.
export function Hero({ levelLabel, levelDescription }: { levelLabel: string; levelDescription: string }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div className="relative py-12 animate-fade-up">
        <div className="glass-orb animate-drift -left-10 top-10 h-32 w-32" />
        <div className="glass-orb animate-pulse-soft left-[42%] top-40 h-20 w-20" />
        <p className="text-sm uppercase tracking-[0.22em] text-[#a8d2b1]/70">Campus sustainability protocol</p>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight text-white md:text-7xl">
          GREENER HABITS, SHARED BY THE WHOLE CAMPUS
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
              Share real campus actions and let trusted review turn your effort into visible progress.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Swap</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Move between GT and RT when you want to unlock more ways to use your earned value.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Redeem</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Turn digital recognition back into campus-life rewards, benefits, and shared momentum.
            </p>
          </div>
        </div>
      </div>
      <div className="animate-fade-up [animation-delay:120ms]">
        <Card className="relative overflow-hidden">
          <div className="animate-pulse-soft absolute -right-14 top-8 h-40 w-40 rounded-full bg-[#6e9f79]/12 blur-3xl" />
          <div className="glass-orb animate-drift bottom-10 left-8 h-24 w-24" />
          <div className="animate-float relative z-10">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Account level</p>
            <p className="mt-4 font-serif text-4xl text-white">{levelLabel}</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              {levelDescription}
            </p>
            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">Level rules</p>
                <p className="mt-2 text-sm text-white/70">Bronze starts at 50 GT, Silver at 200 GT, and Gold at 500 lifetime GT minted.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">Mint result</p>
                <p className="mt-2 text-sm text-white/70">Approved activities mint immediately unless the 300 GT daily cap has already been used.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
