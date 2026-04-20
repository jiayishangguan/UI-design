"use client";
// The MyRedemptionsPage component is responsible for displaying the user's redemption records. 
// It retrieves the connected wallet and fetches the redemption records associated with the wallet's address from the database. 
// The retrieved records are then passed to the RedemptionList component for display.
import { useEffect, useState } from "react";

import type { RedemptionRecord } from "@/types/database";

import { RedemptionList } from "@/components/rewards/redemption-list";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { getRedemptions } from "@/lib/supabase/queries";
// The component uses the useEffect hook to trigger the data fetching process whenever the wallet address changes.
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
