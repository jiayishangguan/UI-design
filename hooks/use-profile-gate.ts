"use client";

import { useMemo, useState } from "react";

import { useProfile } from "@/hooks/use-profile";

export function useProfileGate(address?: string, required = false) {
  const profileState = useProfile(address);
  const [open, setOpen] = useState(required);

  const needsProfile = useMemo(
    () => Boolean(required && address && !profileState.loading && !profileState.hasProfile),
    [address, profileState.hasProfile, profileState.loading, required]
  );

  return {
    ...profileState,
    needsProfile,
    dialogOpen: open || needsProfile,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false)
  };
}
