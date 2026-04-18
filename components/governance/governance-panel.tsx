"use client";

import { useEffect, useMemo, useState } from "react";

import type { GovernanceProposal } from "@/types/contracts";

import { ACTION_TYPE_OPTIONS, GOVERNANCE_ACTION_DETAILS } from "@/lib/constants";
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
  members,
  threshold,
  isCommitteeMember,
  actionError,
  onPropose,
  onApprove,
  onCancel
}: {
  proposals: GovernanceProposal[];
  members: string[];
  threshold?: bigint;
  isCommitteeMember?: boolean;
  actionError?: string | null;
  onPropose: (input: { actionType: number; targetContract: `0x${string}`; params: Record<string, unknown> }) => Promise<unknown>;
  onApprove: (id: number) => Promise<unknown>;
  onCancel: (id: number) => Promise<unknown>;
}) {
  const [actionType, setActionType] = useState("8");
  const [json, setJson] = useState("");
  const actionTypeNumber = Number(actionType);
  const actionConfig = GOVERNANCE_ACTION_DETAILS[actionTypeNumber as keyof typeof GOVERNANCE_ACTION_DETAILS];
  const target = useMemo(() => {
    if ([2, 3].includes(actionTypeNumber)) return contractAddresses.AMMPool as `0x${string}`;
    if ([8, 9].includes(actionTypeNumber)) return contractAddresses.RewardRedemption as `0x${string}`;
    if ([5, 11].includes(actionTypeNumber)) return contractAddresses.GreenToken as `0x${string}`;
    if ([6, 7].includes(actionTypeNumber)) return contractAddresses.RewardToken as `0x${string}`;
    return "0x0000000000000000000000000000000000000000";
  }, [actionTypeNumber]);

  useEffect(() => {
    setJson(JSON.stringify(actionConfig.template, null, 2));
  }, [actionConfig]);

  const exampleJson = useMemo(() => JSON.stringify(actionConfig.example, null, 2), [actionConfig]);
  const isReservedAction = actionTypeNumber === 4;
  const needsJsonInput = actionTypeNumber !== 12;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">Governance</h1>
        <p className="mt-3 text-white/55">
          Proposal encoding follows CommitteeManager action indices from Solidity and simulates every action before the
          wallet is asked to sign.
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Committee threshold: {threshold?.toString() ?? "—"} approvals
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Access: {isCommitteeMember ? "Committee member" : "Viewer"}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Committee members returned by the contract: {members.length}
          </div>
          <Select value={actionType} onChange={(event) => setActionType(event.target.value)}>
            {ACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} disabled={Boolean("disabled" in option && option.disabled)}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-100/55">Selected action</p>
            <h3 className="mt-3 font-serif text-2xl text-white">{actionConfig.title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/65">{actionConfig.description}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target contract</p>
                <p className="mt-2 text-sm text-white/70">{actionConfig.targetLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Editing rule</p>
                <p className="mt-2 text-sm text-white/70">
                  Start from the fixed template below, then edit only the values you want to change.
                </p>
              </div>
            </div>
          </div>
          <Input readOnly value={target} />
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{actionConfig.formatLabel}</p>
              <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm text-white/78">{exampleJson}</pre>
            </div>
            <Textarea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              rows={8}
              disabled={!needsJsonInput}
            />
            <p className="text-sm text-white/45">
              {needsJsonInput
                ? "Use the fixed JSON structure above. Keep the keys unchanged and edit only the values."
                : "No JSON input is required for this action. The proposal will be sent with empty calldata."}
            </p>
          </div>
          {actionError ? <p className="text-sm text-red-200">{actionError}</p> : null}
          <Button
            disabled={!isCommitteeMember || isReservedAction}
            onClick={() => {
              try {
                const parsed = actionTypeNumber === 12 ? {} : JSON.parse(json);
                onPropose({ actionType: actionTypeNumber, targetContract: target, params: parsed });
              } catch {
                // Handled in hook state and wallet flow.
              }
            }}
          >
            {isReservedAction ? "Reserved Action" : "Create Proposal"}
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
                <p>Current status: {proposal.effectiveStatus === 0 ? "Pending" : proposal.effectiveStatus === 1 ? "Executed" : proposal.effectiveStatus === 2 ? "Cancelled" : "Expired"}</p>
                <p>Created: {formatDateTime(Number(proposal.createdAt) * 1000)}</p>
              </div>
              {proposal.hasApproved ? <p className="mt-3 text-sm text-emerald-200/80">This wallet has already approved this proposal.</p> : null}
              <div className="mt-4 flex gap-3">
                <Button
                  variant="secondary"
                  disabled={!isCommitteeMember || proposal.effectiveStatus !== 0 || proposal.hasApproved}
                  onClick={() => {
                    void onApprove(proposal.id);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  disabled={!isCommitteeMember || proposal.effectiveStatus !== 0}
                  onClick={() => {
                    void onCancel(proposal.id);
                  }}
                >
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
