"use client";
// The RewardsCatalog component is responsible for displaying a catalog of rewards that users can redeem using their RT tokens. It receives an array of RewardCatalogItem objects as a prop, which contain information about each reward, such as its name, base cost, current cost, and active status. The component renders a grid of cards, each representing a reward item. If there are no active rewards in the catalog, it displays an empty state message indicating that there are no active rewards available. Each reward card includes details about the reward and buttons to approve the necessary RT tokens and redeem the reward, with the buttons being disabled if the reward is inactive.
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
  if (!items.length) {
    return (
      <EmptyState
        title="No active rewards"
        description="Reward catalog lives on-chain. Once committee adds rewards, they will appear here."
      />
    );
  }
// The component renders a grid of cards, each representing a reward item. If there are no active rewards in the catalog, it displays an empty state message indicating that there are no active rewards available. Each reward card includes details about the reward and buttons to approve the necessary RT tokens and redeem the reward, with the buttons being disabled if the reward is inactive.
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl text-white">{item.name}</h2>
              <p className="mt-2 text-sm text-white/55">Dynamic pricing sourced from RewardRedemption.getCurrentCost()</p>
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
              <span>{formatToken(item.currentCost)} RT</span>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Button variant="secondary" disabled={!item.active} onClick={() => onApprove(item.currentCost ?? 0n)}>
              Approve RT
            </Button>
            <Button disabled={!item.active} onClick={() => onRedeem(item)}>
              Redeem
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
