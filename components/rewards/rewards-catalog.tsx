"use client";

// We use this component to show all active rewards.
// Users can approve RT first and then redeem a reward.

import { useState } from "react";

import type { RewardCatalogItem } from "@/types/contracts";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatToken } from "@/lib/format";

export function RewardsCatalog({
  items,
  onApprove,
  onRedeem
}: {
  items: RewardCatalogItem[];
  onApprove: (cost: bigint) => Promise<unknown>;
  onRedeem: (item: RewardCatalogItem) => Promise<unknown>;
}) {
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState<{ itemId: number; tone: "success" | "error"; text: string } | null>(null);

  if (!items.length) {
    return (
      <EmptyState
        title="No active rewards"
        description="Reward catalog lives on-chain. Once committee adds rewards, they will appear here."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((item) => {
        const currentCost = item.currentCost;
        const costLoaded = currentCost !== undefined;
        const approveBusy = busyAction === `approve-${item.id}`;
        const redeemBusy = busyAction === `redeem-${item.id}`;
        const disabled = !item.active || !costLoaded || Boolean(busyAction);

        return (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-white">{item.name}</h2>
                <p className="mt-2 text-sm text-white/55">The RT price updates with the reward pool, so the final cost may move a little over time.</p>
              </div>
              <Badge tone={item.active ? "success" : "warning"}>{item.active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-white/65">
              <div className="flex justify-between">
                <span>Base cost</span>
                <span>{formatToken(item.baseCost)} RT</span>
              </div>
              <div className="flex justify-between">
                <span>Current cost</span>
                <span>{costLoaded ? formatToken(currentCost) : "Loading"} RT</span>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={async () => {
                  if (currentCost === undefined) return;
                  setBusyAction(`approve-${item.id}`);
                  setMessage(null);
                  try {
                    // We approve enough RT before the reward can be redeemed.
                    await onApprove(currentCost);
                    setMessage({ itemId: item.id, tone: "success", text: "RT approval confirmed." });
                  } catch (error) {
                    setMessage({
                      itemId: item.id,
                      tone: "error",
                      text: error instanceof Error ? error.message : "Approval failed."
                    });
                  } finally {
                    setBusyAction("");
                  }
                }}
              >
                {approveBusy ? "Approving..." : "Approve RT"}
              </Button>
              <Button
                disabled={disabled}
                onClick={async () => {
                  setBusyAction(`redeem-${item.id}`);
                  setMessage(null);
                  try {
                    // We redeem the selected reward and show a status message.
                    await onRedeem(item);
                    setMessage({ itemId: item.id, tone: "success", text: "Reward redeemed. Opening your redemption code." });
                  } catch (error) {
                    setMessage({
                      itemId: item.id,
                      tone: "error",
                      text: error instanceof Error ? error.message : "Redemption failed."
                    });
                  } finally {
                    setBusyAction("");
                  }
                }}
              >
                {redeemBusy ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
            {message?.itemId === item.id ? (
              <p className={message.tone === "success" ? "mt-4 text-sm text-emerald-200" : "mt-4 text-sm text-red-200"}>
                {message.text}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
