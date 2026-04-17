"use client";

import { useEffect, useState } from "react";

import type { RedemptionRecord } from "@/types/database";

import { RedemptionList } from "@/components/rewards/redemption-list";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { getRedemptions } from "@/lib/supabase/queries";

export default function MyRedemptionsPage() {
  const wallet = useAppWallet();
  const [records, setRecords] = useState<RedemptionRecord[]>([]);

  useEffect(() => {
    if (!wallet.address) return;
    getRedemptions(wallet.address)
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [wallet.address]);

  return <RedemptionList records={records} />;
}
