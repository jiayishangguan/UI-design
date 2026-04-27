"use client";
// The MyRedemptionsPage component is responsible for displaying the user's redemption records. 
// It retrieves the connected wallet and fetches the redemption records associated with the wallet's address from the database. 
// The retrieved records are then passed to the RedemptionList component for display.
import { useEffect, useState } from "react";

import type { RedemptionRecord } from "@/types/database";

import { EmptyState } from "@/components/common/empty-state";
import { RedemptionList } from "@/components/rewards/redemption-list";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { getRedemptions } from "@/lib/supabase/queries";
// The component uses the useEffect hook to trigger the data fetching process whenever the wallet address changes.
export default function MyRedemptionsPage() {
  const wallet = useAppWallet();
  const [records, setRecords] = useState<RedemptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet.address) {
      setRecords([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    getRedemptions(wallet.address)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
          setError("Could not load your redemptions. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet.address]);

  if (!wallet.address) {
    return (
      <EmptyState
        title="Connect wallet"
        description="Connect your wallet to view redemption codes and claim status."
      />
    );
  }

  if (loading) {
    return <EmptyState title="Loading redemptions" description="Fetching your latest redemption records." />;
  }

  if (error) {
    return <EmptyState title="Redemptions unavailable" description={error} />;
  }

  return <RedemptionList records={records} />;
}
