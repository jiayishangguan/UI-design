// The RedemptionList component is responsible for displaying a list of redemption records for rewards that have been redeemed by the user. It receives an array of RedemptionRecord objects as a prop and renders a card containing the redemption information. If there are no redemption records, it displays an empty state message indicating that there are no redemptions yet. Each redemption record is displayed in a grid format, showing the reward name, redemption code, cost in RT tokens, redemption date and time, and claim status (claimed or unclaimed) using a badge. The component uses utility functions to format the date and time as well as the display of the token cost.
import type { RedemptionRecord } from "@/types/database";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime, formatDisplayToken } from "@/lib/format";
// The RedemptionList component is responsible for displaying a list of redemption records for rewards that have been redeemed by the user. It receives an array of RedemptionRecord objects as a prop and renders a card containing the redemption information. If there are no redemption records, it displays an empty state message indicating that there are no redemptions yet. Each redemption record is displayed in a grid format, showing the reward name, redemption code, cost in RT tokens, redemption date and time, and claim status (claimed or unclaimed) using a badge. The component uses utility functions to format the date and time as well as the display of the token cost.
export function RedemptionList({ records }: { records: RedemptionRecord[] }) {
  if (!records.length) {
    return (
      <EmptyState
        title="No redemptions yet"
        description="After a reward is redeemed and stored in Supabase, the pickup code and claim status will show here."
      />
    );
  }
// If there are redemption records to display, the component renders a card containing a grid of redemption information. Each record shows the reward name, redemption code, cost in RT tokens, redemption date and time, and claim status (claimed or unclaimed) using a badge. The date and time are formatted using the formatDateTime utility function, while the token cost is formatted using the formatDisplayToken function for better readability.
  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">My Redemptions</h1>
      <div className="mt-8 space-y-4">
        {records.map((record) => (
          <div
            key={record.id}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <p className="text-white">{record.reward_name}</p>
              <p className="mt-1 text-sm text-white/50">
                Code: {record.redemption_code} · Cost: {formatDisplayToken(record.cost)} RT
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
