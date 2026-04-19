"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

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

function getDefaultTarget(actionTypeNumber: number) {
  if ([2, 3].includes(actionTypeNumber)) return contractAddresses.AMMPool as `0x${string}`;
  if ([7, 8].includes(actionTypeNumber)) return contractAddresses.RewardRedemption as `0x${string}`;
  if ([4, 10].includes(actionTypeNumber)) return contractAddresses.GreenToken as `0x${string}`;
  if ([5, 6].includes(actionTypeNumber)) return contractAddresses.RewardToken as `0x${string}`;
  return "0x0000000000000000000000000000000000000000";
}

export function GovernancePanel({
  proposals,
  members,
  threshold,
  isCommitteeMember,
  actionError,
  onPropose,
  onApprove,
  onExecute,
  onCancel
}: {
  proposals: GovernanceProposal[];
  members: string[];
  threshold?: bigint;
  isCommitteeMember?: boolean;
  actionError?: string | null;
  onPropose: (input: { actionType: number; targetContract: `0x${string}`; params: Record<string, unknown> }) => Promise<unknown>;
  onApprove: (id: number) => Promise<unknown>;
  onExecute: (id: number) => Promise<unknown>;
  onCancel: (id: number) => Promise<unknown>;
}) {
  const [actionType, setActionType] = useState("7");
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const actionTypeNumber = Number(actionType);
  const actionConfig = GOVERNANCE_ACTION_DETAILS[actionTypeNumber as keyof typeof GOVERNANCE_ACTION_DETAILS];

  useEffect(() => {
    setFormValues({ ...actionConfig.defaults });
  }, [actionConfig]);

  const targetContract = useMemo(() => {
    if (actionTypeNumber === 9) {
      return (formValues.targetContract || "0x0000000000000000000000000000000000000000") as `0x${string}`;
    }
    return getDefaultTarget(actionTypeNumber);
  }, [actionTypeNumber, formValues.targetContract]);

  const compactTargetLabel =
    actionTypeNumber === 9
      ? formValues.targetContract || "Enter a target contract below."
      : `${actionConfig.targetLabel} · ${formatAddress(targetContract)}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">Governance</h1>
        <p className="mt-3 text-white/55">
          Committee actions now use guided fields instead of raw JSON, so proposal creation stays readable for every
          committee member.
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
              <option key={option.value} value={option.value}>
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
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target</p>
                <p className="mt-2 text-sm text-white/70">{compactTargetLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Input mode</p>
                <p className="mt-2 text-sm text-white/70">{actionConfig.inputModeLabel}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {actionConfig.fields.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {actionConfig.fields.map((field) => {
                  const commonProps = {
                    value: formValues[field.key] ?? "",
                    onChange: (
                      event:
                        | ChangeEvent<HTMLInputElement>
                        | ChangeEvent<HTMLTextAreaElement>
                    ) => setFormValues((current) => ({ ...current, [field.key]: event.target.value })),
                    placeholder: field.placeholder
                  };

                  return (
                    <div key={field.key} className={field.input === "textarea" ? "md:col-span-2" : ""}>
                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/35">{field.label}</p>
                      {field.input === "textarea" ? (
                        <Textarea {...commonProps} rows={5} />
                      ) : (
                        <Input {...commonProps} type={field.input === "number" ? "number" : "text"} />
                      )}
                      {field.helper ? <p className="mt-2 text-xs text-white/40">{field.helper}</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
                This action does not require any extra parameters.
              </div>
            )}
          </div>
          {actionError ? <p className="text-sm text-red-200">{actionError}</p> : null}
          <Button
            disabled={!isCommitteeMember}
            onClick={() => {
              const params =
                actionTypeNumber === 9
                  ? { callData: formValues.callData ?? "0x" }
                  : Object.fromEntries(actionConfig.fields.map((field) => [field.key, formValues[field.key] ?? ""]));
              void onPropose({ actionType: actionTypeNumber, targetContract, params });
            }}
          >
            Create Proposal
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-3xl text-white">Open Proposals</h2>
        <div className="mt-6 space-y-4">
          {proposals.map((proposal) => {
            const actionLabel =
              GOVERNANCE_ACTION_DETAILS[proposal.actionType as keyof typeof GOVERNANCE_ACTION_DETAILS]?.title ??
              ACTION_TYPE_OPTIONS.find((item) => item.value === proposal.actionType)?.label ??
              String(proposal.actionType);

            return (
              <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white">Proposal #{proposal.id}</p>
                  <div className="flex items-center gap-2">
                    <Badge>{actionLabel}</Badge>
                    {proposal.approvalCount >= (threshold ?? 0n) && proposal.effectiveStatus === 0 ? <Badge tone="warning">Ready to execute</Badge> : null}
                    {proposal.validTarget === false ? <Badge tone="danger">Target mismatch</Badge> : null}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/82">{proposal.summary}</p>
                {proposal.details?.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {proposal.details.map((detail) => (
                      <div key={`${proposal.id}-${detail.label}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">{detail.label}</p>
                        <p className="mt-2 break-words text-sm text-white/72">{detail.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 space-y-2 text-sm text-white/60">
                  <p>Proposer: {formatAddress(proposal.proposer)}</p>
                  <p>Approvals: {proposal.approvalCount.toString()}</p>
                  <p>
                    Current status:{" "}
                    {proposal.effectiveStatus === 0
                      ? "Pending"
                      : proposal.effectiveStatus === 1
                        ? "Executed"
                        : proposal.effectiveStatus === 2
                          ? "Cancelled"
                          : "Expired"}
                  </p>
                  <p>Created: {formatDateTime(Number(proposal.createdAt) * 1000)}</p>
                </div>
                {proposal.validTarget === false && proposal.executionHint ? (
                  <p className="mt-3 text-sm leading-6 text-white/45">{proposal.executionHint}</p>
                ) : null}
                {proposal.hasApproved ? <p className="mt-3 text-sm text-emerald-200/80">This wallet has already approved this proposal.</p> : null}
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="secondary"
                    disabled={!isCommitteeMember || proposal.effectiveStatus !== 0 || proposal.hasApproved || proposal.validTarget === false}
                    onClick={() => {
                      void onApprove(proposal.id);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!isCommitteeMember || proposal.effectiveStatus !== 0 || proposal.approvalCount < (threshold ?? 0n)}
                    onClick={() => {
                      void onExecute(proposal.id);
                    }}
                  >
                    Execute
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
            );
          })}
        </div>
      </Card>
    </div>
  );
}
