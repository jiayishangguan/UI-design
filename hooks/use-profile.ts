"use client";

import { useEffect, useState, useTransition } from "react";

import type { UserProfile } from "@/types/database";

import { getProfile } from "@/lib/supabase/queries";
import { touchLastLogin, upsertProfile } from "@/lib/supabase/mutations";

export function useProfile(address?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    getProfile(address)
      .then((data) => {
        if (!mounted) return;
        setProfile(data ?? null);
        if (data) {
          touchLastLogin(address).catch(() => undefined);
        }
      })
      .catch((cause) => {
        if (mounted) setError(cause.message ?? "Profile lookup failed");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [address]);

  async function saveProfile(input: UserProfile) {
    const next = await upsertProfile(input);
    setProfile(next);
    return next;
  }

  function refresh() {
    if (!address) return;
    startTransition(() => {
      getProfile(address)
        .then((data) => setProfile(data ?? null))
        .catch((cause) => setError(cause.message ?? "Profile refresh failed"));
    });
  }

  return {
    profile,
    loading,
    error,
    saveProfile,
    refresh,
    isRefreshing: isPending,
    hasProfile: Boolean(profile?.full_name && profile?.student_id)
  };
}
