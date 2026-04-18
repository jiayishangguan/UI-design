"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SubmitTaskForm } from "@/components/submit/submit-task-form";
import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useSubmitTask } from "@/hooks/use-submit-task";

export default function SubmitPage() {
  const router = useRouter();
  const wallet = useAppWallet();
  const { profile, hasProfile, saveProfile } = useProfile(wallet.address);
  const { submitTask } = useSubmitTask();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    if (!wallet.address) {
      setProfileDialogOpen(false);
      return;
    }
    if (!hasProfile) {
      setProfileDialogOpen(true);
      return;
    }
    setProfileDialogOpen(false);
  }, [hasProfile, wallet.address]);

  return (
    <>
      <SubmitTaskForm
        disabled={!wallet.address || !hasProfile}
        onSubmit={async (formData) => {
          if (!wallet.address || !profile) throw new Error("Profile required before submission");
          const file = formData.get("file");
          if (!(file instanceof File)) throw new Error("Evidence file is required");

          const uploadBody = new FormData();
          uploadBody.append("file", file);
          const upload = await fetch("/api/upload-ipfs", { method: "POST", body: uploadBody });
          const payload = await upload.json();
          if (!upload.ok) throw new Error(payload.error ?? "IPFS upload failed");

          await submitTask({
            address: wallet.address,
            actionType: String(formData.get("actionType") ?? ""),
            proofCID: payload.cid,
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            location: String(formData.get("location") ?? ""),
            activity_date: String(formData.get("activity_date") ?? "")
          });

          router.push("/");
        }}
      />
      <ProfileGateDialog
        address={wallet.address}
        open={profileDialogOpen}
        onClose={() => router.push("/")}
        onSave={async (input) => {
          await saveProfile(input);
          setProfileDialogOpen(false);
        }}
        allowDismiss={false}
        secondaryActionLabel="Back to Dashboard"
      />
    </>
  );
}
