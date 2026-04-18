"use client";

import { useMemo, useState } from "react";

import type { GovernanceProposal } from "@/types/contracts";

import { ACTION_TYPE_OPTIONS } from "@/lib/constants";
import { contractAddresses } from "@/lib/contracts/addresses";
import { formatAddress, formatDateTime } from "@/lib/format";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Select } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";

export function GovernancePanel({
  proposals,
  threshold,
  isCommitteeMember,
  onPropose,
  onApprove,
  onCancel
}: {
  proposals: GovernanceProposal[];
  threshold?: bigint;
  isCommitteeMember?: boolean;
  onPropose: (input: { actionType: number; targetContract: `0x${string}`; params: Record<string, unknown> }) => Promise<unknown>;
  onApprove: (id: number) => Promise<unknown>;
  onCancel: (id: number) => Promise<unknown>;
}) {
  const [actionType, setActionType] = useState("8");
  const [json, setJson] = useState('{"name":"Coffee Voucher","baseCost":"20"}');
  const target = useMemo(() => {
    const action = Number(actionType);
    if ([2, 3].includes(action)) return contractAddresses.AMMPool as `0x${string}`;
    if ([8, 9].includes(action)) return contractAddresses.RewardRedemption as `0x${string}`;
    if ([5].includes(action)) return contractAddresses.GreenToken as `0x${string}`;
    if ([6, 7].includes(action)) return contractAddresses.RewardToken as `0x${string}`;
    return "0x0000000000000000000000000000000000000000";
  }, [actionType]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">Governance</h1>
        <p className="mt-3 text-white/55">
          Proposal encoding follows CommitteeManager ActionType indices from Solidity, not ad-hoc UI literals.
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Committee threshold: {threshold?.toString() ?? "—"} approvals
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Access: {isCommitteeMember ? "Committee member" : "Viewer"}
          </div>
          <Select value={actionType} onChange={(event) => setActionType(event.target.value)}>
            {ACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input readOnly value={target} />
          <Textarea value={json} onChange={(event) => setJson(event.target.value)} />
          <Button
            disabled={!isCommitteeMember}
            onClick={() => onPropose({ actionType: Number(actionType), targetContract: target, params: JSON.parse(json) })}
          >
            Create Proposal
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-3xl text-white">Open Proposals</h2>
        <div className="mt-6 space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-white">Proposal #{proposal.id}</p>
                <Badge>{ACTION_TYPE_OPTIONS.find((item) => item.value === proposal.actionType)?.label ?? proposal.actionType}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm text-white/60">
                <p>Target: {formatAddress(proposal.targetContract)}</p>
                <p>Proposer: {formatAddress(proposal.proposer)}</p>
                <p>Approvals: {proposal.approvalCount.toString()}</p>
                <p>Created: {formatDateTime(Number(proposal.createdAt) * 1000)}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" disabled={!isCommitteeMember} onClick={() => onApprove(proposal.id)}>
                  Approve
                </Button>
                <Button variant="ghost" disabled={!isCommitteeMember} onClick={() => onCancel(proposal.id)}>
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
