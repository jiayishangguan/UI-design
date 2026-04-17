"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";

import { contractAddresses } from "@/lib/contracts/addresses";
import { lowerCaseAddress } from "@/lib/format";

export function useAppWallet() {
  const account = useAccount();
  const gtBalance = useBalance({
    address: account.address,
    token: contractAddresses.GreenToken as `0x${string}`,
    query: { enabled: Boolean(account.address) }
  });
  const rtBalance = useBalance({
    address: account.address,
    token: contractAddresses.RewardToken as `0x${string}`,
    query: { enabled: Boolean(account.address) }
  });

  return useMemo(
    () => ({
      ...account,
      lowerAddress: lowerCaseAddress(account.address),
      gtBalance,
      rtBalance
    }),
    [account, gtBalance, rtBalance]
  );
}
