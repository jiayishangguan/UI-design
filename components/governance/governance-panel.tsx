"use client";
// The GovernancePanel component serves as the main interface for users to interact with the governance system. It displays a list of open proposals, allows committee members to create new proposals, and provides options to approve or cancel existing proposals. The component receives various props related to governance data and actions, such as the list of proposals, committee members, approval threshold, and functions to handle proposal creation, approval, and cancellation. It also manages local state for form inputs and expanded proposal details to enhance user interaction and experience within the governance panel.
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

const PROPOSALS_PER_PAGE = 3;

// The getDefaultTarget function is a helper function that determines the default target contract address based on the selected action type. It checks the action type number against predefined sets of action types and returns the corresponding contract address for each set. If the action type does not match any of the predefined sets, it returns a default zero address. This function is used to automatically populate the target contract field when creating a new proposal, ensuring that the correct contract is targeted based on the chosen governance action.
function getDefaultTarget(actionTypeNumber: number) {
  if ([2, 3].includes(actionTypeNumber)) return contractAddresses.AMMPool as `0x${string}`;
  if ([7, 8].includes(actionTypeNumber)) return contractAddresses.RewardRedemption as `0x${string}`;
  if ([4, 10].includes(actionTypeNumber)) return contractAddresses.GreenToken as `0x${string}`;
  if ([5, 6].includes(actionTypeNumber)) return contractAddresses.RewardToken as `0x${string}`;
  return "0x0000000000000000000000000000000000000000";
}
// The GovernancePanel component is the main interface for users to interact with the governance system. It displays a list of open proposals, allows committee members to create new proposals, and provides options to approve or cancel existing proposals. The component receives various props related to governance data and actions, such as the list of proposals, committee members, approval threshold, and functions to handle proposal creation, approval, and cancellation. It also manages local state for form inputs and expanded proposal details to enhance user interaction and experience within the governance panel.
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
  const [actionType, setActionType] = useState("7");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [expandedProposalIds, setExpandedProposalIds] = useState<Record<number, boolean>>({});
  const [proposalPage, setProposalPage] = useState(1);
  const [proposalActionFilter, setProposalActionFilter] = useState("all");

  const actionTypeNumber = Number(actionType);
  const actionConfig = GOVERNANCE_ACTION_DETAILS[actionTypeNumber as keyof typeof GOVERNANCE_ACTION_DETAILS];
  const sortedProposals = useMemo(() => {
    return [...proposals]
      .filter((proposal) => proposalActionFilter === "all" || String(proposal.actionType) === proposalActionFilter)
      .sort((left, right) => right.id - left.id);
  }, [proposalActionFilter, proposals]);
  const proposalPageCount = Math.max(1, Math.ceil(sortedProposals.length / PROPOSALS_PER_PAGE));
  const visibleProposals = useMemo(
    () => sortedProposals.slice((proposalPage - 1) * PROPOSALS_PER_PAGE, proposalPage * PROPOSALS_PER_PAGE),
    [proposalPage, sortedProposals]
  );

  useEffect(() => {
    setFormValues({ ...actionConfig.defaults });
  }, [actionConfig]);

  useEffect(() => {
    setProposalPage((currentPage) => Math.min(currentPage, proposalPageCount));
  }, [proposalPageCount]);

  useEffect(() => {
    setProposalPage(1);
  }, [proposalActionFilter]);

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
      <Card className="min-w-0">
        <h1 className="font-serif text-4xl text-white">Governance</h1>
        <p className="mt-3 text-white/55">
          The Governance page makes committee decision-making simple and transparent, allowing members to create,
          review, approve, or reject proposals through a clear guided process.
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
      <Card className="min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl text-white">Open Proposals</h2>
            {sortedProposals.length ? (
              <p className="mt-2 text-sm text-white/45">Showing newest first · {sortedProposals.length} total</p>
            ) : null}
          </div>
          <Select
            className="lg:max-w-[260px]"
            value={proposalActionFilter}
            onChange={(event) => setProposalActionFilter(event.target.value)}
          >
            <option value="all">ALL_PROPOSALS</option>
            {ACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-6 space-y-4">
          {visibleProposals.map((proposal) => {
            const actionLabel =
              GOVERNANCE_ACTION_DETAILS[proposal.actionType as keyof typeof GOVERNANCE_ACTION_DETAILS]?.title ??
              ACTION_TYPE_OPTIONS.find((item) => item.value === proposal.actionType)?.label ??
              String(proposal.actionType);
            const isExpanded = Boolean(expandedProposalIds[proposal.id]);
            const statusLabel =
              proposal.effectiveStatus === 0
                ? "Pending"
                : proposal.effectiveStatus === 1
                  ? "Executed"
                  : proposal.effectiveStatus === 2
                    ? "Cancelled"
                    : "Expired";
// Each proposal is rendered in a card format, showing its ID, action type, summary, proposer, approval count, current status, and creation date. Users can click a button to toggle the display of additional details about the proposal, such as the target contract, input parameters, and any execution hints. Committee members have the option to approve or cancel proposals directly from this interface, with buttons that are conditionally enabled based on the user's committee membership status and the proposal's current state.
            return (
              <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white">Proposal #{proposal.id}</p>
                  <div className="flex items-center gap-2">
                    <Badge>{actionLabel}</Badge>
                    {proposal.validTarget === false ? <Badge tone="danger">Target mismatch</Badge> : null}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/82">{proposal.summary}</p>
                <div className="mt-4 space-y-2 text-sm text-white/60">
                  <p>Proposer: {formatAddress(proposal.proposer)}</p>
                  <p>Approvals: {proposal.approvalCount.toString()}</p>
                  <p>Current status: {statusLabel}</p>
                  <p>Created: {formatDateTime(Number(proposal.createdAt) * 1000)}</p>
                </div>
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    className="border border-white/20 hover:border-white/35"
                    onClick={() => {
                      setExpandedProposalIds((current) => ({
                        ...current,
                        [proposal.id]: !current[proposal.id]
                      }));
                    }}
                  >
                    {isExpanded ? "Hide details" : "View details"}
                  </Button>
                </div>
                {isExpanded ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Target contract</p>
                        <p className="mt-2 break-words text-sm text-white/72">{proposal.targetContract}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Status</p>
                        <p className="mt-2 text-sm text-white/72">{statusLabel}</p>
                      </div>
                    {proposal.detailText ? (
                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Detail</p>
                        <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-6 text-white/72">
                          {proposal.detailText}
                        </p>
                      </div>
                    ) : (
                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Detail</p>
                        <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-6 text-white/50">
                          No decoded detail is available for this proposal yet.
                        </p>
                      </div>
                    )}
                    {proposal.details?.length ? (
                      <>
                        {proposal.details.map((detail) => (
                          <div key={`${proposal.id}-${detail.label}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">{detail.label}</p>
                            <p className="mt-2 break-words text-sm text-white/72">{detail.value}</p>
                          </div>
                        ))}
                      </>
                    ) : null}
                    {proposal.data ? (
                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Encoded data</p>
                        <p className="mt-2 max-w-full whitespace-normal break-all text-sm leading-6 text-white/60">
                          {proposal.data}
                        </p>
                      </div>
                    ) : null}
                    {proposal.executionHint ? (
                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Execution hint</p>
                        <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-6 text-white/60">
                          {proposal.executionHint}
                        </p>
                      </div>
                    ) : null}
                    </div>
                  </div>
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
          {!visibleProposals.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
              No proposals are available yet.
            </div>
          ) : null}
        </div>
        {proposalPageCount > 1 ? (
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: proposalPageCount }, (_, index) => {
                const pageNumber = index + 1;
                const isCurrentPage = pageNumber === proposalPage;
                return (
                  <Button
                    key={pageNumber}
                    variant={isCurrentPage ? "secondary" : "ghost"}
                    className="h-10 min-w-10 border border-white/10 px-3"
                    aria-current={isCurrentPage ? "page" : undefined}
                    onClick={() => setProposalPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-3 lg:justify-end">
              <Button
                variant="ghost"
                className="border border-white/10"
                disabled={proposalPage === 1}
                onClick={() => setProposalPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                className="border border-white/10"
                disabled={proposalPage === proposalPageCount}
                onClick={() => setProposalPage((currentPage) => Math.min(proposalPageCount, currentPage + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
