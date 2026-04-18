"use client";

import { ProfileForm } from "@/components/profile/profile-form";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";

export default function ProfilePage() {
  const wallet = useAppWallet();
  const { profile, saveProfile } = useProfile(wallet.address);

  return (
    <ProfileForm
      profile={profile}
      address={wallet.address}
      onSave={async (input) => {
        await saveProfile(input);
      }}
    />
  );
}
