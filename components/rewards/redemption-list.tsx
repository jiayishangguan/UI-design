// The RedemptionList component displays reward redemption records mirrored from on-chain transactions.
import type { RedemptionRecord } from "@/types/database";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatAddress, formatDateTime, formatDisplayToken } from "@/lib/format";

export function RedemptionList({ records }: { records: RedemptionRecord[] }) {
  if (!records.length) {
    return (
      <EmptyState
        title="No redemptions yet"
        description="No vouchers in your pocket yet. Earn more RT through green actions or swap a little GT, then come back to claim a reward you like."
      />
    );
  }

  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">My Redemptions</h1>
      <div className="mt-8 space-y-4">
        {records.map((record) => (
          <div
            key={record.id}
            className="grid items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <p className="text-white">{record.reward_name}</p>
              <p className="mt-1 text-sm text-white/50">
                Tx: {formatAddress(record.tx_hash, 6)} · Cost: {formatDisplayToken(record.cost)} RT
              </p>
            </div>
            <p className="text-sm text-white/55">{formatDateTime(record.redeemed_at)}</p>
            <Badge tone={record.claimed ? "success" : "warning"}>{record.claimed ? "Claimed" : "Unclaimed"}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
