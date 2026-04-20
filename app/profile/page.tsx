"use client";
// The ProfilePage component is responsible for displaying and managing the user's profile information.
import { ProfileForm } from "@/components/profile/profile-form";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";
// It retrieves the connected wallet and uses the wallet's address to load the user's profile data.
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
