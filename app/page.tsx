"use client";
// The HomePage component serves as the main landing page for users when they access the application. It provides an overview of the user's profile, their token balances, and recent activities. The component also includes informational sections about the platform and a dialog to prompt users to complete their profile if they haven't already.
import { useEffect, useState } from "react";

import { Card } from "@/components/common/card";
import { Hero } from "@/components/dashboard/hero";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/common/stat-card";
import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useDashboardReads } from "@/hooks/use-contract-reads";
import { useProfile } from "@/hooks/use-profile";
import { getLevelMeta } from "@/lib/constants";
import { formatToken } from "@/lib/format";
import { getTasksBySubmitter } from "@/lib/supabase/queries";
import type { TaskRecord } from "@/types/database";
// The component retrieves the connected wallet and the user's profile information using custom hooks. It also fetches the user's token balances and other relevant data to display on the dashboard. If the user does not have a profile, a dialog is shown prompting them to complete their profile, which is necessary for full access to the platform's features. The main content of the page includes a hero section, statistics about the user's tokens and profile, informational cards about the platform, and a list of recent activities submitted by the user.
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
// The component uses the useEffect hook to check the user's profile status whenever the wallet address changes. If the user does not have a profile and has not dismissed the dialog, it opens the profile gate dialog. If the user has a profile or dismisses the dialog, it ensures that the dialog is closed.
  const gt = wallet.gtBalance.data?.value ?? 0n;
  const rt = wallet.rtBalance.data?.value ?? 0n;
  const tier = Number(dashboardReads.data?.[0]?.result ?? 0);
  const totalMinted = (dashboardReads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const phase = Number(dashboardReads.data?.[2]?.result ?? 0);
  const levelMeta = getLevelMeta(tier);

  return (
    <div className="space-y-8">
      <Hero levelLabel={levelMeta.shortLabel} levelDescription={levelMeta.description} />
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
          <p className="text-sm text-white/55">Profile summary</p>
          <p className="mt-6 font-serif text-3xl text-white">{profile?.full_name ?? "Guest"}</p>
          <p className="mt-3 text-sm text-white/55">
            {levelMeta.shortLabel} · Total minted {formatToken(totalMinted)} GT · Verifier phase {phase + 1}
          </p>
          <p className="mt-6 text-sm leading-6 text-white/45">
            Levels are based on lifetime GT minted from approved activities, not your current wallet balance after swaps
            or penalties.
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="animate-fade-up [animation-delay:220ms]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">How CampusSwap works</p>
          <h2 className="mt-4 font-serif text-4xl text-white">From approved action to minted GT</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
            Submit a campus sustainability action with proof, wait for verifier review, then receive GT when the
            activity is approved. GT records your contribution history and can be used in swap and reward flows.
          </p>
        </Card>
        <Card className="animate-fade-up [animation-delay:280ms]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">What happens next</p>
          <div className="mt-4 space-y-4 text-sm text-white/65">
            <p>1. Submit an activity with a short description, location, and proof image.</p>
            <p>2. Verifiers review it after the cooldown period and vote before the deadline.</p>
            <p>3. If approved, 5 GT is minted immediately or queued when the daily 300 GT cap is full.</p>
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
