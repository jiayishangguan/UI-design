"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/common/card";
import { Hero } from "@/components/dashboard/hero";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/common/stat-card";
import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useDashboardReads } from "@/hooks/use-contract-reads";
import { useProfile } from "@/hooks/use-profile";
import { LEVEL_DESCRIPTIONS, LEVEL_LABELS } from "@/lib/constants";
import { formatToken } from "@/lib/format";
import { getTasksBySubmitter } from "@/lib/supabase/queries";
import type { TaskRecord } from "@/types/database";

export default function HomePage() {
  const wallet = useAppWallet();
  const { profile, saveProfile, hasProfile } = useProfile(wallet.address);
  const dashboardReads = useDashboardReads(wallet.address);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    if (!wallet.address) return;
    getTasksBySubmitter(wallet.address)
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [wallet.address]);

  useEffect(() => {
    if (!wallet.address) {
      setProfileDialogOpen(false);
      return;
    }
    const dismissed = window.sessionStorage.getItem(`profile-dialog-dismissed:${wallet.address.toLowerCase()}`);
    if (!hasProfile && !dismissed) {
      setProfileDialogOpen(true);
      return;
    }
    setProfileDialogOpen(false);
  }, [hasProfile, wallet.address]);

  const gt = wallet.gtBalance.data?.value ?? 0n;
  const rt = wallet.rtBalance.data?.value ?? 0n;
  const tier = Number(dashboardReads.data?.[0]?.result ?? 0);
  const totalMinted = (dashboardReads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const phase = Number(dashboardReads.data?.[2]?.result ?? 0);
  const levelLabel = `Level ${tier} · ${LEVEL_LABELS[tier] ?? LEVEL_LABELS[0]}`;
  const levelDescription = LEVEL_DESCRIPTIONS[tier] ?? LEVEL_DESCRIPTIONS[0];

  return (
    <div className="space-y-8">
      <Hero levelLabel={levelLabel} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <StatCard
          label="Green Token"
          value={formatToken(gt)}
          helper="Verified sustainability actions"
          accent="On-chain balance"
        />
        <StatCard
          label="Reward Token"
          value={formatToken(rt)}
          helper="Redeemable reward balance"
          accent="Swap-enabled utility"
        />
        <div className="rounded-[28px] border border-white/10 bg-black/35 p-6 shadow-glow backdrop-blur-xl animate-fade-up [animation-delay:160ms]">
          <p className="text-sm text-white/55">Identity snapshot</p>
          <p className="mt-6 font-serif text-3xl text-white">{profile?.full_name ?? "Guest"}</p>
          <p className="mt-3 text-sm text-white/55">
            {levelLabel} · Total minted {formatToken(totalMinted)} GT · Verifier phase {phase + 1}
          </p>
          <p className="mt-6 text-sm leading-6 text-white/45">{levelDescription}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="animate-fade-up [animation-delay:220ms]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">About CampusSwap</p>
          <h2 className="mt-4 font-serif text-4xl text-white">A more thoughtful digital space for everyday campus action</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
            CampusSwap is designed for the rhythm of campus life. It helps students record practical environmental
            actions, move through fair verification, and see their contribution grow into rewards without making the
            experience feel overly technical or transactional.
          </p>
        </Card>
        <Card className="animate-fade-up [animation-delay:280ms]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Participation model</p>
          <div className="mt-4 space-y-4 text-sm text-white/65">
            <p>1. Connect your wallet and complete a lightweight profile when a reward flow needs it.</p>
            <p>2. Share a documented activity and let the review process confirm your contribution.</p>
            <p>3. Build up GT, explore RT, and redeem benefits that feel rooted in campus life.</p>
          </div>
        </Card>
      </div>
      <RecentActivity tasks={tasks} />
      <ProfileGateDialog
        address={wallet.address}
        open={profileDialogOpen}
        onClose={() => {
          setProfileDialogOpen(false);
          if (wallet.address) {
            window.sessionStorage.setItem(`profile-dialog-dismissed:${wallet.address.toLowerCase()}`, "1");
          }
        }}
        onSave={async (input) => {
          await saveProfile(input);
          if (wallet.address) {
            window.sessionStorage.removeItem(`profile-dialog-dismissed:${wallet.address.toLowerCase()}`);
          }
          setProfileDialogOpen(false);
        }}
        allowDismiss
        secondaryActionLabel="Complete Later"
      />
    </div>
  );
}
