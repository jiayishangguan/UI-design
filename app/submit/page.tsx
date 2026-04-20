"use client";
// The SubmitPage component serves as the interface for users to submit new tasks or activities.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SubmitTaskForm } from "@/components/submit/submit-task-form";
import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useSubmitTask } from "@/hooks/use-submit-task";
// The component retrieves the connected wallet and checks if the user has a profile.
export default function SubmitPage() {
  const router = useRouter();
  const wallet = useAppWallet();
  const { profile, hasProfile, saveProfile } = useProfile(wallet.address);
  const { submitTask } = useSubmitTask();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
// If the user does not have a profile, a dialog is displayed prompting them to create one before they can submit a task.
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
        // The form is disabled if there is no connected wallet or if the user does not have a profile.
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
            // The submitTask function is called with the form data and the CID of the uploaded evidence file.
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
        // The ProfileGateDialog component is used to prompt the user to create a profile if they do not have one.
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
